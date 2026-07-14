/**
 * 아카이브 AI 조력 — 온디맨드(사용자 요청 시에만).
 *  1) aiClassifyArchiveItem — 저장 폼에서 "AI로 채우기" 버튼: 내용 → 컬렉션·태그·제목 제안
 *  2) aiSemanticSearch — 검색창 AI 토글: 자연어 질의 → 매칭 항목 id 필터
 *
 * 실패/오프라인 시 예외를 던지고, 호출부는 키워드 폴백으로 최악 UX 를 피한다.
 */
import { quickAi, QUICK_MODEL } from '@/lib/cloudDoc/ai';
import type { ArchiveItem } from '@/types/archive';

/** strict JSON 이 아니어도 첫 {..} 블록을 추출해 파싱. 실패 시 null. */
function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export interface ClassifySuggestion {
  collectionName?: string;
  title?: string;
  tags: string[];
}

/**
 * 저장할 내용을 보고 컬렉션·제목·태그를 제안.
 * collections 는 기존 컬렉션 이름 화이트리스트(재사용 우선).
 */
export async function aiClassifyArchiveItem(
  content: string,
  collectionNames: string[],
): Promise<ClassifySuggestion> {
  const system =
    '너는 개인 보관함의 정리 도우미다. 사용자가 저장하려는 내용을 보고 알맞은 컬렉션·제목·태그를 제안한다. ' +
    '반드시 아래 JSON 만 출력한다(설명·머리말 없이): ' +
    '{"collectionName": string, "title": string, "tags": string[]}. ' +
    `컬렉션은 다음 중에서 고른다(정확히 일치, 없으면 빈 문자열): ${JSON.stringify(collectionNames)}. ` +
    '태그는 2~4개, 짧은 한국어 명사. 제목은 20자 이내 한 줄.';
  const raw = await quickAi(system, `[저장 내용]\n${content.slice(0, 4000)}`, {
    model: QUICK_MODEL,
    temperature: 0.2,
    maxTokens: 400,
  });
  const parsed = extractJson<{ collectionName?: unknown; title?: unknown; tags?: unknown }>(raw);
  if (!parsed) return { tags: [] };
  const allow = new Set(collectionNames);
  const collectionName =
    typeof parsed.collectionName === 'string' && allow.has(parsed.collectionName)
      ? parsed.collectionName
      : undefined;
  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : undefined;
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 5)
    : [];
  return { collectionName, title, tags };
}

/**
 * 자연어 질의로 항목을 시맨틱하게 필터.
 * 항목마다 정수 index 부여 → AI 가 관련 index 배열 반환 → 화이트리스트 검증 후 그 항목만 반환.
 * 실패·빈 결과 시 예외 → 호출부 키워드 폴백.
 */
export async function aiSemanticSearch(query: string, items: ArchiveItem[]): Promise<ArchiveItem[]> {
  if (!items.length) return [];
  // 토큰 폭증 방지 — 최근 200개까지만 후보 (id + 요약).
  const pool = items.slice(0, 200);
  const catalog = pool
    .map((it, i) => {
      const bits = [it.title, it.note, it.domain, it.tags.join(' '), it.fileName]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      return `${i}: ${bits}`;
    })
    .join('\n');
  const system =
    '너는 개인 보관함 검색 도우미다. 사용자 질의에 관련된 항목의 번호만 고른다. ' +
    '반드시 JSON 만 출력: {"ids": number[]}. 관련 없으면 빈 배열. 설명 금지.';
  const raw = await quickAi(system, `[질의]\n${query}\n\n[항목]\n${catalog}`, {
    model: QUICK_MODEL,
    temperature: 0,
    maxTokens: 500,
  });
  const parsed = extractJson<{ ids?: unknown }>(raw);
  const ids = Array.isArray(parsed?.ids)
    ? parsed!.ids.filter((n): n is number => typeof n === 'number' && n >= 0 && n < pool.length)
    : [];
  return ids.map((i) => pool[i]).filter(Boolean);
}

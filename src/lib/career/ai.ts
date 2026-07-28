/**
 * 스펙 보드 AI 액션 — quickAi (/api/cloud-ai) 재사용.
 *
 * 분류는 strict JSON 응답을 요구하고, 파싱 실패 시 원문 그대로 '기타'에
 * 담는 폴백으로 "던지면 무조건 쌓인다"를 보장한다.
 */
import { QUALITY_MODEL, QUICK_MODEL, quickAi } from '@/lib/ai/quick';
import { FALLBACK_CATEGORY, type SpecItem } from '@/types/career';

export interface ClassifiedSpec {
  refined: string;
  category: string;
  /** 자연어에서 추출한 시작/취득 날짜 (YYYY-MM-DD). 없으면 undefined. */
  date?: string;
  /** 추출한 종료 날짜 (YYYY-MM-DD). */
  endDate?: string;
  /** "현재·재직 중" 등이면 true. */
  ongoing?: boolean;
  /** 추출한 발급처·주최·회사명. */
  org?: string;
}

/** 흔한 이력서 섹션 — AI가 새 카테고리를 남발하지 않도록 가이드로 제공. */
const COMMON_SECTIONS = ['경력', '프로젝트', '자격증', '수상', '어학', '교육', '동아리·활동', '봉사', '기타'];

const CLASSIFY_SYSTEM = `당신은 이력서 컨설턴트입니다. 사용자가 자신이 이룬 일을 자유롭게 적으면, 그 문장을 요약하지 말고 "이해해서 정보를 분리"합니다. 날짜·기간·기관은 문장에서 빼내 아래 필드로 옮기고, 문장에는 핵심 성취만 남깁니다.

1. refined: 이력서 섹션에 들어갈 핵심 성취만 개조식(명사형 종결) 한 문장으로. **날짜·기간·발급처는 문장에서 제거**합니다. 수치·성과는 살립니다. 예: "정보처리기사 2024년 3월에 취득" → "정보처리기사 취득", "결제팀에서 로딩 3.2초→0.9초 줄임" → "결제 페이지 로딩 3.2초→0.9초 개선".
2. category: 이력서 섹션명. [기존 섹션] 중 어울리는 것을 우선 재사용, 없을 때만 2~6자 새 섹션명. 흔한 섹션: ${COMMON_SECTIONS.join(', ')}.
3. date: 시작/취득 날짜를 YYYY-MM-DD 로. 자연어("2024년 3월", "작년 여름", "22년 하반기")도 해석. 일(day)이 없으면 해당 월 01일. 없으면 null.
4. endDate: 기간형이면 종료 날짜 YYYY-MM-DD, 없으면 null.
5. ongoing: "현재·재직 중·진행 중" 이면 true, 아니면 false.
6. org: 발급처·주최·회사·학교명. 없으면 null.

응답은 반드시 아래 JSON 한 개만. 설명·코드펜스 금지.
{"refined":"...","category":"...","date":"YYYY-MM-DD|null","endDate":"YYYY-MM-DD|null","ongoing":false,"org":"...|null"}`;

/** "2024-03" → "2024-03-01", "2024-03-15" → 그대로. 형식 안 맞으면 undefined. */
const normalizeExtractedDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
  return undefined;
};

/** AI 없이도 그럴듯하게 — 키워드 기반 섹션 추정 (오프라인/실패 폴백). */
const HEURISTICS: Array<[RegExp, string]> = [
  [/토익|토플|오픽|텝스|아이엘츠|jlpt|hsk|toeic|toefl|opic|ielts/i, '어학'],
  [/기사\b|기능사|산업기사|기술사|자격증?|정처기|sqld|adsp|sqlp|cpa|한국사능력/i, '자격증'],
  [/수상|대상|최우수|우수상|장려상|입상|금상|은상|동상/, '수상'],
  [/공모전|해커톤|경진대회|콘테스트/, '공모전'],
  [/인턴/, '인턴'],
  [/동아리|학회|봉사|회장|부회장|스터디|멘토링|서포터즈/, '동아리·활동'],
  [/수료|부트캠프|교육|강의|세미나|워크숍|과정/, '교육'],
  [/입사|승진|이직|팀장|리드|담당/, '경력'],
  [/프로젝트|출시|런칭|배포|개발|구축|개선|리뉴얼/, '프로젝트'],
];

export const heuristicCategory = (raw: string): string => {
  for (const [pattern, category] of HEURISTICS) {
    if (pattern.test(raw)) return category;
  }
  return FALLBACK_CATEGORY;
};

/** 한 줄 입력 → 다듬은 문장 + 섹션 분류. 실패 시 휴리스틱 분류 폴백. */
export async function aiClassifySpec(raw: string, existingCategories: string[]): Promise<ClassifiedSpec> {
  const fallback: ClassifiedSpec = { refined: raw.trim(), category: heuristicCategory(raw) };
  try {
    const text = await quickAi(
      CLASSIFY_SYSTEM,
      `[기존 섹션]\n${existingCategories.length > 0 ? existingCategories.join(', ') : '(아직 없음)'}\n\n[입력]\n${raw}`,
      { model: QUICK_MODEL, temperature: 0.2, maxTokens: 512 },
    );
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed: unknown = JSON.parse(match[0]);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const p = parsed as Record<string, unknown>;
    const refined = p.refined;
    const category = p.category;
    const org = typeof p.org === 'string' && p.org.trim() && p.org.trim() !== 'null' ? p.org.trim() : undefined;
    return {
      refined: typeof refined === 'string' && refined.trim() ? refined.trim() : fallback.refined,
      category: typeof category === 'string' && category.trim() ? category.trim() : fallback.category,
      date: normalizeExtractedDate(p.date),
      endDate: normalizeExtractedDate(p.endDate),
      ongoing: p.ongoing === true,
      org,
    };
  } catch {
    return fallback;
  }
}

/**
 * 교정 질문 — 이 스펙에서 빠진 정보(수치·규모·역할·결과)를 묻는 짧은 질문들.
 * 세부사항 다이얼로그에서 답하면 detail 로 쌓인다. 실패 시 빈 배열.
 */
export async function aiProbeQuestions(input: { refined: string; raw: string; detail?: string }): Promise<string[]> {
  try {
    const text = await quickAi(
      '당신은 이력서를 교정하는 컨설턴트입니다. 사용자의 성과 한 줄을 더 강한 이력서 문장으로 만들기 위해, 빠져 있는 정보를 묻는 짧은 질문을 2~4개 만드세요. 수치·규모·기간·본인 역할·결과 중 비어 있는 것만 묻고, 이미 주어진 정보는 다시 묻지 않습니다. 질문은 해요체로 한 문장씩. 각 줄에 질문 하나, 번호·기호 없이 질문만 출력합니다.',
      `[성과] ${input.refined}\n[원문] ${input.raw}${input.detail ? `\n[이미 적힌 세부사항]\n${input.detail}` : ''}`,
      { model: QUICK_MODEL, temperature: 0.4, maxTokens: 512 },
    );
    return text
      .split('\n')
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
  }
}

/** 신분 + 현재 보드 → 다음에 쌓으면 좋을 스펙 추천 (markdown 목록). */
export async function aiRecommendSpecs(
  personaLabel: string,
  sections: Array<{ name: string; items: SpecItem[] }>,
): Promise<string> {
  const source = sections
    .filter((s) => s.items.length > 0)
    .map((s) => `## ${s.name}\n${s.items.map((i) => `- ${i.refined} (${i.date})`).join('\n')}`)
    .join('\n\n') || '(아직 기록 없음)';
  return quickAi(
    '당신은 커리어 컨설턴트입니다. 사용자의 신분과 현재 스펙 목록을 보고, 다음에 쌓으면 좋을 스펙 4~6개를 추천합니다. 각 줄은 "- 추천 항목 — 이유 한 문장" 형식. 이미 가진 것과 겹치지 않게, 자격증명·활동명은 실제로 존재하는 구체적인 것으로. 머리말·설명 없이 목록만 출력합니다.',
    `[신분] ${personaLabel}\n\n[현재 스펙]\n${source}`,
    { model: QUALITY_MODEL, temperature: 0.6, maxTokens: 2048 },
  );
}

export type ComposePurpose = '이력서' | '자기소개서 초안' | '포트폴리오 요약' | '경력기술서' | '커버레터';

/** 보드에 쌓인 자산 → 목적별 문서 (markdown). request 로 지원 직무·강조점을 반영. */
export async function aiComposeCareerDoc(
  purpose: ComposePurpose,
  sections: Array<{ name: string; items: SpecItem[] }>,
  request?: string,
): Promise<string> {
  const period = (i: SpecItem) => `${i.date}${i.ongoing ? '~현재' : i.endDate ? `~${i.endDate}` : ''}`;
  const source = sections
    .filter((s) => s.items.length > 0)
    .map((s) =>
      `## ${s.name}\n${s.items
        .map((i) =>
          `- ${i.refined} (${period(i)})${i.org ? ` · ${i.org}` : ''}${i.link ? ` · ${i.link}` : ''}${i.detail ? `\n  세부: ${i.detail.replaceAll('\n', ' ')}` : ''}`)
        .join('\n')}`)
    .join('\n\n');
  const guide =
    purpose === '이력서'
      ? '섹션별로 정리된 이력서 본문을 markdown 으로 작성합니다. 개조식 유지, 항목마다 한 줄, 최신순. 없는 사실을 지어내지 않습니다.'
      : purpose === '자기소개서 초안'
        ? '이 자산들을 근거로 자기소개서 초안(2~4문단)을 씁니다. 각 문단은 실제 항목을 근거로 하고, 근거 없는 성격 묘사는 넣지 않습니다.'
        : purpose === '경력기술서'
          ? '주요 경력·프로젝트를 경력기술서(markdown)로 상세 기술합니다. 항목마다 STAR(상황·역할·수행·결과) 구조로 2~4줄, 수치·성과를 부각합니다. 세부(detail)가 있으면 근거로 삼되 없는 사실은 지어내지 않습니다.'
          : purpose === '커버레터'
            ? '이 자산들을 근거로 커버레터 한 장(3~4문단)을 씁니다. 지원 동기 → 핵심 강점(실제 항목 근거) → 기여 포부 흐름. 과장·거짓 없이 담백하게.'
            : '이 자산들을 프로젝트·성과 중심 포트폴리오 요약(markdown)으로 재구성합니다. 각 항목의 성과·수치를 부각합니다.';
  return quickAi(
    `당신은 커리어 문서를 작성하는 전문가입니다. 사용자의 스펙 자산 목록이 주어집니다. ${guide} [요청사항]이 있으면 지원 직무·회사·강조점에 맞춰 항목 선별과 톤을 조정합니다. 머리말·설명 없이 문서만 출력합니다.`,
    `${source}${request?.trim() ? `\n\n[요청사항]\n${request.trim()}` : ''}`,
    { model: QUALITY_MODEL, temperature: 0.4, maxTokens: 4096 },
  );
}

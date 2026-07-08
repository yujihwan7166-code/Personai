/**
 * 스펙 보드 AI 액션 — quickAi (/api/cloud-ai) 재사용.
 *
 * 분류는 strict JSON 응답을 요구하고, 파싱 실패 시 원문 그대로 '기타'에
 * 담는 폴백으로 "던지면 무조건 쌓인다"를 보장한다.
 */
import { QUALITY_MODEL, QUICK_MODEL, quickAi } from '@/lib/cloudDoc/ai';
import { FALLBACK_CATEGORY, type SpecItem } from '@/types/career';

export interface ClassifiedSpec {
  refined: string;
  category: string;
}

/** 흔한 이력서 섹션 — AI가 새 카테고리를 남발하지 않도록 가이드로 제공. */
const COMMON_SECTIONS = ['경력', '프로젝트', '자격증', '수상', '어학', '교육', '동아리·활동', '봉사', '기타'];

const CLASSIFY_SYSTEM = `당신은 이력서 컨설턴트입니다. 사용자가 자신이 이룬 일을 한 줄로 던지면:
1. refined: 이력서에 그대로 넣을 수 있는 단정한 한 문장으로 다듬습니다. 사실만 유지하고 과장·추측 금지. 수치·기간이 있으면 살립니다. 해요체가 아닌 개조식(명사형 종결)으로 씁니다. 예: "정처기 땄음" → "정보처리기사 취득".
2. category: 이 항목이 들어갈 이력서 섹션명. 반드시 [기존 섹션] 중 어울리는 것을 재사용하고, 정말 어울리는 게 없을 때만 2~6자의 새 섹션명을 만듭니다. 참고로 흔한 섹션: ${COMMON_SECTIONS.join(', ')}.

응답은 반드시 아래 JSON 한 개만 출력합니다. 설명·코드펜스 금지.
{"refined": "...", "category": "..."}`;

/** 한 줄 입력 → 다듬은 문장 + 섹션 분류. 실패 시 원문/기타 폴백. */
export async function aiClassifySpec(raw: string, existingCategories: string[]): Promise<ClassifiedSpec> {
  const fallback: ClassifiedSpec = { refined: raw.trim(), category: FALLBACK_CATEGORY };
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
    const refined = (parsed as Record<string, unknown>).refined;
    const category = (parsed as Record<string, unknown>).category;
    return {
      refined: typeof refined === 'string' && refined.trim() ? refined.trim() : fallback.refined,
      category: typeof category === 'string' && category.trim() ? category.trim() : fallback.category,
    };
  } catch {
    return fallback;
  }
}

export type ComposePurpose = '이력서' | '자기소개서 초안' | '포트폴리오 요약';

/** 보드에 쌓인 자산 → 목적별 문서 (markdown). */
export async function aiComposeCareerDoc(
  purpose: ComposePurpose,
  sections: Array<{ name: string; items: SpecItem[] }>,
): Promise<string> {
  const source = sections
    .filter((s) => s.items.length > 0)
    .map((s) => `## ${s.name}\n${s.items.map((i) => `- ${i.refined} (${i.date})`).join('\n')}`)
    .join('\n\n');
  const guide =
    purpose === '이력서'
      ? '섹션별로 정리된 이력서 본문을 markdown 으로 작성합니다. 개조식 유지, 항목마다 한 줄, 최신순. 없는 사실을 지어내지 않습니다.'
      : purpose === '자기소개서 초안'
        ? '이 자산들을 근거로 자기소개서 초안(2~4문단)을 씁니다. 각 문단은 실제 항목을 근거로 하고, 근거 없는 성격 묘사는 넣지 않습니다.'
        : '이 자산들을 프로젝트·성과 중심 포트폴리오 요약(markdown)으로 재구성합니다. 각 항목의 성과·수치를 부각합니다.';
  return quickAi(
    `당신은 커리어 문서를 작성하는 전문가입니다. 사용자의 스펙 자산 목록이 주어집니다. ${guide} 머리말·설명 없이 문서만 출력합니다.`,
    source,
    { model: QUALITY_MODEL, temperature: 0.4, maxTokens: 4096 },
  );
}

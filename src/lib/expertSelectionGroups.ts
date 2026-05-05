import {
  EXPERT_CATEGORY_LABELS,
  type Expert,
  type ExpertCategory,
} from '@/types/expert';
import {
  REASONING_MODEL_IDS,
  RECOMMENDED_MODEL_IDS,
} from '@/lib/modelTaxonomy';

export interface ExpertSelectionGroup {
  cat: string;
  label: string;
  items: Expert[];
}

const AI_MODEL_ORDER = [
  'glm',
  'qwen-plus',
  'gemma',
  'glm-5v',
  'grok-4.2',
  'mimo',
  'minimax',
  'mistral-small',
  'nemotron',
  'qwen-9b',
  'seed',
  'mercury',
  'gemini-3.1',
  'seed-mini',
  'qwen',
  'gemini-pro',
  'claude-sonnet-4.6',
  'qwen-thinking',
  'claude',
  'step',
  'solar',
  'kimi',
  'palmyra',
  'gemini-3-flash',
  'mistral-creative',
  'mimo-flash',
  'nova-2-lite',
  'mistral-large',
  'grok',
  'kimi-thinking',
  'nova-premier',
  'granite',
  'claude-haiku',
  'claude-sonnet',
  'longcat',
  'mistral-medium',
  'jamba',
  'codestral',
  'gemini-flash-lite',
  'devstral',
  'dolphin',
  'hunyuan',
  'ernie',
  'gemini',
  'gpt',
  'gpt-mini',
  'gpt-nano',
  'llama-maverick',
  'llama-scout',
  'deepseek',
  'command-a',
  'perplexity-pro',
  'perplexity',
  'deepseek-r1',
  'phi',
  'command-r-plus',
] as const;

/** 빠른 응답 모델 (브랜드별 가장 빠른 1개) */
export const FAST_MODEL_IDS = [
  'gpt-nano',
  'gemini-flash-lite',
  'claude-haiku',
  'grok',
  'perplexity',
  'deepseek',
  'qwen',
  'mistral-small',
] as const;

/** 숨김 처리할 리서치 에이전트 (auto-gpt = 심층 리서치는 예외, AI 모델로 노출) */
export const RESEARCH_AGENT_IDS = [
  'auto-claude',
  'auto-gemini',
  'auto-grok',
  'auto-perplexity',
  'auto-deepseek',
  'auto-qwen',
] as const;

function orderAiModels(experts: Expert[], excludeIds: string[]) {
  const aiModels = experts.filter((expert) => expert.category === 'ai' && !excludeIds.includes(expert.id));
  const orderedModels = AI_MODEL_ORDER
    .map((id) => aiModels.find((expert) => expert.id === id))
    .filter(Boolean) as Expert[];
  const unorderedModels = aiModels.filter((expert) => !AI_MODEL_ORDER.includes(expert.id));

  return [...orderedModels, ...unorderedModels];
}

export function buildExpertSelectionGroups({
  experts,
  favoriteIds,
  visibleCategories,
  aiAgentIds: _aiAgentIds,
}: {
  experts: Expert[];
  favoriteIds: string[];
  visibleCategories: readonly ExpertCategory[];
  aiAgentIds: string[];
}): ExpertSelectionGroup[] {
  const favoriteItems = favoriteIds
    .map((id) => experts.find((expert) => expert.id === id))
    .filter(Boolean) as Expert[];

  // ── AI 모델 큐레이션 그룹 ──
  // 전체(출시순 정렬, ancano-pro 제외) — "전체 모델" 탭
  const allAiItems = orderAiModels(experts, ['ancano-pro']);
  const aiById = new Map(allAiItems.map((e) => [e.id, e]));

  // 추천 — RECOMMENDED_MODEL_IDS 순서대로, 누락 ID 는 무시.
  // 전체 experts 에서 찾음 (ancano-pro 등 allAiItems 에서 제외된 special agent 도 포함 가능).
  const recommendedItems = RECOMMENDED_MODEL_IDS
    .map((id) => experts.find((e) => e.id === id))
    .filter(Boolean) as Expert[];

  // 빠른 — FAST_MODEL_IDS 중 실제 존재하는 모델만
  const fastItems = FAST_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  // 추론 — REASONING_MODEL_IDS 명시 순서대로, 누락 ID 는 무시
  const reasoningItems = REASONING_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  // ── 직업/전문가 카테고리 (기존 유지) ──
  const otherCategoryGroups = visibleCategories
    .filter((category) => category !== 'ai')
    .map((category) => ({
      cat: category as string,
      label: EXPERT_CATEGORY_LABELS[category],
      items: experts.filter((expert) => expert.category === category),
    }));

  return [
    { cat: 'favorites', label: '즐겨찾기', items: favoriteItems },
    { cat: 'ai_recommended', label: '추천', items: recommendedItems },
    { cat: 'ai_fast', label: '빠른 모델', items: fastItems },
    { cat: 'ai_reasoning', label: '추론 모델', items: reasoningItems },
    { cat: 'ai', label: '전체 모델', items: allAiItems },
    ...otherCategoryGroups,
  ].filter((group) => group.items.length > 0 || group.cat === 'favorites');
}

/** 'ai_*' 큐레이션 카테고리(추천/빠른/추론) 인지 + 'ai'(전체 모델) 인지 — 패널의 AI 그룹 분기에 사용. */
export const AI_GROUP_CATS = ['ai', 'ai_recommended', 'ai_fast', 'ai_reasoning'] as const;
export const isAiGroupCat = (cat: string): boolean =>
  (AI_GROUP_CATS as readonly string[]).includes(cat);

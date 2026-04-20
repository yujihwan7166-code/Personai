import {
  EXPERT_CATEGORY_LABELS,
  type Expert,
  type ExpertCategory,
} from '@/types/expert';

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
  'auto-gpt',
  'gpt-nano',
  'gemini-flash-lite',
  'claude-haiku',
  'grok',
  'perplexity',
  'deepseek',
  'qwen',
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
  aiAgentIds,
}: {
  experts: Expert[];
  favoriteIds: string[];
  visibleCategories: readonly ExpertCategory[];
  aiAgentIds: string[];
}): ExpertSelectionGroup[] {
  const favoriteItems = favoriteIds
    .map((id) => experts.find((expert) => expert.id === id))
    .filter(Boolean) as Expert[];

  // 모든 AI를 하나의 그룹으로 (출시순 정렬, ancano-pro 제외)
  const allAiItems = orderAiModels(experts, ['ancano-pro']);

  return [
    { cat: 'favorites', label: '즐겨찾기', items: favoriteItems },
    {
      cat: 'ai',
      label: 'AI 모델',
      items: allAiItems,
    },
    ...visibleCategories
      .filter((category) => category !== 'ai')
      .map((category) => ({
        cat: category as string,
        label: EXPERT_CATEGORY_LABELS[category],
        items: experts.filter((expert) => expert.category === category),
      })),
  ].filter((group) => group.items.length > 0 || group.cat === 'favorites');
}

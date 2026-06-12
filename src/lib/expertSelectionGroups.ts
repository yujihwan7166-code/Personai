import {
  EXPERT_CATEGORY_LABELS,
  type Expert,
  type ExpertCategory,
} from '@/types/expert';
import {
  MODEL_IS_OPENSOURCE,
  REASONING_MODEL_IDS,
  RECOMMENDED_MODEL_IDS,
} from '@/lib/modelTaxonomy';
import {
  OPENROUTER_ADDED_FAST_IDS,
  OPENROUTER_ADDED_FLAGSHIP_IDS,
} from '@/data/openrouter-added-models';

export interface ExpertSelectionGroup {
  cat: string;
  label: string;
  items: Expert[];
}

const AI_MODEL_ORDER = [
  'glm',
  'qwen-plus',
  'gemma',
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
  'mimo-flash',
  'nova-2-lite',
  'mistral-large',
  'grok',
  'kimi-thinking',
  'nova-premier',
  'granite',
  'claude-haiku',
  'claude-sonnet',
  'mistral-medium',
  'jamba',
  'codestral',
  'gemini-flash-lite',
  'devstral',
  'dolphin',
  'hunyuan',
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

/** 경량 모델: 빠른 응답/가벼운 체급 중심. */
export const FAST_MODEL_IDS = [
  'gpt-nano',
  'gemini-flash-lite',
  'claude-haiku',
  'grok',
  'perplexity',
  'deepseek',
  'qwen',
  'mistral-small',
  ...OPENROUTER_ADDED_FAST_IDS,
] as const;

/** 플래그십 모델: 브랜드별 대표 상위 라인업. */
export const FLAGSHIP_MODEL_IDS = [
  'gpt',
  'claude',
  'gemini-pro',
  'grok-4.2',
  'perplexity-pro',
  'deepseek-r1',
  'qwen-plus',
  'kimi',
  ...OPENROUTER_ADDED_FLAGSHIP_IDS,
] as const;

/** 마이너 모델: 메이저 브랜드 바깥의 덜 알려진 대안 모델. */
export const MINOR_MODEL_IDS = [
  'mimo',
  'mimo-flash',
  'minimax',
  'seed',
  'seed-mini',
  'mercury',
  'solar',
  'palmyra',
  'step',
  'hunyuan',
  'jamba',
  'command-a',
  'nova-premier',
  'nova-2-lite',
] as const;

/** 숨김 처리할 리서치 에이전트. auto-gpt는 심층 리서치 모델로 노출한다. */
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

  const allAiItems = orderAiModels(experts, ['ancano-pro']);
  const aiById = new Map(allAiItems.map((expert) => [expert.id, expert]));

  const recommendedItems = RECOMMENDED_MODEL_IDS
    .map((id) => experts.find((expert) => expert.id === id))
    .filter(Boolean) as Expert[];

  const flagshipItems = FLAGSHIP_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  const fastItems = FAST_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  const reasoningItems = REASONING_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  const minorItems = MINOR_MODEL_IDS
    .map((id) => aiById.get(id))
    .filter(Boolean) as Expert[];

  const openSourceItems = allAiItems.filter((expert) => MODEL_IS_OPENSOURCE.has(expert.id));

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
    { cat: 'ai_flagship', label: '플래그십', items: flagshipItems },
    { cat: 'ai_fast', label: '빠른 모델', items: fastItems },
    { cat: 'ai_reasoning', label: '추론 모델', items: reasoningItems },
    { cat: 'ai_minor', label: '마이너 모델', items: minorItems },
    { cat: 'ai_open', label: '로컬/오픈소스', items: openSourceItems },
    { cat: 'ai', label: '전체 모델', items: allAiItems },
    ...otherCategoryGroups,
  ].filter((group) => group.items.length > 0 || group.cat === 'favorites');
}

export const AI_GROUP_CATS = [
  'ai',
  'ai_recommended',
  'ai_flagship',
  'ai_fast',
  'ai_reasoning',
  'ai_minor',
  'ai_open',
] as const;

export const isAiGroupCat = (cat: string): boolean =>
  (AI_GROUP_CATS as readonly string[]).includes(cat);

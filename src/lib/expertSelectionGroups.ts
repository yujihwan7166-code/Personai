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
} from '@/data/openrouter-added-models';
import { isVisibleGeneralTextModel } from '@/lib/generalModelCatalog';
import { compareGeneralModelPopularity } from '@/lib/generalModelPopularity';

export interface ExpertSelectionGroup {
  cat: string;
  label: string;
  items: Expert[];
}

/** 경량 모델: 빠른 응답과 가벼운 사용성 중심. */
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
  'gemini-pro',
  'grok-4.2',
  'perplexity-pro',
  'llama-maverick',
  'command-a',
  'nova-premier',
  'jamba',
  'solar',
  'palmyra',
  'mercury',
  'step',
  'or-anthropic-claude-fable-5',
  'or-openai-gpt-5-5',
  'or-deepseek-deepseek-v4-pro',
  'or-qwen-qwen3-7-max',
  'or-moonshotai-kimi-k2-6',
  'or-z-ai-glm-5',
  'or-minimax-minimax-m3',
  'or-mistralai-mistral-medium-3-5',
  'or-nvidia-nemotron-3-ultra-550b-a55b',
  'or-xiaomi-mimo-v2-5',
  'or-tencent-hy3-preview',
  'or-inclusionai-ring-2-6-1t',
  'or-arcee-ai-trinity-large-thinking',
  'or-bytedance-seed-seed-1-6',
  'or-ibm-granite-granite-4-1-8b',
  'or-kwaipilot-kat-coder-pro-v2',
  'or-allenai-olmo-3-32b-think',
  'or-nousresearch-hermes-4-70b',
  'or-poolside-laguna-m-1-free',
  'or-morph-morph-v3-large',
] as const;

/** 마이너 모델: 메이저 브랜드 밖에서도 알려진 대안 모델. */
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

function orderAiModels(experts: Expert[], excludeIds: string[]) {
  const excluded = new Set(excludeIds);
  const aiModels = experts.filter((expert) => isVisibleGeneralTextModel(expert) && !excluded.has(expert.id));
  return [...aiModels].sort(compareGeneralModelPopularity);
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
    .map((id) => aiById.get(id))
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

  const openSourceItems = allAiItems.filter((expert) => expert.modelInfo?.openWeight || MODEL_IS_OPENSOURCE.has(expert.id));

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

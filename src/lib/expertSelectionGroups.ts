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

function orderAiModels(experts: Expert[], aiAgentIds: string[]) {
  const aiModels = experts.filter((expert) => expert.category === 'ai' && !aiAgentIds.includes(expert.id));
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

  // AI 에이전트 탭 하나에 에이전트(첫줄) + 세부 모델(펼치기) 합침
  const agentItems = aiAgentIds
    .map((id) => experts.find((expert) => expert.id === id))
    .filter(Boolean) as Expert[];
  const modelItems = orderAiModels(experts, aiAgentIds);

  return [
    { cat: 'favorites', label: '즐겨찾기', items: favoriteItems },
    {
      cat: 'ai-agent',
      label: 'AI 에이전트',
      items: agentItems,
    },
    {
      cat: 'ai-model',
      label: '일반 모델',
      items: modelItems,
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

import { applyExpertOverrides } from '@/data/expertOverrides';
import { DEFAULT_EXPERTS, type Expert } from '@/types/expert';

export const REMOVED_EXPERT_IDS = new Set(['auto-ai', 'ancano', 'explorer', 'president', 'lawmaker', 'assemblyman', 'politician']);

export function visibleDefaultExperts() {
  return DEFAULT_EXPERTS.filter((expert) => !REMOVED_EXPERT_IDS.has(expert.id));
}

export function mergePersistedExperts(parsed: Expert[]): Expert[] {
  const savedMap = new Map(parsed.map((expert) => [expert.id, expert]));
  const defaults = visibleDefaultExperts();

  const merged = defaults.map((defaultExpert) => {
    const savedExpert = savedMap.get(defaultExpert.id);
    if (!savedExpert) {
      return defaultExpert;
    }

    return {
      ...savedExpert,
      name: defaultExpert.name || savedExpert.name,
      nameKo: defaultExpert.nameKo || savedExpert.nameKo,
      openrouterModel: defaultExpert.openrouterModel || savedExpert.openrouterModel,
      category: defaultExpert.category || savedExpert.category || 'ai',
      icon: defaultExpert.icon || savedExpert.icon || '',
      avatarUrl: defaultExpert.avatarUrl || savedExpert.avatarUrl,
      quote: defaultExpert.quote || savedExpert.quote,
      description: defaultExpert.description || savedExpert.description,
      sampleQuestions: defaultExpert.sampleQuestions || savedExpert.sampleQuestions,
      abilities: defaultExpert.abilities || savedExpert.abilities,
      tags: defaultExpert.tags || savedExpert.tags,
      modelInfo: defaultExpert.modelInfo || savedExpert.modelInfo,
    };
  });

  const defaultIds = new Set(defaults.map((expert) => expert.id));
  const customExperts = parsed.filter((expert) => (
    !defaultIds.has(expert.id)
    && !REMOVED_EXPERT_IDS.has(expert.id)
    && expert.category !== 'ai'
  ));

  return applyExpertOverrides([...merged, ...customExperts]);
}

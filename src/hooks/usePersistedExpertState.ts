import { useEffect, useState } from 'react';

import { applyExpertOverrides } from '@/data/expertOverrides';
import { DEFAULT_EXPERTS, type Expert } from '@/types/expert';

const EXPERTS_STORAGE_KEY = 'ai-debate-experts-v65';
const SELECTED_EXPERTS_STORAGE_KEY = 'ai-debate-selected-v5';

function loadPersistedExperts(): Expert[] {
  try {
    const saved = localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (!saved) {
      return applyExpertOverrides(DEFAULT_EXPERTS);
    }

    const parsed = JSON.parse(saved) as Expert[];
    const savedMap = new Map(parsed.map((expert) => [expert.id, expert]));

    const merged = DEFAULT_EXPERTS.map((defaultExpert) => {
      const savedExpert = savedMap.get(defaultExpert.id);
      if (!savedExpert) {
        return defaultExpert;
      }

      return {
        ...savedExpert,
        name: defaultExpert.name || savedExpert.name,
        nameKo: defaultExpert.nameKo || savedExpert.nameKo,
        openrouterModel: defaultExpert.openrouterModel || savedExpert.openrouterModel,
        category: savedExpert.category || 'ai',
        icon: savedExpert.icon || defaultExpert.icon || '',
        avatarUrl: defaultExpert.avatarUrl || savedExpert.avatarUrl,
        quote: defaultExpert.quote || savedExpert.quote,
        description: defaultExpert.description || savedExpert.description,
        sampleQuestions: defaultExpert.sampleQuestions || savedExpert.sampleQuestions,
        abilities: defaultExpert.abilities || savedExpert.abilities,
      };
    });

    const defaultIds = new Set(DEFAULT_EXPERTS.map((expert) => expert.id));
    const customExperts = parsed.filter((expert) => !defaultIds.has(expert.id));

    return applyExpertOverrides([...merged, ...customExperts]);
  } catch {
    return applyExpertOverrides(DEFAULT_EXPERTS);
  }
}

function loadPersistedSelectedExpertIds(): string[] {
  try {
    const saved = localStorage.getItem(SELECTED_EXPERTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : ['gpt'];

    return Array.isArray(parsed) && parsed.length > 0 ? [parsed[0]] : ['gpt'];
  } catch {
    return ['gpt'];
  }
}

export function usePersistedExpertState() {
  const [experts, setExperts] = useState<Expert[]>(loadPersistedExperts);
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(loadPersistedSelectedExpertIds);

  useEffect(() => {
    localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(applyExpertOverrides(experts)));
  }, [experts]);

  useEffect(() => {
    setSelectedExpertIds((prev) => prev.filter((id) => experts.some((expert) => expert.id === id)));
  }, [experts]);

  useEffect(() => {
    localStorage.setItem(SELECTED_EXPERTS_STORAGE_KEY, JSON.stringify(selectedExpertIds));
  }, [selectedExpertIds]);

  return {
    experts,
    setExperts,
    selectedExpertIds,
    setSelectedExpertIds,
  };
}

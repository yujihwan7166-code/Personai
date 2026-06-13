import { useEffect, useState } from 'react';

import { applyExpertOverrides } from '@/data/expertOverrides';
import {
  mergePersistedExperts,
  visibleDefaultExperts,
} from '@/lib/expertPersistence';
import type { Expert } from '@/types/expert';

const EXPERTS_STORAGE_KEY = 'ai-debate-experts-v68';
const SELECTED_EXPERTS_STORAGE_KEY = 'ai-debate-selected-v6';

function loadPersistedExperts(): Expert[] {
  try {
    const saved = localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (!saved) {
      return applyExpertOverrides(visibleDefaultExperts());
    }

    const parsed = JSON.parse(saved) as Expert[];
    return mergePersistedExperts(parsed);
  } catch {
    return applyExpertOverrides(visibleDefaultExperts());
  }
}

function loadPersistedSelectedExpertIds(): string[] {
  try {
    const saved = localStorage.getItem(SELECTED_EXPERTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : ['gemini-flash-lite'];

    return Array.isArray(parsed) && parsed.length > 0 ? [parsed[0]] : ['gemini-flash-lite'];
  } catch {
    return ['gemini-flash-lite'];
  }
}

export function usePersistedExpertState() {
  const [experts, setExperts] = useState<Expert[]>(loadPersistedExperts);
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(loadPersistedSelectedExpertIds);

  useEffect(() => {
    setExperts(loadPersistedExperts());
  }, []);

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

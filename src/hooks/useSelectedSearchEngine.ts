/**
 * 선택된 검색 엔진 훅 — localStorage + custom event 자동 sync.
 */
import { useEffect, useState } from 'react';
import {
  SEARCH_ENGINE_CHANGED, getSelectedEngine, type SearchEngine,
} from '@/lib/searchEngines';

export const useSelectedSearchEngine = (): SearchEngine | null => {
  const [engine, setEngine] = useState<SearchEngine | null>(() => getSelectedEngine());

  useEffect(() => {
    const refresh = () => setEngine(getSelectedEngine());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(SEARCH_ENGINE_CHANGED, refresh);
    return () => window.removeEventListener(SEARCH_ENGINE_CHANGED, refresh);
  }, []);

  return engine;
};

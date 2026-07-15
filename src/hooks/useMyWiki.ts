/**
 * 마이위키 store 구독 훅 — MYWIKI_CHANGED 로 자동 re-render.
 * TDZ 주의: state → useCallback → useEffect 순서 엄수.
 */
import { useCallback, useEffect, useState } from 'react';
import { MYWIKI_CHANGED, type WikiDoc, type WikiTopic } from '@/types/mywiki';
import { mywikiStore } from '@/services/mywikiStore';

export interface MyWikiData {
  topics: WikiTopic[];
  docs: WikiDoc[];
}

export function useMyWiki(): MyWikiData {
  const [data, setData] = useState<MyWikiData>(() => ({ topics: [], docs: [] }));

  const refresh = useCallback(() => {
    setData({ topics: mywikiStore.listTopics(), docs: mywikiStore.listDocs() });
  }, []);

  useEffect(() => {
    mywikiStore.ensureSeeded();
    refresh();
    window.addEventListener(MYWIKI_CHANGED, refresh);
    return () => window.removeEventListener(MYWIKI_CHANGED, refresh);
  }, [refresh]);

  return data;
}

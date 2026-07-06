/**
 * 일기 데이터 훅 — JOURNAL_CHANGED 이벤트 listen 으로 자동 re-render.
 */
import { useEffect, useState, useCallback } from 'react';
import { journalStore } from '@/services/journalStore';
import { JournalEntry, JOURNAL_CHANGED } from '@/types/journal';

/** 모든 항목 (페이지 메인 리스트용). */
export const useJournal = (): JournalEntry[] => {
  const [items, setItems] = useState<JournalEntry[]>(() => journalStore.list());

  const refresh = useCallback(() => setItems(journalStore.list()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(JOURNAL_CHANGED, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED, refresh);
  }, [refresh]);

  return items;
};

/** 오늘 항목들만 (브리핑 v2 대비 미리 둠). */
export const useTodayJournal = (): JournalEntry[] => {
  const [items, setItems] = useState<JournalEntry[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return journalStore.listByDate(today);
  });

  const refresh = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setItems(journalStore.listByDate(today));
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(JOURNAL_CHANGED, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED, refresh);
  }, [refresh]);

  return items;
};

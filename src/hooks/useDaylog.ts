/**
 * 데일리로그 훅 — DAYLOG_CHANGED 구독으로 자동 갱신.
 */
import { useEffect, useState } from 'react';
import { daylogStore } from '@/services/daylogStore';
import { DAYLOG_CHANGED, type DayItem } from '@/types/daylog';

export function useDaylogItems(date: string): DayItem[] {
  const [items, setItems] = useState<DayItem[]>(() => daylogStore.listByDate(date));
  useEffect(() => {
    const sync = () => setItems(daylogStore.listByDate(date));
    sync();
    window.addEventListener(DAYLOG_CHANGED, sync);
    return () => window.removeEventListener(DAYLOG_CHANGED, sync);
  }, [date]);
  return items;
}

export function useDaylogRange(start: string | null, end: string | null): DayItem[] {
  const [items, setItems] = useState<DayItem[]>(() =>
    start && end ? daylogStore.inRange(start, end) : [],
  );
  useEffect(() => {
    const sync = () => setItems(start && end ? daylogStore.inRange(start, end) : []);
    sync();
    window.addEventListener(DAYLOG_CHANGED, sync);
    return () => window.removeEventListener(DAYLOG_CHANGED, sync);
  }, [start, end]);
  return items;
}

export function useDaylogAll(): DayItem[] {
  const [items, setItems] = useState<DayItem[]>(() => daylogStore.listAll());
  useEffect(() => {
    const sync = () => setItems(daylogStore.listAll());
    window.addEventListener(DAYLOG_CHANGED, sync);
    return () => window.removeEventListener(DAYLOG_CHANGED, sync);
  }, []);
  return items;
}

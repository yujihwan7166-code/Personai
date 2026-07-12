/**
 * 데이로그 훅 — 특정 날짜의 조각 목록 구독.
 * daylogStore 의 DAYLOG_CHANGED 이벤트로 자동 갱신 (journal/career 훅 패턴).
 */
import { useEffect, useState } from 'react';
import { daylogStore } from '@/services/daylogStore';
import { DAYLOG_CHANGED, type DayMoment } from '@/types/daylog';

export function useDaylogDate(date: string): DayMoment[] {
  const [moments, setMoments] = useState<DayMoment[]>(() => daylogStore.listByDate(date));

  useEffect(() => {
    setMoments(daylogStore.listByDate(date));
    const sync = () => setMoments(daylogStore.listByDate(date));
    window.addEventListener(DAYLOG_CHANGED, sync);
    return () => window.removeEventListener(DAYLOG_CHANGED, sync);
  }, [date]);

  return moments;
}

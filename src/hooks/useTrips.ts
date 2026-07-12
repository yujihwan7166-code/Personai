/**
 * 여행 훅 — 여행 목록 + 특정 여행 기간의 기록 구독.
 * TRIP_CHANGED / DAYLOG_CHANGED 양쪽에 반응 (여행 중 기록이 추가돼도 갱신).
 */
import { useEffect, useState } from 'react';
import { tripStore } from '@/services/tripStore';
import { daylogStore } from '@/services/daylogStore';
import { TRIP_CHANGED, type Trip } from '@/types/trip';
import { DAYLOG_CHANGED, type DayMoment } from '@/types/daylog';

export function useTrips(): Trip[] {
  const [trips, setTrips] = useState<Trip[]>(() => tripStore.list());
  useEffect(() => {
    const sync = () => setTrips(tripStore.list());
    window.addEventListener(TRIP_CHANGED, sync);
    return () => window.removeEventListener(TRIP_CHANGED, sync);
  }, []);
  return trips;
}

export function useTripMoments(startDate: string | null, endDate: string | null): DayMoment[] {
  const [moments, setMoments] = useState<DayMoment[]>(() =>
    startDate && endDate ? daylogStore.inRange(startDate, endDate) : [],
  );
  useEffect(() => {
    const load = () => setMoments(startDate && endDate ? daylogStore.inRange(startDate, endDate) : []);
    load();
    window.addEventListener(DAYLOG_CHANGED, load);
    return () => window.removeEventListener(DAYLOG_CHANGED, load);
  }, [startDate, endDate]);
  return moments;
}

/**
 * 한 habit 의 체크인 list 훅 — 변경 자동 반영.
 *
 * 두 사용 패턴:
 *   - useHabitCheckins(habitId) — 그 habit 의 모든 체크인
 *   - useHabitCheckins(habitId, range) — 범위 한정 (월 calendar 등)
 */
import { useEffect, useState } from 'react';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { HABIT_CHECKIN_CHANGED, type HabitCheckin } from '@/types/habit';

interface Range {
  start: string;
  end: string;
}

export const useHabitCheckins = (
  habitId: string | null,
  range?: Range,
): HabitCheckin[] => {
  const [items, setItems] = useState<HabitCheckin[]>([]);

  useEffect(() => {
    if (!habitId) {
      setItems([]);
      return;
    }
    const refresh = () => {
      setItems(
        range
          ? habitCheckinStore.range(habitId, range.start, range.end)
          : habitCheckinStore.byHabit(habitId),
      );
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(HABIT_CHECKIN_CHANGED, refresh);
    return () => window.removeEventListener(HABIT_CHECKIN_CHANGED, refresh);
  }, [habitId, range?.start, range?.end]);

  return items;
};

/**
 * 습관 list 훅 — store 변경 자동 반영.
 */
import { useEffect, useState } from 'react';
import { habitStore } from '@/services/planner/habitStore';
import { HABIT_CHANGED, type Habit } from '@/types/habit';

export const useHabits = (includeArchived = false): Habit[] => {
  const [habits, setHabits] = useState<Habit[]>(() =>
    includeArchived ? habitStore.list() : habitStore.listActive(),
  );

  useEffect(() => {
    const refresh = () => {
      setHabits(includeArchived ? habitStore.list() : habitStore.listActive());
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(HABIT_CHANGED, refresh);
    return () => window.removeEventListener(HABIT_CHANGED, refresh);
  }, [includeArchived]);

  return habits;
};

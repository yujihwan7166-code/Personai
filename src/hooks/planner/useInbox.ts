/**
 * 인박스 — 시간 미배정 할일 리스트.
 *
 * 정렬:
 * 1. pinned 우선 (true → 위)
 * 2. priority 내림차순 (3 > 2 > 1 > 0/undefined)
 * 3. 생성일 내림차순 (최신 먼저)
 */
import { useEffect, useState, useCallback } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

const sortInbox = (a: PlannerTask, b: PlannerTask): number => {
  // 1. pinned 우선
  const aPinned = a.pinned ? 1 : 0;
  const bPinned = b.pinned ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;
  // 2. priority 내림차순
  const aP = a.priority ?? 0;
  const bP = b.priority ?? 0;
  if (aP !== bP) return bP - aP;
  // 3. 생성일 내림차순
  return b.createdAt.localeCompare(a.createdAt);
};

export const useInbox = (): PlannerTask[] => {
  const [items, setItems] = useState<PlannerTask[]>(() =>
    taskStore.listInbox().sort(sortInbox),
  );

  const refresh = useCallback(
    () => setItems(taskStore.listInbox().sort(sortInbox)),
    [],
  );

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, [refresh]);

  return items;
};

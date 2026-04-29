/**
 * 인박스 — 시간 미배정 할일 리스트.
 *
 * 모드:
 * - 'anytime' (기본): someday !== true 만 (= 일반 인박스)
 * - 'someday':         someday === true 만 (= 보류함)
 *
 * 정렬:
 * 1. pinned 우선 (true → 위)
 * 2. priority 내림차순 (3 > 2 > 1 > 0/undefined)
 * 3. 생성일 내림차순 (최신 먼저)
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

export type InboxMode = 'anytime' | 'someday';

const sortInbox = (a: PlannerTask, b: PlannerTask): number => {
  const aPinned = a.pinned ? 1 : 0;
  const bPinned = b.pinned ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;
  const aP = a.priority ?? 0;
  const bP = b.priority ?? 0;
  if (aP !== bP) return bP - aP;
  return b.createdAt.localeCompare(a.createdAt);
};

const compute = (mode: InboxMode): PlannerTask[] => {
  return taskStore
    .listInbox()
    .filter((t) => {
      if (t.canceled) return false; // 취소된 건 인박스에서 즉시 hide
      return mode === 'someday' ? t.someday === true : t.someday !== true;
    })
    .sort(sortInbox);
};

export const useInbox = (mode: InboxMode = 'anytime'): PlannerTask[] => {
  const stableMode = useMemo(() => mode, [mode]);
  const [items, setItems] = useState<PlannerTask[]>(() => compute(stableMode));

  const refresh = useCallback(() => setItems(compute(stableMode)), [stableMode]);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, [refresh]);

  return items;
};

/** 두 모드의 카운트만 빠르게 (탭 라벨용). */
export const useInboxCounts = (): { anytime: number; someday: number } => {
  const [counts, setCounts] = useState(() => {
    const all = taskStore.listInbox().filter((t) => !t.canceled);
    return {
      anytime: all.filter((t) => !t.someday).length,
      someday: all.filter((t) => t.someday).length,
    };
  });

  const refresh = useCallback(() => {
    const all = taskStore.listInbox().filter((t) => !t.canceled);
    setCounts({
      anytime: all.filter((t) => !t.someday).length,
      someday: all.filter((t) => t.someday).length,
    });
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, [refresh]);

  return counts;
};

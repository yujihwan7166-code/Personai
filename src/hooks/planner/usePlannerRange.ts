/**
 * 임의 기간(예: 주/월/년) Event + Task 합쳐서 시작 시각 오름차순 반환.
 *
 * Week/Month/Year 뷰 데이터 소스. 변경 broadcast 자동 listen.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import {
  PlannerTimelineItem,
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
} from '@/types/planner';

const compute = (startIso: string, endIso: string): PlannerTimelineItem[] => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  const events = eventStore.list().filter((e) => {
    const t = new Date(e.startAt).getTime();
    return t >= start && t < end;
  });
  const tasks = taskStore.list().filter((t) => {
    if (!t.startAt) return false;
    const ms = new Date(t.startAt).getTime();
    return ms >= start && ms < end;
  });

  const merged: PlannerTimelineItem[] = [
    ...events.map((e) => ({ kind: 'event' as const, data: e })),
    ...tasks.map((t) => ({ kind: 'task' as const, data: t })),
  ];
  return merged.sort((a, b) => {
    const aStart = a.kind === 'event' ? a.data.startAt : a.data.startAt ?? '';
    const bStart = b.kind === 'event' ? b.data.startAt : b.data.startAt ?? '';
    return aStart.localeCompare(bStart);
  });
};

export const usePlannerRange = (startIso: string, endIso: string): PlannerTimelineItem[] => {
  const stableStart = useMemo(() => startIso, [startIso]);
  const stableEnd = useMemo(() => endIso, [endIso]);

  const [items, setItems] = useState<PlannerTimelineItem[]>(() =>
    compute(stableStart, stableEnd),
  );

  const refresh = useCallback(
    () => setItems(compute(stableStart, stableEnd)),
    [stableStart, stableEnd],
  );

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
    };
  }, [refresh]);

  return items;
};

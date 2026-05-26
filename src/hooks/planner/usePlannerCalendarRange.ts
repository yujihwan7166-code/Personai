/**
 * 주/월 캘린더용 데이터 소스.
 *
 * timedItems: 시간이 잡힌 일정/할 일
 * dateTodos: 시간은 없지만 특정 날짜(plannedFor)에 배치된 할 일
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import { toDateKey } from '@/lib/planner/habitStats';
import {
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
  type PlannerTask,
  type PlannerTimelineItem,
} from '@/types/planner';

export interface PlannerCalendarRange {
  timedItems: PlannerTimelineItem[];
  dateTodos: PlannerTask[];
}

const compute = (startIso: string, endIso: string): PlannerCalendarRange => {
  const rangeStart = new Date(startIso);
  const rangeEnd = new Date(endIso);
  const startKey = toDateKey(rangeStart);
  const endKey = toDateKey(rangeEnd);

  const events = eventStore.listByRange(rangeStart, rangeEnd);
  const scheduledTasks = taskStore.listScheduledRange(rangeStart, rangeEnd);
  const dateTodos = taskStore.list()
    .filter((task) => {
      if (task.startAt || !task.plannedFor) return false;
      if (task.done || task.canceled || task.someday) return false;
      return task.plannedFor >= startKey && task.plannedFor < endKey;
    })
    .sort((a, b) => {
      const byDate = (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '');
      if (byDate !== 0) return byDate;
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const timedItems: PlannerTimelineItem[] = [
    ...events.map((event) => ({ kind: 'event' as const, data: event })),
    ...scheduledTasks.map((task) => ({ kind: 'task' as const, data: task })),
  ].sort((a, b) => {
    const aStart = a.kind === 'event' ? a.data.startAt : a.data.startAt ?? '';
    const bStart = b.kind === 'event' ? b.data.startAt : b.data.startAt ?? '';
    return aStart.localeCompare(bStart);
  });

  return { timedItems, dateTodos };
};

export const usePlannerCalendarRange = (startIso: string, endIso: string): PlannerCalendarRange => {
  const stableStart = useMemo(() => startIso, [startIso]);
  const stableEnd = useMemo(() => endIso, [endIso]);

  const [range, setRange] = useState<PlannerCalendarRange>(() =>
    compute(stableStart, stableEnd),
  );

  const refresh = useCallback(
    () => setRange(compute(stableStart, stableEnd)),
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

  return range;
};

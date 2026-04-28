/**
 * 오늘의 시간표 데이터 — Event + 시간배정 Task 합쳐서 시작 시각 오름차순 반환.
 *
 * 변경 감지: PLANNER_EVENT_CHANGED / PLANNER_TASK_CHANGED 이벤트 listen.
 * 이 훅은 시간표(TodayTimeline) 와 TODAY 미니뷰(Phase 5) 양쪽에서 사용.
 */
import { useEffect, useState, useCallback } from 'react';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import {
  PlannerTimelineItem,
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
} from '@/types/planner';

const compute = (dateIso: string): PlannerTimelineItem[] => {
  const events = eventStore.listByDate(dateIso);
  const tasks = taskStore.listScheduled(dateIso);
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

export const usePlannerToday = (
  /** 기본값 = 오늘. ISO 8601 (날짜 부분만 사용). */
  dateIso: string = new Date().toISOString(),
): PlannerTimelineItem[] => {
  const [items, setItems] = useState<PlannerTimelineItem[]>(() => compute(dateIso));

  const refresh = useCallback(() => setItems(compute(dateIso)), [dateIso]);

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

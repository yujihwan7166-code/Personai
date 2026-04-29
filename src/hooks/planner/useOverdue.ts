/**
 * 오버듀(지난 미완료) 할일 — 시간 배정됐는데 끝났는데 아직 완료 X.
 *
 * Sunsama / Things3 / Todoist 표준 패턴: '지난 일 정리' 영역.
 * 1분마다 자동 갱신 — 시간 흐름에 따라 새로 오버듀가 됨.
 */
import { useEffect, useState, useCallback } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

const compute = (): PlannerTask[] => {
  const nowIso = new Date().toISOString();
  return taskStore
    .list()
    .filter((t) => !t.done && t.endAt && t.endAt < nowIso)
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''));
};

export const useOverdue = (): PlannerTask[] => {
  const [items, setItems] = useState<PlannerTask[]>(() => compute());

  const refresh = useCallback(() => setItems(compute()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    // 1분마다 — 시간 흐름에 따라 endAt 지난 항목이 새로 추가됨.
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  return items;
};

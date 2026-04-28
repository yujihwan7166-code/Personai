/**
 * 인박스 — 시간 미배정 할일 리스트.
 *
 * Sunsama 좌측 패널 데이터 소스. PLANNER_TASK_CHANGED 변경 listen.
 */
import { useEffect, useState, useCallback } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

export const useInbox = (): PlannerTask[] => {
  const [items, setItems] = useState<PlannerTask[]>(() => taskStore.listInbox());

  const refresh = useCallback(() => setItems(taskStore.listInbox()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, [refresh]);

  return items;
};

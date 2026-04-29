/**
 * 오늘 미완료 할일 — TODAY 미니뷰(Col 1) 데이터 소스.
 *
 * 포함: 인박스(시간 미배정) + 오늘 시간배정.
 * 제외: 완료된 항목, 다른 날 시간배정.
 * 정렬: 시간배정된 것 우선(오름차순), 인박스는 최신 생성순.
 */
import { useEffect, useState, useCallback } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

const compute = (): PlannerTask[] => {
  const today = new Date().toISOString().slice(0, 10);
  const all = taskStore.list();
  const filtered = all.filter((t) => {
    if (t.done) return false;
    if (t.canceled) return false; // Things3 Cancel — 카운트 X
    if (t.someday) return false;   // 보류 항목 — 오늘 카운트 X
    if (!t.startAt) return true; // 인박스 (시간 미배정)
    return t.startAt.slice(0, 10) === today; // 오늘 시간배정
  });
  // 정렬: 시간배정 우선 (오름차순), 인박스는 최신 생성순.
  return filtered.sort((a, b) => {
    if (a.startAt && b.startAt) return a.startAt.localeCompare(b.startAt);
    if (a.startAt && !b.startAt) return -1;
    if (!a.startAt && b.startAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
};

export const useTodayTasks = (): PlannerTask[] => {
  const [tasks, setTasks] = useState<PlannerTask[]>(() => compute());

  const refresh = useCallback(() => setTasks(compute()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, [refresh]);

  return tasks;
};

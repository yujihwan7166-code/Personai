/**
 * 오늘 미완료 할일 — TODAY 미니뷰(Col 1) 데이터 소스.
 *
 * 포함: 인박스(시간 미배정) + 오늘 시간배정.
 * 제외: 완료된 항목, 다른 날 시간배정.
 * 정렬: 시간배정된 것 우선(오름차순), 인박스는 최신 생성순.
 */
import { useEffect, useState, useCallback } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { compareTodoTasks } from '@/lib/planner/todoOrder';
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

const localDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const compute = (): PlannerTask[] => {
  const today = new Date();
  const todayIso = today.toISOString();
  const todayKey = localDateKey(today);
  // 인박스 (시간 미배정) — 마스터들 중 startAt 없는 것만.
  const inbox = taskStore.list().filter((t) => {
    if (t.startAt) return false; // 시간 배정 항목은 listScheduled 가 처리
    if (t.done) return false;
    if (t.canceled) return false;
    if (t.someday) return false;
    if (t.goalId && t.plannedFor !== todayKey) return false;
    return true;
  });
  // 오늘 시간배정 — 반복 인스턴스 expand 포함.
  const scheduled = taskStore.listScheduled(todayIso).filter((t) => {
    if (t.done) return false;
    if (t.canceled) return false;
    if (t.someday) return false;
    return true;
  });
  // 정렬: 시간배정 우선 (오름차순), 인박스는 최신 생성순.
  return [
    ...scheduled.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? '')),
    ...inbox.sort(compareTodoTasks),
  ];
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

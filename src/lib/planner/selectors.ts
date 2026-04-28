/**
 * Cross-ref 인덱스 + 파생 selector + cascade helper.
 *
 * - 4 store version (`indexVersion`) 변경 시 캐시 무효화
 * - selector hook 은 `useSyncExternalStore(subscribeIndex, get*)` 패턴
 * - 같은 indexVersion 안에서는 같은 reference 반환 (React 안전)
 */

import { useSyncExternalStore } from 'react';
import type {
  Goal, Task, Habit, ManualEvent,
  ID, DayKey, PlannerIndex,
  CalendarRow, VirtualTaskEvent, VirtualHabitEvent,
  TaskRow, VirtualHabitTask,
} from './types';
import { getGoals, removeGoal as _removeGoal } from './goalStore';
import { getTasks, detachTasksFromGoal } from './taskStore';
import {
  getHabits, computeCurrentStreak, computeRate30d, detachHabitsFromGoal,
} from './habitStore';
import { getEvents, detachEventsFromGoal } from './eventStore';
import { subscribeIndex, getIndexVersion } from './storage';
import { dayKeyOf, todayKey, matchesCadence, startOfDayKst } from './date';

// ──────────────────────────────────────────
// 캐시 헬퍼 — indexVersion 변경 시 자동 무효화
// ──────────────────────────────────────────
function cached<T>(): { get(compute: () => T): T } {
  let value: T;
  let at = -1;
  return {
    get(compute: () => T): T {
      const v = getIndexVersion();
      if (v !== at) {
        value = compute();
        at = v;
      }
      return value;
    },
  };
}

// ──────────────────────────────────────────
// 1) Cross-ref 인덱스
// ──────────────────────────────────────────
const _indexCache = cached<PlannerIndex>();

export function getIndex(): PlannerIndex {
  return _indexCache.get(() => {
    const tasksByGoal = new Map<ID, ID[]>();
    const habitsByGoal = new Map<ID, ID[]>();
    const eventsByGoal = new Map<ID, ID[]>();
    const orphanTasks: ID[] = [];
    const orphanHabits: ID[] = [];

    for (const t of getTasks()) {
      if (t.goalId) {
        const arr = tasksByGoal.get(t.goalId) ?? [];
        arr.push(t.id);
        tasksByGoal.set(t.goalId, arr);
      } else {
        orphanTasks.push(t.id);
      }
    }
    for (const h of getHabits()) {
      if (h.archivedAt) continue;
      if (h.goalId) {
        const arr = habitsByGoal.get(h.goalId) ?? [];
        arr.push(h.id);
        habitsByGoal.set(h.goalId, arr);
      } else {
        orphanHabits.push(h.id);
      }
    }
    for (const e of getEvents()) {
      if (e.goalId) {
        const arr = eventsByGoal.get(e.goalId) ?? [];
        arr.push(e.id);
        eventsByGoal.set(e.goalId, arr);
      }
    }
    return {
      tasksByGoal, habitsByGoal, eventsByGoal,
      orphanTasks, orphanHabits,
      builtAtVersion: getIndexVersion(),
    };
  });
}

// ──────────────────────────────────────────
// 2) Goal 진척 — task + habit 가중 평균
// ──────────────────────────────────────────
export interface GoalProgress {
  /** 0-1. percent 모드면 manual/100, count 모드면 자동 계산. */
  progress: number;
  doneTasks: number;
  totalTasks: number;
  habitsCount: number;
  avgHabitRate30d: number;          // 0-1
}

const _progressCache = cached<Map<ID, GoalProgress>>();

export function getGoalProgress(goalId: ID): GoalProgress {
  const map = _progressCache.get(() => {
    const m = new Map<ID, GoalProgress>();
    const idx = getIndex();
    const taskArr = getTasks();
    const habitArr = getHabits();

    for (const g of getGoals()) {
      const taskIds = idx.tasksByGoal.get(g.id) ?? [];
      const tasks = taskArr.filter((t) => taskIds.includes(t.id));
      const doneTasks = tasks.filter((t) => t.done).length;
      const totalTasks = tasks.length;

      const habitIds = idx.habitsByGoal.get(g.id) ?? [];
      const habits = habitArr.filter((h) => habitIds.includes(h.id));
      const habitsCount = habits.length;
      const avgHabitRate30d =
        habitsCount === 0
          ? 0
          : habits.reduce((sum, h) => sum + computeRate30d(h), 0) / habitsCount;

      let progress: number;
      if (g.metric.kind === 'percent') {
        progress = Math.min(1, Math.max(0, g.metric.manual / 100));
      } else {
        const tasksProgress =
          g.metric.target === 0 ? 0 : Math.min(1, doneTasks / g.metric.target);
        const habitWeight = habitsCount > 0 ? 0.3 : 0;
        progress = tasksProgress * (1 - habitWeight) + avgHabitRate30d * habitWeight;
        progress = Math.min(1, Math.max(0, progress));
      }
      m.set(g.id, { progress, doneTasks, totalTasks, habitsCount, avgHabitRate30d });
    }
    return m;
  });
  return map.get(goalId) ?? { progress: 0, doneTasks: 0, totalTasks: 0, habitsCount: 0, avgHabitRate30d: 0 };
}

// ──────────────────────────────────────────
// 3) Habit streak — 단일 habit 만 의존
// ──────────────────────────────────────────
export interface HabitStreak {
  current: number;
  rate30d: number;
}

const _streakCache = cached<Map<ID, HabitStreak>>();

export function getHabitStreak(habitId: ID): HabitStreak {
  const map = _streakCache.get(() => {
    const m = new Map<ID, HabitStreak>();
    for (const h of getHabits()) {
      m.set(h.id, {
        current: computeCurrentStreak(h),
        rate30d: computeRate30d(h),
      });
    }
    return m;
  });
  return map.get(habitId) ?? { current: 0, rate30d: 0 };
}

// ──────────────────────────────────────────
// 4) 오늘의 task — 실 task + 가상 habit task
// ──────────────────────────────────────────
const _todayTasksCache = cached<TaskRow[]>();

export function getTodayTaskRows(): TaskRow[] {
  return _todayTasksCache.get(() => {
    const today = todayKey();
    const realTasks: Task[] = getTasks().filter((t) => {
      if (t.done) {
        // 오늘 완료된 것만 표시 (이전 완료는 숨김)
        return t.doneAt !== undefined && dayKeyOf(t.doneAt) === today;
      }
      if (t.scheduledAt && dayKeyOf(t.scheduledAt) === today) return true;
      if (t.dueAt && dayKeyOf(t.dueAt) === today) return true;
      return false;
    });

    const virtualHabitTasks: VirtualHabitTask[] = [];
    for (const h of getHabits()) {
      if (h.archivedAt) continue;
      if (!matchesCadence(h.cadence, today)) continue;
      virtualHabitTasks.push({
        kind: 'virtual_habit_task',
        id: `virt_h_${h.id}_${today}`,
        habitId: h.id,
        dayKey: today,
        title: h.title,
        emoji: h.emoji,
        goalId: h.goalId,
        done: !!h.history[today],
      });
    }

    // 가상 todo 가 위, 그 다음 실 task (마감·우선순위 정렬)
    realTasks.sort((a, b) => {
      // 마감 오늘 우선
      const aDueToday = a.dueAt && dayKeyOf(a.dueAt) === today ? 1 : 0;
      const bDueToday = b.dueAt && dayKeyOf(b.dueAt) === today ? 1 : 0;
      if (aDueToday !== bDueToday) return bDueToday - aDueToday;
      // 우선순위
      const prio = { high: 0, med: 1, low: 2 } as const;
      return prio[a.priority] - prio[b.priority];
    });

    return [...virtualHabitTasks, ...realTasks];
  });
}

// ──────────────────────────────────────────
// 5) 캘린더 합성 — manual + task 가상 + habit 가상
// ──────────────────────────────────────────
const _todayCalendarCache = cached<CalendarRow[]>();

export function getTodayCalendar(): CalendarRow[] {
  return _todayCalendarCache.get(() => buildCalendarForDay(todayKey()));
}

export function buildCalendarForDay(day: DayKey): CalendarRow[] {
  const out: CalendarRow[] = [];
  const dayStart = startOfDayKst(day);
  const dayEnd = dayStart + 24 * 3600 * 1000;

  // manual events (단순 RRule v1: 'daily' / 'weekly:0,1,5')
  for (const e of getEvents()) {
    const matches = matchesEventOnDay(e, day, dayStart, dayEnd);
    if (matches) out.push(e);
  }

  // task 가상 — 오늘 scheduled / due
  for (const t of getTasks()) {
    if (t.scheduledAt && dayKeyOf(t.scheduledAt) === day) {
      out.push({
        kind: 'virtual_task',
        taskId: t.id,
        start: t.scheduledAt,
        isDue: false,
        title: t.title,
        done: t.done,
      } satisfies VirtualTaskEvent);
    } else if (t.dueAt && dayKeyOf(t.dueAt) === day) {
      out.push({
        kind: 'virtual_task',
        taskId: t.id,
        start: t.dueAt,
        isDue: true,
        title: t.title,
        done: t.done,
      } satisfies VirtualTaskEvent);
    }
  }

  // habit 가상 — cadence 매치 시
  for (const h of getHabits()) {
    if (h.archivedAt) continue;
    if (!matchesCadence(h.cadence, day)) continue;
    const start = h.scheduleAt
      ? dayStart + (h.scheduleAt.hour * 3600 + h.scheduleAt.min * 60) * 1000
      : undefined;
    out.push({
      kind: 'virtual_habit',
      habitId: h.id,
      dayKey: day,
      start,
      title: h.title,
      emoji: h.emoji,
      done: !!h.history[day],
    } satisfies VirtualHabitEvent);
  }

  // 시간순 정렬 (allDay / 시간 없음은 위로)
  out.sort((a, b) => getRowStart(a) - getRowStart(b));
  return out;
}

function getRowStart(row: CalendarRow): number {
  if (row.kind === 'virtual_task') return row.start;
  if (row.kind === 'virtual_habit') return row.start ?? 0;
  return row.allDay ? 0 : row.start;
}

/** v1 RRule 매칭 — 'daily' 또는 'weekly:0,1,5'. 그 외는 단발 (start 일자 매칭). */
function matchesEventOnDay(e: ManualEvent, day: DayKey, dayStart: number, dayEnd: number): boolean {
  if (!e.rrule) {
    const eDay = dayKeyOf(e.start);
    return eDay === day;
  }
  if (e.start > dayEnd) return false;            // 시작 전엔 발생 X
  if (e.rrule === 'daily') return true;
  if (e.rrule.startsWith('weekly:')) {
    const days = e.rrule.slice(7).split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
    const wd = new Date(dayStart + 9 * 3600 * 1000 + 4 * 3600 * 1000).getUTCDay();
    return days.includes(wd);
  }
  return false;
}

// ──────────────────────────────────────────
// 6) Cascade helper — Goal 삭제 시 연결 항목 정리
// ──────────────────────────────────────────
export function removeGoalCascade(goalId: ID): void {
  detachTasksFromGoal(goalId);
  detachHabitsFromGoal(goalId);
  detachEventsFromGoal(goalId);
  _removeGoal(goalId);
}

// ──────────────────────────────────────────
// 7) React hooks — selector 가 indexVersion 구독
// ──────────────────────────────────────────
export function useIndex(): PlannerIndex {
  return useSyncExternalStore(subscribeIndex, getIndex, getIndex);
}

export function useGoalProgress(goalId: ID): GoalProgress {
  return useSyncExternalStore(subscribeIndex, () => getGoalProgress(goalId), () => getGoalProgress(goalId));
}

export function useHabitStreak(habitId: ID): HabitStreak {
  return useSyncExternalStore(subscribeIndex, () => getHabitStreak(habitId), () => getHabitStreak(habitId));
}

export function useTodayTaskRows(): TaskRow[] {
  return useSyncExternalStore(subscribeIndex, getTodayTaskRows, getTodayTaskRows);
}

export function useTodayCalendar(): CalendarRow[] {
  return useSyncExternalStore(subscribeIndex, getTodayCalendar, getTodayCalendar);
}

export function useCalendarForDay(day: DayKey): CalendarRow[] {
  return useSyncExternalStore(
    subscribeIndex,
    () => buildCalendarForDay(day),
    () => buildCalendarForDay(day),
  );
}

// ──────────────────────────────────────────
// 8) 통계 — 대시보드 한 눈
// ──────────────────────────────────────────
export interface OverallStats {
  goalsActive: number;
  goalsAvgProgress: number;        // 0-1
  tasksDoneToday: number;
  tasksTotalToday: number;
  habitsDoneToday: number;
  habitsTotalToday: number;
  habitsAvgStreak: number;
  eventsToday: number;
}

const _statsCache = cached<OverallStats>();

export function getOverallStats(): OverallStats {
  return _statsCache.get(() => {
    const today = todayKey();
    const goals = getGoals().filter((g) => g.status === 'active');
    const goalsAvgProgress =
      goals.length === 0
        ? 0
        : goals.reduce((sum, g) => sum + getGoalProgress(g.id).progress, 0) / goals.length;

    const todayRows = getTodayTaskRows();
    const tasksDoneToday = todayRows.filter((r) => r.done).length;
    const tasksTotalToday = todayRows.length;

    const todayHabits = getHabits().filter(
      (h) => !h.archivedAt && matchesCadence(h.cadence, today),
    );
    const habitsTotalToday = todayHabits.length;
    const habitsDoneToday = todayHabits.filter((h) => h.history[today]).length;
    const habitsAvgStreak =
      todayHabits.length === 0
        ? 0
        : todayHabits.reduce((s, h) => s + computeCurrentStreak(h), 0) / todayHabits.length;

    const cal = getTodayCalendar();
    const eventsToday = cal.filter((r) => r.kind !== 'virtual_habit').length;

    return {
      goalsActive: goals.length,
      goalsAvgProgress,
      tasksDoneToday,
      tasksTotalToday,
      habitsDoneToday,
      habitsTotalToday,
      habitsAvgStreak,
      eventsToday,
    };
  });
}

export function useOverallStats(): OverallStats {
  return useSyncExternalStore(subscribeIndex, getOverallStats, getOverallStats);
}

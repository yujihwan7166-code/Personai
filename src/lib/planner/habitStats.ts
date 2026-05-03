/**
 * 습관 통계 — 스케줄 인지 + streak 계산.
 *
 * 모든 함수는 순수 — 테스트 용이.
 * 날짜 키는 로컬 YYYY-MM-DD 컨벤션.
 */
import type { Habit, HabitCheckin } from '@/types/habit';
import { WEEKDAY_ORDER } from '@/types/planner';

// ─── 날짜 헬퍼 ───────────────────────────────────────────

/** Date → YYYY-MM-DD (로컬). */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** YYYY-MM-DD → Date (로컬 자정). */
export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 두 dateKey 사이 일수 차 (b - a, 일 단위). */
const daysBetween = (a: string, b: string): number => {
  const da = fromDateKey(a).getTime();
  const db = fromDateKey(b).getTime();
  return Math.round((db - da) / 86_400_000);
};

const addDays = (key: string, n: number): string => {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

// ─── 스케줄 ───────────────────────────────────────────

/**
 * habit 이 dateKey 에 스케줄되어 있는지.
 * startDate <= dateKey <= endDate 범위 내에서 freq 규칙 적용.
 */
export const isScheduledOn = (habit: Habit, dateKey: string): boolean => {
  if (dateKey < habit.startDate) return false;
  if (habit.endDate && dateKey > habit.endDate) return false;

  const d = fromDateKey(dateKey);
  const start = fromDateKey(habit.startDate);
  const interval = Math.max(1, habit.schedule.interval ?? 1);

  switch (habit.schedule.freq) {
    case 'daily': {
      if (interval === 1) return true;
      const diff = Math.round((d.getTime() - start.getTime()) / 86_400_000);
      return diff >= 0 && diff % interval === 0;
    }
    case 'weekly': {
      const dow = WEEKDAY_ORDER[d.getDay()];
      const days = habit.schedule.weekdays;
      const dowOk = !days || days.length === 0 ? true : days.includes(dow);
      if (!dowOk) return false;
      if (interval === 1) return true;
      // 시작 주 0, 매 N주.
      const startWeekStart = new Date(start);
      startWeekStart.setDate(start.getDate() - start.getDay());
      const dWeekStart = new Date(d);
      dWeekStart.setDate(d.getDate() - d.getDay());
      const weekDiff = Math.round((dWeekStart.getTime() - startWeekStart.getTime()) / (7 * 86_400_000));
      return weekDiff >= 0 && weekDiff % interval === 0;
    }
    case 'monthly': {
      const days = habit.schedule.monthDays;
      const dayOfMonth = d.getDate();
      const dayOk = !days || days.length === 0 ? dayOfMonth === start.getDate() : days.includes(dayOfMonth);
      if (!dayOk) return false;
      if (interval === 1) return true;
      const monthDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      return monthDiff >= 0 && monthDiff % interval === 0;
    }
    case 'custom':
      return habit.schedule.customDates?.includes(dateKey) ?? false;
    default:
      return false;
  }
};

/** habit 이 그날 "완료"로 간주되는지 — count >= timesPerDay (또는 1). */
export const isCompletedOn = (habit: Habit, checkin: HabitCheckin | undefined): boolean => {
  if (!checkin) return false;
  const need = Math.max(1, habit.schedule.timesPerDay ?? 1);
  return (checkin.count ?? 0) >= need;
};

// ─── streak / 통계 ───────────────────────────────────────────

/**
 * 현재 streak — "오늘(또는 어제까지) 연속 완료" 일수.
 *
 * 정책: 오늘 스케줄인데 미완료면 streak 끊긴 것 아님 (어제까지 기준).
 * 어제 미완료면 streak 0. 단, 스케줄 안 된 날은 무시(skip).
 */
export const currentStreak = (habit: Habit, checkins: HabitCheckin[]): number => {
  const map = new Map(checkins.map((c) => [c.date, c]));
  const today = toDateKey(new Date());
  let streak = 0;
  let cursor = today;

  // 오늘이 스케줄이고 완료면 +1, 아니면 어제부터 시작.
  if (isScheduledOn(habit, cursor)) {
    if (isCompletedOn(habit, map.get(cursor))) streak++;
    cursor = addDays(cursor, -1);
  } else {
    cursor = addDays(cursor, -1);
  }

  // 과거로 거슬러 — startDate 까지.
  while (cursor >= habit.startDate) {
    if (!isScheduledOn(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (isCompletedOn(habit, map.get(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
};

/** 역대 최장 streak. */
export const maxStreak = (habit: Habit, checkins: HabitCheckin[]): number => {
  const map = new Map(checkins.map((c) => [c.date, c]));
  const today = toDateKey(new Date());
  let cursor = habit.startDate;
  let best = 0;
  let cur = 0;
  while (cursor <= today) {
    if (isScheduledOn(habit, cursor)) {
      if (isCompletedOn(habit, map.get(cursor))) {
        cur++;
        if (cur > best) best = cur;
      } else {
        cur = 0;
      }
    }
    cursor = addDays(cursor, 1);
    // 안전장치 — 1만 일 (~27년) 제한.
    if (daysBetween(habit.startDate, cursor) > 10000) break;
  }
  return best;
};

/** 특정 월 (year, month1Indexed) 의 체크인 완료 일수. */
export const monthCheckinCount = (
  habit: Habit,
  year: number,
  month1Indexed: number,
  checkins: HabitCheckin[],
): number => {
  const map = new Map(checkins.map((c) => [c.date, c]));
  const lastDay = new Date(year, month1Indexed, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    const key = toDateKey(new Date(year, month1Indexed - 1, day));
    if (isCompletedOn(habit, map.get(key))) count++;
  }
  return count;
};

/** 특정 월의 완료율 — 완료/스케줄. (스케줄 0 이면 0). */
export const monthCompletionRate = (
  habit: Habit,
  year: number,
  month1Indexed: number,
  checkins: HabitCheckin[],
): number => {
  const map = new Map(checkins.map((c) => [c.date, c]));
  const lastDay = new Date(year, month1Indexed, 0).getDate();
  let scheduled = 0;
  let completed = 0;
  for (let day = 1; day <= lastDay; day++) {
    const key = toDateKey(new Date(year, month1Indexed - 1, day));
    if (!isScheduledOn(habit, key)) continue;
    scheduled++;
    if (isCompletedOn(habit, map.get(key))) completed++;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
};

/** 총 체크인 수 (count>=1 인 row 수). */
export const totalCheckins = (habit: Habit, checkins: HabitCheckin[]): number =>
  checkins.filter((c) => isCompletedOn(habit, c)).length;

/** 다음 예정일 (D-day 등). 없으면 null. */
export const nextDue = (habit: Habit, fromDateKey: string): string | null => {
  if (habit.endDate && fromDateKey > habit.endDate) return null;
  let cursor = fromDateKey;
  for (let i = 0; i < 366; i++) {
    if (isScheduledOn(habit, cursor)) return cursor;
    cursor = addDays(cursor, 1);
    if (habit.endDate && cursor > habit.endDate) return null;
  }
  return null;
};

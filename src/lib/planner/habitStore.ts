/**
 * Habit store — pub/sub + localStorage.
 * history 는 체크된 날만 키 보유 (false 저장 X).
 */

import { useSyncExternalStore } from 'react';
import type { Habit, ID, DayKey, HabitCadence } from './types';
import { loadList, saveList, newEntityId, bumpIndex, onExternalChange, storageKey } from './storage';
import { todayKey, dayKeyBefore, matchesCadence } from './date';

const STORAGE_NAME = 'habits';

let _cache: Habit[] | null = null;
const _listeners = new Set<() => void>();

function ensure(): Habit[] {
  if (_cache === null) _cache = loadList<Habit>(STORAGE_NAME);
  return _cache;
}

function commit(next: Habit[]): void {
  _cache = next;
  saveList(STORAGE_NAME, next);
  bumpIndex();
  _listeners.forEach((l) => l());
}

onExternalChange((key) => {
  if (key === storageKey(STORAGE_NAME)) {
    _cache = null;
    bumpIndex();
    _listeners.forEach((l) => l());
  }
});

// ── CRUD ──
export function getHabits(): Habit[] {
  return ensure();
}

export function getHabit(id: ID): Habit | undefined {
  return ensure().find((h) => h.id === id);
}

export function addHabit(input: {
  title: string;
  emoji?: string;
  cadence: HabitCadence;
  scheduleAt?: { hour: number; min: number };
  goalId?: ID;
}): Habit {
  const now = Date.now();
  const h: Habit = {
    id: newEntityId('h'),
    title: input.title,
    emoji: input.emoji,
    cadence: input.cadence,
    scheduleAt: input.scheduleAt,
    goalId: input.goalId,
    startedAt: now,
    history: {},
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  commit([...ensure(), h]);
  return h;
}

export function updateHabit(id: ID, patch: Partial<Omit<Habit, 'id' | 'createdAt' | 'version' | 'history'>>): void {
  commit(ensure().map((h) => (h.id === id ? { ...h, ...patch, updatedAt: Date.now() } : h)));
}

/** 해당 날짜 체크 토글. idempotent. */
export function toggleHabitDay(id: ID, dayKey: DayKey): void {
  commit(
    ensure().map((h) => {
      if (h.id !== id) return h;
      const next = { ...h.history };
      if (next[dayKey]) delete next[dayKey];
      else next[dayKey] = true;
      return { ...h, history: next, updatedAt: Date.now() };
    })
  );
}

export function archiveHabit(id: ID): void {
  updateHabit(id, { archivedAt: Date.now() });
}

export function unarchiveHabit(id: ID): void {
  commit(
    ensure().map((h) => {
      if (h.id !== id) return h;
      const { archivedAt, ...rest } = h;
      void archivedAt;
      return { ...rest, updatedAt: Date.now() } as Habit;
    })
  );
}

export function removeHabit(id: ID): void {
  commit(ensure().filter((h) => h.id !== id));
}

export function detachHabitsFromGoal(goalId: ID): void {
  commit(ensure().map((h) => (h.goalId === goalId ? { ...h, goalId: undefined, updatedAt: Date.now() } : h)));
}

// ── 파생 (단일 habit 만 의존, cross-ref 무관) ──

/** 현재 streak — 오늘부터 거꾸로 cadence 충족일이 연속 체크된 길이. */
export function computeCurrentStreak(habit: Habit): number {
  let streak = 0;
  let day = todayKey();
  let safety = 365 * 3;
  while (safety-- > 0) {
    if (!matchesCadence(habit.cadence, day)) {
      // cadence 비대상일은 streak 끊지 않고 통과
      day = dayKeyBefore_relative(day);
      continue;
    }
    if (habit.history[day]) {
      streak++;
      day = dayKeyBefore_relative(day);
    } else {
      break;
    }
  }
  return streak;
}

/** 지난 30일 완수율 (cadence 대상일 기준). */
export function computeRate30d(habit: Habit): number {
  let target = 0;
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const d = dayKeyBefore(i);
    if (!matchesCadence(habit.cadence, d)) continue;
    target++;
    if (habit.history[d]) done++;
  }
  return target === 0 ? 0 : done / target;
}

function dayKeyBefore_relative(dayKey: DayKey): DayKey {
  // dayKey 의 전날을 KST 안전하게.
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// ── 구독 ──
export function subscribeHabits(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function useHabits(): Habit[] {
  return useSyncExternalStore(subscribeHabits, getHabits, getHabits);
}

export function useHabit(id: ID): Habit | undefined {
  const list = useHabits();
  return list.find((h) => h.id === id);
}

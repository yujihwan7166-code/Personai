/**
 * Task store — pub/sub + localStorage.
 */

import { useSyncExternalStore } from 'react';
import type { Task, ID, Priority } from './types';
import { loadList, saveList, newEntityId, bumpIndex, onExternalChange, storageKey } from './storage';

const STORAGE_NAME = 'tasks';

let _cache: Task[] | null = null;
const _listeners = new Set<() => void>();

function ensure(): Task[] {
  if (_cache === null) _cache = loadList<Task>(STORAGE_NAME);
  return _cache;
}

function commit(next: Task[]): void {
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
export function getTasks(): Task[] {
  return ensure();
}

export function getTask(id: ID): Task | undefined {
  return ensure().find((t) => t.id === id);
}

export function addTask(input: {
  title: string;
  notes?: string;
  scheduledAt?: number;
  dueAt?: number;
  priority?: Priority;
  goalId?: ID;
  habitId?: ID;
  parentTaskId?: ID;
  source?: Task['source'];
}): Task {
  const now = Date.now();
  const t: Task = {
    id: newEntityId('t'),
    title: input.title,
    notes: input.notes,
    done: false,
    scheduledAt: input.scheduledAt,
    dueAt: input.dueAt,
    priority: input.priority ?? 'med',
    goalId: input.goalId,
    habitId: input.habitId,
    parentTaskId: input.parentTaskId,
    source: input.source ?? 'manual',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  commit([...ensure(), t]);
  return t;
}

export function updateTask(id: ID, patch: Partial<Omit<Task, 'id' | 'createdAt' | 'version'>>): void {
  commit(
    ensure().map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
  );
}

/** 체크 토글 — `doneAt` 자동 갱신. */
export function toggleTaskDone(id: ID): void {
  const t = getTask(id);
  if (!t) return;
  const willBeDone = !t.done;
  updateTask(id, {
    done: willBeDone,
    doneAt: willBeDone ? Date.now() : undefined,
  });
}

export function removeTask(id: ID): void {
  commit(ensure().filter((t) => t.id !== id));
}

/** Goal 삭제 시 cascade. selectors/sync 가 호출. */
export function detachTasksFromGoal(goalId: ID): void {
  commit(ensure().map((t) => (t.goalId === goalId ? { ...t, goalId: undefined, updatedAt: Date.now() } : t)));
}

// ── 구독 ──
export function subscribeTasks(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function useTasks(): Task[] {
  return useSyncExternalStore(subscribeTasks, getTasks, getTasks);
}

export function useTask(id: ID): Task | undefined {
  const list = useTasks();
  return list.find((t) => t.id === id);
}

/**
 * ManualEvent store — pub/sub + localStorage.
 * task/habit 발 가상 이벤트는 저장하지 않음 (selector 합성).
 */

import { useSyncExternalStore } from 'react';
import type { ManualEvent, ID } from './types';
import { loadList, saveList, newEntityId, bumpIndex, onExternalChange, storageKey } from './storage';

const STORAGE_NAME = 'events';

let _cache: ManualEvent[] | null = null;
const _listeners = new Set<() => void>();

function ensure(): ManualEvent[] {
  if (_cache === null) _cache = loadList<ManualEvent>(STORAGE_NAME);
  return _cache;
}

function commit(next: ManualEvent[]): void {
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

export function getEvents(): ManualEvent[] {
  return ensure();
}

export function getEvent(id: ID): ManualEvent | undefined {
  return ensure().find((e) => e.id === id);
}

export function addEvent(input: {
  title: string;
  start: number;
  end?: number;
  allDay?: boolean;
  rrule?: string;
  goalId?: ID;
  color?: string;
}): ManualEvent {
  const now = Date.now();
  const e: ManualEvent = {
    id: newEntityId('e'),
    title: input.title,
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    rrule: input.rrule,
    goalId: input.goalId,
    color: input.color,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  commit([...ensure(), e]);
  return e;
}

export function updateEvent(id: ID, patch: Partial<Omit<ManualEvent, 'id' | 'createdAt' | 'version' | 'source'>>): void {
  commit(ensure().map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)));
}

export function removeEvent(id: ID): void {
  commit(ensure().filter((e) => e.id !== id));
}

export function detachEventsFromGoal(goalId: ID): void {
  commit(ensure().map((e) => (e.goalId === goalId ? { ...e, goalId: undefined, updatedAt: Date.now() } : e)));
}

export function subscribeEvents(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function useEvents(): ManualEvent[] {
  return useSyncExternalStore(subscribeEvents, getEvents, getEvents);
}

export function useEvent(id: ID): ManualEvent | undefined {
  const list = useEvents();
  return list.find((e) => e.id === id);
}

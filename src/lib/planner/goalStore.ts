/**
 * Goal store — pub/sub + localStorage.
 * 패턴: cache + listeners. mySpaceStore 와 동일 결.
 */

import { useSyncExternalStore } from 'react';
import type { Goal, ID } from './types';
import { loadList, saveList, newEntityId, bumpIndex, onExternalChange, storageKey } from './storage';

const STORAGE_NAME = 'goals';

let _cache: Goal[] | null = null;
const _listeners = new Set<() => void>();

function ensure(): Goal[] {
  if (_cache === null) _cache = loadList<Goal>(STORAGE_NAME);
  return _cache;
}

function commit(next: Goal[]): void {
  _cache = next;
  saveList(STORAGE_NAME, next);
  bumpIndex();
  _listeners.forEach((l) => l());
}

// ── 외부 탭 변경 감지 → cache 무효화 ──
onExternalChange((key) => {
  if (key === storageKey(STORAGE_NAME)) {
    _cache = null;
    bumpIndex();
    _listeners.forEach((l) => l());
  }
});

// ── CRUD ──
export function getGoals(): Goal[] {
  return ensure();
}

export function getGoal(id: ID): Goal | undefined {
  return ensure().find((g) => g.id === id);
}

export function addGoal(input: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Goal {
  const now = Date.now();
  const g: Goal = { ...input, id: newEntityId('g'), createdAt: now, updatedAt: now, version: 1 };
  commit([...ensure(), g]);
  return g;
}

export function updateGoal(id: ID, patch: Partial<Omit<Goal, 'id' | 'createdAt' | 'version'>>): void {
  commit(ensure().map((g) => (g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g)));
}

export function removeGoal(id: ID): void {
  commit(ensure().filter((g) => g.id !== id));
  // cascade: 연결된 task·habit·event 의 goalId 자동 비우기는
  // 각 store 의 helper 에 위임 (순환 import 방지). selectors 가 graceful 처리.
  // 실무: removeGoalCascade 를 selectors.ts 또는 sync.ts 에서 별도 export.
}

// ── 구독 ──
export function subscribeGoals(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

// ── React hook ──
export function useGoals(): Goal[] {
  return useSyncExternalStore(subscribeGoals, getGoals, getGoals);
}

export function useGoal(id: ID): Goal | undefined {
  const list = useGoals();
  return list.find((g) => g.id === id);
}

/**
 * 사용자 분류함(TaskList) store — LocalStorage 기반.
 *
 * 메모 폴더와 별개 — 도메인 분리 (메모는 폴더, 플래너는 list).
 * 변경 broadcast: PLANNER_LIST_CHANGED.
 */
import { TaskList, TaskListColor, PLANNER_LIST_CHANGED } from '@/types/planner';

const STORAGE_KEY = 'planner.lists.v1';

const safeRead = (): TaskList[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TaskList[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (lists: TaskList[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    window.dispatchEvent(new CustomEvent(PLANNER_LIST_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const taskListStore = {
  /** 모든 list (order 오름차순). */
  list(): TaskList[] {
    return [...safeRead()].sort((a, b) => a.order - b.order);
  },

  find(id: string): TaskList | undefined {
    return safeRead().find((l) => l.id === id);
  },

  add(input: { name: string; emoji?: string; color: TaskListColor }): TaskList {
    const all = safeRead();
    const order = all.length > 0 ? Math.max(...all.map((l) => l.order)) + 1 : 0;
    const next: TaskList = {
      id: newId(),
      name: input.name.trim() || '새 분류',
      emoji: input.emoji,
      color: input.color,
      order,
      createdAt: new Date().toISOString(),
    };
    safeWrite([...all, next]);
    return next;
  },

  update(id: string, patch: Partial<Omit<TaskList, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  toggleHidden(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], hidden: !all[idx].hidden };
    safeWrite(all);
  },

  showAll(): void {
    const all = safeRead();
    safeWrite(all.map((l) => ({ ...l, hidden: false })));
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((l) => l.id !== id));
  },

  reorder(ids: string[]): void {
    const all = safeRead();
    const map = new Map(all.map((l) => [l.id, l]));
    const result: TaskList[] = [];
    ids.forEach((id, idx) => {
      const item = map.get(id);
      if (item) {
        result.push({ ...item, order: idx });
        map.delete(id);
      }
    });
    // 못 찾은 것들 끝에 추가 (안전 fallback).
    map.forEach((item) => result.push(item));
    safeWrite(result);
  },
};

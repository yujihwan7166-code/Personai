import type { Priority, TaskListColor } from '@/types/planner';

export type PlannerLibraryKind = 'task' | 'event';

export interface PlannerLibraryItem {
  id: string;
  kind: PlannerLibraryKind;
  title: string;
  durationMin: number;
  color?: TaskListColor;
  priority?: Priority;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const PLANNER_LIBRARY_CHANGED = 'planner:library-changed';

const STORAGE_KEY = 'planner.library.v1';

const DEFAULT_ITEMS: PlannerLibraryItem[] = [
  {
    id: 'lib_default_study',
    kind: 'task',
    title: '공부 1시간',
    durationMin: 60,
    color: 'violet',
    priority: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lib_default_reading',
    kind: 'task',
    title: '독서 30분',
    durationMin: 30,
    color: 'blue',
    priority: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lib_default_workout',
    kind: 'task',
    title: '운동 30분',
    durationMin: 30,
    color: 'green',
    priority: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lib_default_meeting',
    kind: 'task',
    title: '회의 30분',
    durationMin: 30,
    color: 'amber',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const isValidItem = (value: unknown): value is PlannerLibraryItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && (item.kind === 'task' || item.kind === 'event')
    && typeof item.title === 'string'
    && typeof item.durationMin === 'number'
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string';
};

const sanitize = (item: PlannerLibraryItem): PlannerLibraryItem => ({
  ...item,
  title: item.title.trim() || '새 템플릿',
  durationMin: Number.isFinite(item.durationMin)
    ? Math.min(12 * 60, Math.max(15, Math.round(item.durationMin / 15) * 15))
    : 60,
});

const safeRead = (): PlannerLibraryItem[] => {
  if (typeof window === 'undefined') return DEFAULT_ITEMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
      return DEFAULT_ITEMS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ITEMS;
    return parsed.filter(isValidItem).map(sanitize);
  } catch {
    return DEFAULT_ITEMS;
  }
};

const safeWrite = (items: PlannerLibraryItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(sanitize)));
  window.dispatchEvent(new CustomEvent(PLANNER_LIBRARY_CHANGED));
};

const newId = () =>
  `lib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const plannerLibraryStore = {
  list(): PlannerLibraryItem[] {
    return safeRead().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  add(input: Omit<PlannerLibraryItem, 'id' | 'createdAt' | 'updatedAt'>): PlannerLibraryItem {
    const now = new Date().toISOString();
    const item = sanitize({
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    });
    safeWrite([item, ...safeRead()]);
    return item;
  },

  update(id: string, patch: Partial<Omit<PlannerLibraryItem, 'id' | 'createdAt'>>): void {
    const items = safeRead();
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return;
    items[idx] = sanitize({ ...items[idx], ...patch, updatedAt: new Date().toISOString() });
    safeWrite(items);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((item) => item.id !== id));
  },
};

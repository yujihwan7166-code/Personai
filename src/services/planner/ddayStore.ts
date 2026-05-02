/**
 * D-day store — 시험/발표/생일/마감 같은 별도 날짜 카운트다운.
 *
 * task / event 와 분리된 단순 CRUD. localStorage 기반.
 * dateIso 는 'YYYY-MM-DD' 로컬 키 (시간 없음).
 */
import { PlannerDday, PLANNER_DDAY_CHANGED } from '@/types/planner';

const STORAGE_KEY = 'planner.ddays.v1';

const safeRead = (): PlannerDday[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerDday[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (items: PlannerDday[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(PLANNER_DDAY_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `dday_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const ddayStore = {
  /** 모든 D-day — 가까운 순 (오늘이 D-0, 미래는 양수 순). */
  list(): PlannerDday[] {
    return [...safeRead()].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  },

  add(input: { label: string; dateIso: string }): PlannerDday {
    const next: PlannerDday = {
      id: newId(),
      label: input.label.trim(),
      dateIso: input.dateIso,
      createdAt: new Date().toISOString(),
    };
    safeWrite([...safeRead(), next]);
    return next;
  },

  update(id: string, patch: Partial<Omit<PlannerDday, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((d) => d.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((d) => d.id !== id));
  },

  clear(): void {
    safeWrite([]);
  },
};

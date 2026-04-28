/**
 * 캘린더 일정(Event) 영속 store — LocalStorage 기반.
 *
 * - vanilla module: React 외부에서도 import 후 호출 가능.
 * - 변경 시 PLANNER_EVENT_CHANGED 커스텀 이벤트 broadcast.
 *   훅(usePlannerToday 등)이 listen 해서 자동 re-render.
 *
 * 주의: 직접 호출보다는 훅(useEvents) 사용 권장.
 */
import { PlannerEvent, PLANNER_EVENT_CHANGED } from '@/types/planner';

const STORAGE_KEY = 'planner.events.v1';

const safeRead = (): PlannerEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerEvent[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (events: PlannerEvent[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent(PLANNER_EVENT_CHANGED));
  } catch {
    /* quota / serialization fail — silent */
  }
};

const newId = (): string =>
  `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const eventStore = {
  /** 모든 이벤트 (생성 시각 오름차순). */
  list(): PlannerEvent[] {
    return [...safeRead()].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    );
  },

  /** 특정 날짜(YYYY-MM-DD)의 이벤트만 (시작 시각 오름차순). */
  listByDate(dateIso: string): PlannerEvent[] {
    const dayPrefix = dateIso.slice(0, 10);
    return safeRead()
      .filter((e) => e.startAt.slice(0, 10) === dayPrefix)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  /** 새 이벤트 추가. id/createdAt 자동 생성. */
  add(input: Omit<PlannerEvent, 'id' | 'createdAt'>): PlannerEvent {
    const next: PlannerEvent = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    safeWrite([...safeRead(), next]);
    return next;
  },

  /** 부분 업데이트. id 일치 항목 못 찾으면 no-op. */
  update(id: string, patch: Partial<Omit<PlannerEvent, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  /** 삭제. */
  remove(id: string): void {
    safeWrite(safeRead().filter((e) => e.id !== id));
  },

  /** 전체 삭제 (테스트·리셋용). */
  clear(): void {
    safeWrite([]);
  },
};

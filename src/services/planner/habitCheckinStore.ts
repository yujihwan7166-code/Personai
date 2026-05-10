/**
 * 습관 체크인 스토어 — localStorage 기반.
 *
 * 한 (habitId, date) 쌍은 하나의 row 만 존재. count 누적은 update.
 * 변경 시 HABIT_CHECKIN_CHANGED broadcast.
 */
import {
  HABIT_CHECKIN_CHANGED, type HabitCheckin,
} from '@/types/habit';

const STORAGE_KEY = 'personai-habit-checkins-v1';

const safeRead = (): HabitCheckin[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const commit = (next: HabitCheckin[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('[habitCheckinStore] commit 실패:', err);
    import('@/lib/notify').then(({ notify }) => {
      notify.error('체크인 저장 실패 — 저장 공간이 부족할 수 있어요');
    }).catch(() => { /* silent */ });
    return;
  }
  window.dispatchEvent(new CustomEvent(HABIT_CHECKIN_CHANGED));
};

const newId = () => `hc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const habitCheckinStore = {
  /** 전체 — 분석/내보내기용. */
  list(): HabitCheckin[] {
    return safeRead();
  },

  /** 한 habit + 날짜 범위 [start, end] (inclusive, YYYY-MM-DD). */
  range(habitId: string, startDate: string, endDate: string): HabitCheckin[] {
    return safeRead().filter(
      (c) => c.habitId === habitId && c.date >= startDate && c.date <= endDate,
    );
  },

  /** 한 habit 의 모든 체크인 (날짜순). */
  byHabit(habitId: string): HabitCheckin[] {
    return safeRead()
      .filter((c) => c.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /** (habitId, date) 단일 row. */
  get(habitId: string, date: string): HabitCheckin | undefined {
    return safeRead().find((c) => c.habitId === habitId && c.date === date);
  },

  /** 한 날짜의 모든 habit 체크인 — 사이드바 위젯·타임라인용. */
  byDate(date: string): HabitCheckin[] {
    return safeRead().filter((c) => c.date === date);
  },

  /**
   * 토글 — count 모드에 따라:
   *   - timesPerDay <= 1: row 있으면 삭제, 없으면 count=1 생성
   *   - timesPerDay > 1: 있으면 count+1 (max 도달 시 삭제), 없으면 count=1 생성
   */
  toggle(habitId: string, date: string, timesPerDay = 1): void {
    const all = safeRead();
    const idx = all.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1) {
      const row: HabitCheckin = {
        id: newId(),
        habitId,
        date,
        count: 1,
        createdAt: new Date().toISOString(),
      };
      commit([row, ...all]);
      return;
    }
    const existing = all[idx];
    const cur = existing.count ?? 1;
    if (timesPerDay > 1 && cur < timesPerDay) {
      const next = [...all];
      next[idx] = { ...existing, count: cur + 1 };
      commit(next);
      return;
    }
    // 단일 모드 또는 max 도달 → 삭제 (해제).
    commit(all.filter((_, i) => i !== idx));
  },

  /** 정확한 count 설정 (회고 직접 입력용). 0 이면 삭제. */
  setCount(habitId: string, date: string, count: number): void {
    const all = safeRead();
    const idx = all.findIndex((c) => c.habitId === habitId && c.date === date);
    if (count <= 0) {
      if (idx === -1) return;
      commit(all.filter((_, i) => i !== idx));
      return;
    }
    if (idx === -1) {
      commit([
        { id: newId(), habitId, date, count, createdAt: new Date().toISOString() },
        ...all,
      ]);
      return;
    }
    const next = [...all];
    next[idx] = { ...all[idx], count };
    commit(next);
  },

  /** 메모 저장 (체크인 row 없으면 생성). */
  setNote(habitId: string, date: string, note: string): void {
    const all = safeRead();
    const idx = all.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1) {
      if (!note.trim()) return;
      commit([
        { id: newId(), habitId, date, count: 0, note, createdAt: new Date().toISOString() },
        ...all,
      ]);
      return;
    }
    const next = [...all];
    next[idx] = { ...all[idx], note };
    commit(next);
  },

  /** habit 삭제 시 그 habit 의 체크인 일괄 제거. */
  removeAllForHabit(habitId: string): void {
    commit(safeRead().filter((c) => c.habitId !== habitId));
  },
};

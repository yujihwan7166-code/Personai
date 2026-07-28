/**
 * 습관 스토어 — localStorage 기반.
 *
 * 변경 시 HABIT_CHANGED 이벤트 broadcast → 훅이 자동 re-render.
 * sortOrder 로 정렬 유지 (drag 재정렬 시 sortOrder 만 갱신).
 */
import { HABIT_CHANGED, type Habit, type HabitSchedule } from '@/types/habit';

const STORAGE_KEY = 'personai-habits-v1';

const safeRead = (): Habit[] => {
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

const commit = (next: Habit[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    // quota 초과·serialize 실패 등 — 사용자 알림 + 콘솔. silent 면 데이터 유실을 모름.
    console.error('[habitStore] commit 실패:', err);
    import('@/lib/notify').then(({ notify }) => {
      notify.error('습관 저장 실패 — 저장 공간이 부족할 수 있어요');
    }).catch(() => { /* notify 자체 실패 — 가능성 낮음 */ });
    return;
  }
  window.dispatchEvent(new CustomEvent(HABIT_CHANGED));
};

const newId = () => `hb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const sortHabits = (arr: Habit[]): Habit[] =>
  [...arr].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const habitStore = {
  list(): Habit[] {
    return sortHabits(safeRead());
  },

  /** active (보관 안 된) 만. */
  listActive(): Habit[] {
    return sortHabits(safeRead().filter((h) => !h.archived));
  },

  find(id: string): Habit | undefined {
    return safeRead().find((h) => h.id === id);
  },

  add(initial: {
    title: string;
    emoji: string;
    color: Habit['color'];
    goalKind?: Habit['goalKind'];
    schedule: HabitSchedule;
    unit?: string;
    reminders?: string[];
    startDate?: string;
    endDate?: string;
    notes?: string;
    category?: string;
  }): Habit {
    const now = Date.now();
    const all = safeRead();
    const maxOrder = all.reduce((m, h) => Math.max(m, h.sortOrder), 0);
    const habit: Habit = {
      id: newId(),
      title: initial.title.trim(),
      emoji: initial.emoji,
      color: initial.color,
      goalKind: initial.goalKind ?? 'do',
      schedule: initial.schedule,
      unit: initial.unit,
      reminders: initial.reminders,
      startDate: initial.startDate ?? todayKey(),
      endDate: initial.endDate,
      archived: false,
      pinned: false,
      sortOrder: maxOrder + 10,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      category: initial.category,
      notes: initial.notes,
    };
    commit([habit, ...all]);
    return habit;
  },

  update(id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>): void {
    commit(
      safeRead().map((h) =>
        h.id === id
          ? { ...h, ...patch, updatedAt: new Date().toISOString() }
          : h,
      ),
    );
  },

  remove(id: string): void {
    commit(safeRead().filter((h) => h.id !== id));
  },

  /** 지운 습관을 그대로 되돌린다 — id·체크인 기록까지 통째로. 이미 있으면 아무 일도 없다. */
  restore(habit: Habit): void {
    const all = safeRead();
    if (all.some((h) => h.id === habit.id)) return;
    commit([...all, habit]);
  },

  togglePinned(id: string): void {
    const h = this.find(id);
    if (!h) return;
    this.update(id, { pinned: !h.pinned });
  },

  archive(id: string): void {
    this.update(id, { archived: true, archivedAt: new Date().toISOString() });
  },

  unarchive(id: string): void {
    this.update(id, { archived: false, archivedAt: undefined });
  },

  /** 보관함 (archived = true) 만. 보관 시점 최신순. */
  listArchived(): Habit[] {
    return safeRead()
      .filter((h) => h.archived)
      .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  },

  /** drag 재정렬 — orderedIds 순서대로 sortOrder 재할당. */
  reorder(orderedIds: string[]): void {
    const map = new Map(orderedIds.map((id, idx) => [id, (idx + 1) * 10]));
    commit(
      safeRead().map((h) =>
        map.has(h.id)
          ? { ...h, sortOrder: map.get(h.id)!, updatedAt: new Date().toISOString() }
          : h,
      ),
    );
  },
};

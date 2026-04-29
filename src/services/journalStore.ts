/**
 * 일기 영속 store — LocalStorage 기반.
 *
 * planner store 패턴 동일:
 * - vanilla module (React 외부에서도 호출 가능)
 * - 변경 시 JOURNAL_CHANGED 커스텀 이벤트 broadcast → 훅 자동 re-render
 */
import { JournalEntry, Mood, BodyFormat, JournalImage, JOURNAL_CHANGED } from '@/types/journal';

const STORAGE_KEY = 'journal.entries.v1';

const safeRead = (): JournalEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (entries: JournalEntry[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED));
  } catch {
    /* quota / serialization fail — silent */
  }
};

const newId = (): string =>
  `jr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const journalStore = {
  /** 모든 항목 (createdAt 내림차순 — 최신 먼저). */
  list(): JournalEntry[] {
    return [...safeRead()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  /** 특정 날짜(YYYY-MM-DD)의 항목들 (createdAt 내림차순). */
  listByDate(dateYYYYMMDD: string): JournalEntry[] {
    return safeRead()
      .filter((e) => e.date === dateYYYYMMDD)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 오늘 가장 최근 항목 (편집 빠른 진입용). 없으면 null. */
  getLatestToday(): JournalEntry | null {
    const today = new Date().toISOString().slice(0, 10);
    const list = this.listByDate(today);
    return list.length > 0 ? list[0] : null;
  },

  add(input: {
    body: string;
    mood?: Mood;
    date?: string;
    tags?: string[];
    bodyFormat?: BodyFormat;
    images?: JournalImage[];
  }): JournalEntry {
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: newId(),
      date: input.date ?? now.slice(0, 10),
      body: input.body,
      mood: input.mood,
      tags: input.tags,
      bodyFormat: input.bodyFormat,
      images: input.images,
      createdAt: now,
      updatedAt: now,
    };
    safeWrite([...safeRead(), entry]);
    return entry;
  },

  update(id: string, patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    safeWrite(all);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((e) => e.id !== id));
  },

  /** 전체 삭제 (테스트·리셋용). */
  clear(): void {
    safeWrite([]);
  },
};

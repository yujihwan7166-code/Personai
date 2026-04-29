/**
 * AI 요약 캐시 store — LocalStorage.
 *
 * 같은 기간 (week/month + startDate) 의 AI 요약 결과 캐시.
 * 사용자가 '다시 생성' 클릭 시 cache 무효화.
 */

export interface JournalSummary {
  id: string;
  period: 'week' | 'month';
  /** 'YYYY-MM-DD' 시작일 (캐시 키). */
  startDate: string;
  endDate: string;
  summary: string;
  highlights?: string[];
  model?: string;
  tokensUsed?: number;
  createdAt: string;
}

const STORAGE_KEY = 'journal.summaries.v1';
export const JOURNAL_SUMMARY_CHANGED = 'journal:summary:changed';

const safeRead = (): JournalSummary[] => {
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

const safeWrite = (items: JournalSummary[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(JOURNAL_SUMMARY_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `sum_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const journalSummaryStore = {
  /** 같은 기간 캐시 조회. */
  find(period: 'week' | 'month', startDate: string): JournalSummary | null {
    const list = safeRead();
    return list.find((s) => s.period === period && s.startDate === startDate) ?? null;
  },

  /** 추가 또는 같은 기간 덮어쓰기 (재생성). */
  upsert(input: Omit<JournalSummary, 'id' | 'createdAt'>): JournalSummary {
    const all = safeRead();
    const existing = all.findIndex((s) => s.period === input.period && s.startDate === input.startDate);
    const next: JournalSummary = {
      ...input,
      id: existing >= 0 ? all[existing].id : newId(),
      createdAt: new Date().toISOString(),
    };
    if (existing >= 0) {
      all[existing] = next;
    } else {
      all.push(next);
    }
    safeWrite(all);
    return next;
  },

  remove(period: 'week' | 'month', startDate: string): void {
    safeWrite(safeRead().filter((s) => !(s.period === period && s.startDate === startDate)));
  },

  clear(): void {
    safeWrite([]);
  },
};

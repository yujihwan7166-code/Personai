/**
 * 일기 기간별 통계 — 이번 주 / 이번 달.
 */
import type { JournalEntry, Mood } from '@/types/journal';

export type StatsPeriod = 'week' | 'month';

export interface JournalStats {
  period: StatsPeriod;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;
  count: number;
  uniqueDays: number;
  totalDays: number;
  avgMood: number | null;
  topTags: Array<{ tag: string; count: number }>;
  moodTrend: Array<{ date: string; mood: Mood | null }>;
}

const startOfWeek = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // 일요일 시작
  return x;
};

const startOfMonth = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x;
};

const formatYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const computeStats = (entries: JournalEntry[], period: StatsPeriod, anchor: Date = new Date()): JournalStats => {
  const start = period === 'week' ? startOfWeek(anchor) : startOfMonth(anchor);
  const end = new Date(start);
  if (period === 'week') {
    end.setDate(start.getDate() + 7);
  } else {
    end.setMonth(start.getMonth() + 1);
  }

  const filtered = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d < end;
  });

  const totalDays = period === 'week' ? 7 : new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  const uniqueDays = new Set(filtered.map((e) => e.date)).size;

  const moodValues = filtered.map((e) => e.mood).filter((m): m is Mood => m !== undefined);
  const avgMood = moodValues.length > 0
    ? moodValues.reduce((s, m) => s + m, 0) / moodValues.length
    : null;

  // Top 태그 (해당 기간)
  const tagCounts = new Map<string, number>();
  filtered.forEach((e) => {
    (e.tags ?? []).forEach((t) => {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    });
  });
  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 일별 mood (그래프용)
  const moodByDate = new Map<string, Mood>();
  filtered.forEach((e) => {
    if (e.mood !== undefined) moodByDate.set(e.date, e.mood);
  });
  const moodTrend: Array<{ date: string; mood: Mood | null }> = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const key = formatYMD(cursor);
    moodTrend.push({ date: key, mood: moodByDate.get(key) ?? null });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    period,
    startDate: formatYMD(start),
    endDate: formatYMD(new Date(end.getTime() - 1)),
    count: filtered.length,
    uniqueDays,
    totalDays,
    avgMood,
    topTags,
    moodTrend,
  };
};

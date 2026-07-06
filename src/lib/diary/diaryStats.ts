import type { DiaryEntry, FeelingGroup } from '@/types/diary';
import { getFeeling, GROUPS } from '@/lib/diary/feelings';

export function monthEntries(all: DiaryEntry[], year: number, month1: number): DiaryEntry[] {
  const mm = String(month1).padStart(2, '0');
  const prefix = `${year}-${mm}`;
  return all.filter((e) => e.date.startsWith(prefix));
}

/** 대표 감정 기준 계열별 카운트. */
export function groupDistribution(entries: DiaryEntry[]): Record<FeelingGroup, number> {
  const dist = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<FeelingGroup, number>;
  for (const e of entries) {
    const f = getFeeling(e.primaryFeeling);
    if (f) dist[f.group] += 1;
  }
  return dist;
}

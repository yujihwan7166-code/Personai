import { describe, it, expect } from 'vitest';
import { groupDistribution, monthEntries } from '@/lib/diary/diaryStats';
import type { DiaryEntry } from '@/types/diary';

const mk = (date: string, primary?: string): DiaryEntry => ({ id: date + (primary ?? ''), date, body: [], feelings: primary ? [primary] : [], primaryFeeling: primary, createdAt: '', updatedAt: '' });

describe('diaryStats', () => {
  it('이달 엔트리 필터', () => {
    const all = [mk('2026-07-01', 'haengbok'), mk('2026-06-30', 'uul')];
    expect(monthEntries(all, 2026, 7)).toHaveLength(1);
  });
  it('계열 분포 집계', () => {
    const all = [mk('2026-07-01', 'haengbok'), mk('2026-07-02', 'seollem'), mk('2026-07-03', 'uul')];
    const dist = groupDistribution(all);
    expect(dist.joy).toBe(2);
    expect(dist.sad).toBe(1);
    expect(dist.anger).toBe(0);
  });
});

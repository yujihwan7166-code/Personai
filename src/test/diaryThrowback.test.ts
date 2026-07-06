import { describe, it, expect } from 'vitest';
import { throwbackEntries } from '@/lib/diary/throwback';
import type { DiaryEntry } from '@/types/diary';

const mk = (date: string): DiaryEntry => ({ id: date, date, body: [], feelings: [], createdAt: '', updatedAt: '' });

describe('throwbackEntries', () => {
  it('같은 월-일, 과거 연도만', () => {
    const all = [mk('2025-07-06'), mk('2024-07-06'), mk('2026-07-06'), mk('2025-07-05')];
    const res = throwbackEntries(all, new Date('2026-07-06T09:00:00'));
    expect(res.map((e) => e.date)).toEqual(['2025-07-06', '2024-07-06']);
  });
});

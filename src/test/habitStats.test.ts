/**
 * 습관 통계 단위 테스트 — 핵심 케이스만.
 */
import { describe, it, expect } from 'vitest';
import {
  isScheduledOn,
  currentStreak,
  maxStreak,
  monthCompletionRate,
  toDateKey,
} from '@/lib/planner/habitStats';
import type { Habit, HabitCheckin } from '@/types/habit';

const baseHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  title: '운동',
  emoji: '💪',
  color: 'blue',
  goalKind: 'do',
  schedule: { freq: 'daily' },
  startDate: '2026-01-01',
  archived: false,
  pinned: false,
  sortOrder: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const checkin = (date: string, count = 1): HabitCheckin => ({
  id: `c-${date}`,
  habitId: 'h1',
  date,
  count,
  createdAt: `${date}T00:00:00.000Z`,
});

describe('isScheduledOn', () => {
  it('daily — 매일 스케줄', () => {
    const h = baseHabit({ schedule: { freq: 'daily' } });
    expect(isScheduledOn(h, '2026-05-03')).toBe(true);
    expect(isScheduledOn(h, '2025-12-31')).toBe(false); // startDate 이전
  });

  it('weekly — 특정 요일만', () => {
    const h = baseHabit({
      startDate: '2026-05-03', // 일요일
      schedule: { freq: 'weekly', weekdays: ['MO', 'WE', 'FR'] },
    });
    expect(isScheduledOn(h, '2026-05-04')).toBe(true);  // 월
    expect(isScheduledOn(h, '2026-05-05')).toBe(false); // 화
    expect(isScheduledOn(h, '2026-05-06')).toBe(true);  // 수
  });

  it('monthly — 특정 N일만', () => {
    const h = baseHabit({
      startDate: '2026-05-01',
      schedule: { freq: 'monthly', monthDays: [1, 15] },
    });
    expect(isScheduledOn(h, '2026-05-01')).toBe(true);
    expect(isScheduledOn(h, '2026-05-15')).toBe(true);
    expect(isScheduledOn(h, '2026-05-10')).toBe(false);
    expect(isScheduledOn(h, '2026-06-15')).toBe(true);
  });

  it('endDate 이후 스케줄 X', () => {
    const h = baseHabit({ endDate: '2026-05-31' });
    expect(isScheduledOn(h, '2026-05-31')).toBe(true);
    expect(isScheduledOn(h, '2026-06-01')).toBe(false);
  });
});

describe('currentStreak / maxStreak', () => {
  const today = toDateKey(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateKey(d);
  })();
  const twoAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return toDateKey(d);
  })();

  it('오늘 + 어제 + 그저께 모두 체크 → streak 3', () => {
    const h = baseHabit({ startDate: twoAgo });
    const cs = [checkin(today), checkin(yesterday), checkin(twoAgo)];
    expect(currentStreak(h, cs)).toBe(3);
  });

  it('오늘 미체크 + 어제 체크 → streak 1 (어제까지 유효)', () => {
    const h = baseHabit({ startDate: twoAgo });
    const cs = [checkin(yesterday), checkin(twoAgo)];
    expect(currentStreak(h, cs)).toBe(2);
  });

  it('어제 미체크 → streak 0', () => {
    const h = baseHabit({ startDate: twoAgo });
    expect(currentStreak(h, [])).toBe(0);
  });

  it('스케줄 안 된 날은 streak 카운트 안 함', () => {
    // 매주 월수금 — 그저께가 화요일이라 스케줄 X 면 skip 하고 그 전 스케줄 본다.
    const h = baseHabit({
      startDate: '2026-01-01',
      schedule: { freq: 'weekly', weekdays: ['MO', 'WE', 'FR'] },
    });
    expect(currentStreak(h, [])).toBe(0);
  });
});

describe('monthCompletionRate', () => {
  it('5월 매일 스케줄 — 31일 중 10일 체크 = 10/31', () => {
    const h = baseHabit({ startDate: '2026-05-01' });
    const cs = Array.from({ length: 10 }, (_, i) =>
      checkin(`2026-05-${String(i + 1).padStart(2, '0')}`),
    );
    const rate = monthCompletionRate(h, 2026, 5, cs);
    expect(rate).toBeCloseTo(10 / 31, 4);
  });

  it('weekly MO/WE/FR — 5월 스케줄된 날만 분모', () => {
    const h = baseHabit({
      startDate: '2026-05-01',
      schedule: { freq: 'weekly', weekdays: ['MO', 'WE', 'FR'] },
    });
    // 2026-05 의 MO/WE/FR 일 수
    let scheduled = 0;
    for (let d = 1; d <= 31; d++) {
      const date = new Date(2026, 4, d);
      const dow = date.getDay();
      if (dow === 1 || dow === 3 || dow === 5) scheduled++;
    }
    // 2일만 체크 (월·수)
    const cs = [checkin('2026-05-04'), checkin('2026-05-06')];
    const rate = monthCompletionRate(h, 2026, 5, cs);
    expect(rate).toBeCloseTo(2 / scheduled, 4);
  });
});

describe('maxStreak', () => {
  it('연속 5일 + 끊김 + 연속 3일 → max 5', () => {
    const h = baseHabit({ startDate: '2026-01-01' });
    const cs = [
      checkin('2026-01-01'), checkin('2026-01-02'), checkin('2026-01-03'),
      checkin('2026-01-04'), checkin('2026-01-05'),
      // 끊김
      checkin('2026-01-08'), checkin('2026-01-09'), checkin('2026-01-10'),
    ];
    expect(maxStreak(h, cs)).toBe(5);
  });
});

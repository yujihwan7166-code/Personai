/**
 * Planner timeKeys 헬퍼 — 회귀 방지.
 */
import { describe, it, expect } from 'vitest';
import {
  toDayKey, parseDayKey, isSameDay, addDays, shiftDayKey,
  isoToDayKey, combineDayAndTime, toHhMm,
} from '@/lib/planner/timeKeys';

describe('toDayKey / parseDayKey round-trip', () => {
  it('자정 날짜', () => {
    const d = new Date(2026, 4, 12, 0, 0, 0);
    expect(toDayKey(d)).toBe('2026-05-12');
    expect(parseDayKey('2026-05-12')?.toDateString()).toBe(d.toDateString());
  });

  it('잘못된 키 → null', () => {
    expect(parseDayKey('not-a-date')).toBeNull();
    expect(parseDayKey('2026/05/12')).toBeNull();
  });
});

describe('isSameDay', () => {
  it('같은 날 (시각 다름)', () => {
    expect(isSameDay(new Date(2026, 4, 12, 1, 0), new Date(2026, 4, 12, 23, 59))).toBe(true);
  });
  it('다른 날', () => {
    expect(isSameDay(new Date(2026, 4, 12), new Date(2026, 4, 13))).toBe(false);
  });
});

describe('addDays / shiftDayKey', () => {
  it('addDays +3', () => {
    const d = new Date(2026, 4, 12);
    expect(toDayKey(addDays(d, 3))).toBe('2026-05-15');
  });

  it('addDays 음수', () => {
    expect(toDayKey(addDays(new Date(2026, 4, 12), -5))).toBe('2026-05-07');
  });

  it('shiftDayKey 월 경계 (5-31 → 6-1)', () => {
    expect(shiftDayKey('2026-05-31', 1)).toBe('2026-06-01');
  });

  it('shiftDayKey 잘못된 키 → 빈 문자열', () => {
    expect(shiftDayKey('garbage', 1)).toBe('');
  });
});

describe('isoToDayKey', () => {
  it('ISO 시각 → 날짜 키 (로컬 변환 — 자정 가깝지 않은 시각만 안정)', () => {
    expect(isoToDayKey(new Date(2026, 4, 12, 14, 30))).toBe('2026-05-12');
  });
  it('잘못된 입력 → 빈 문자열', () => {
    expect(isoToDayKey('not iso')).toBe('');
  });
});

describe('combineDayAndTime / toHhMm', () => {
  it('일 + HH:MM', () => {
    const d = combineDayAndTime('2026-05-12', '14:30');
    expect(d).not.toBeNull();
    expect(toHhMm(d!)).toBe('14:30');
  });

  it('잘못된 시각 → null', () => {
    expect(combineDayAndTime('2026-05-12', '25:00')).toBeNull();
    expect(combineDayAndTime('2026-05-12', '14')).toBeNull();
  });

  it('toHhMm 자정', () => {
    expect(toHhMm(new Date(2026, 0, 1, 0, 0))).toBe('00:00');
  });
});

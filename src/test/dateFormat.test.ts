import { describe, it, expect } from 'vitest';
import {
  fmtMonthDay, fmtFullDate, fmtWeekdayShort, fmtWeekdayLong,
  fmtTime12, fmtTime24, fmtDateWithWeekday,
} from '@/lib/dateFormat';

// 2026-05-12 (화) 09:00
const d = new Date(2026, 4, 12, 15, 25);

describe('fmtMonthDay / fmtFullDate', () => {
  it('월/일', () => {
    expect(fmtMonthDay(d)).toBe('5월 12일');
  });
  it('년·월·일', () => {
    expect(fmtFullDate(d)).toBe('2026년 5월 12일');
  });
  it('잘못된 입력 → 빈 문자열', () => {
    expect(fmtMonthDay('not-a-date')).toBe('');
  });
});

describe('fmtWeekdayShort / Long', () => {
  it('한국 요일 1글자', () => {
    expect(fmtWeekdayShort(d)).toBe('화');
  });
  it('긴 요일', () => {
    expect(fmtWeekdayLong(d)).toBe('화요일');
  });
});

describe('fmtTime12 / fmtTime24', () => {
  it('오후 15:25 → 오후 3:25', () => {
    expect(fmtTime12(d)).toBe('오후 3:25');
  });
  it('자정 0시 → 오전 12:00', () => {
    expect(fmtTime12(new Date(2026, 4, 12, 0, 0))).toBe('오전 12:00');
  });
  it('정오 12시 → 오후 12:00', () => {
    expect(fmtTime12(new Date(2026, 4, 12, 12, 0))).toBe('오후 12:00');
  });
  it('24시간 패딩', () => {
    expect(fmtTime24(new Date(2026, 4, 12, 9, 5))).toBe('09:05');
  });
});

describe('fmtDateWithWeekday', () => {
  it('5월 12일 (화)', () => {
    expect(fmtDateWithWeekday(d)).toBe('5월 12일 (화)');
  });
});

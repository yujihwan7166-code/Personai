import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '@/lib/relativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-18T12:00:00Z').getTime();

  it('방금 전 (< 10초)', () => {
    expect(formatRelativeTime(now - 3_000, now)).toBe('방금 전');
  });
  it('초/분/시간/일', () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe('30초 전');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5분 전');
    expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe('3시간 전');
    expect(formatRelativeTime(now - 36 * 3600_000, now)).toBe('어제');
    expect(formatRelativeTime(now - 4 * 86400_000, now)).toBe('4일 전');
  });
  it('7일 이상 → 날짜', () => {
    const r = formatRelativeTime(now - 30 * 86400_000, now);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(r)).toBe(true);
  });
  it('미래', () => {
    expect(formatRelativeTime(now + 5 * 60_000, now)).toBe('5분 후');
    expect(formatRelativeTime(now + 2 * 86400_000, now)).toBe('2일 후');
  });
  it('잘못된 입력 → ""', () => {
    expect(formatRelativeTime('garbage', now)).toBe('');
  });
});

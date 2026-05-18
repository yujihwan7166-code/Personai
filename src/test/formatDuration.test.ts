import { describe, it, expect } from 'vitest';
import { formatDurationKr, formatDurationClock } from '@/lib/formatDuration';

describe('formatDurationKr', () => {
  it('단위 조합', () => {
    expect(formatDurationKr(0)).toBe('0초');
    expect(formatDurationKr(500)).toBe('500ms');
    expect(formatDurationKr(30 * 1000)).toBe('30초');
    expect(formatDurationKr(2 * 60 * 1000)).toBe('2분');
    expect(formatDurationKr(60 * 60 * 1000)).toBe('1시간');
    expect(formatDurationKr(24 * 60 * 60 * 1000)).toBe('1일');
  });
  it('복합', () => {
    expect(formatDurationKr(60 * 60 * 1000 + 20 * 60 * 1000)).toBe('1시간 20분');
    expect(formatDurationKr(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe('2일 3시간');
  });
  it('잘못된 입력', () => {
    expect(formatDurationKr(-1)).toBe('0초');
    expect(formatDurationKr(NaN)).toBe('0초');
  });
});

describe('formatDurationClock', () => {
  it('MM:SS', () => {
    expect(formatDurationClock(0)).toBe('00:00');
    expect(formatDurationClock(65 * 1000)).toBe('01:05');
  });
  it('HH:MM:SS', () => {
    expect(formatDurationClock((1 * 3600 + 2 * 60 + 3) * 1000)).toBe('01:02:03');
  });
});

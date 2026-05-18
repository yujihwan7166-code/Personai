import { describe, it, expect } from 'vitest';
import {
  formatCompactNumber, formatBytes, formatRelativeTime,
  formatDuration, formatPercent, truncateMiddle,
} from '@/lib/formatters';

describe('formatCompactNumber', () => {
  it('1000 미만 정수', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(999)).toBe('999');
  });
  it('K 단위', () => {
    expect(formatCompactNumber(1_000)).toBe('1K');
    expect(formatCompactNumber(1_500)).toBe('1.5K');
    expect(formatCompactNumber(999_000)).toBe('999K');
  });
  it('M / B 단위', () => {
    expect(formatCompactNumber(1_500_000)).toBe('1.5M');
    expect(formatCompactNumber(2_000_000_000)).toBe('2B');
  });
  it('음수', () => {
    expect(formatCompactNumber(-1_500)).toBe('-1.5K');
  });
});

describe('formatBytes', () => {
  it('0 / 작은 값', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('KB / MB / GB', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB');
    expect(formatBytes(1024 ** 3 * 2)).toBe('2 GB');
  });
});

describe('formatRelativeTime', () => {
  const base = new Date(2026, 4, 18, 12, 0, 0);
  it('방금 / N초', () => {
    expect(formatRelativeTime(base.getTime() - 2_000, base)).toBe('방금');
    expect(formatRelativeTime(base.getTime() - 30_000, base)).toBe('30초 전');
  });
  it('분 / 시간 / 일', () => {
    expect(formatRelativeTime(base.getTime() - 5 * 60_000, base)).toBe('5분 전');
    expect(formatRelativeTime(base.getTime() - 2 * 3_600_000, base)).toBe('2시간 전');
    expect(formatRelativeTime(base.getTime() - 3 * 86_400_000, base)).toBe('3일 전');
  });
  it('1주 이상 → 날짜', () => {
    const past = new Date(2026, 3, 1);
    const out = formatRelativeTime(past, base);
    // ko-KR locale 형식: '4월 1일' (정확 매칭 안정성 위해 contains)
    expect(out).toContain('4');
  });
});

describe('formatDuration', () => {
  it('MM:SS / HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(45)).toBe('00:45');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(3725)).toBe('01:02:05');
  });
  it('음수/NaN', () => {
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(NaN)).toBe('00:00');
  });
});

describe('formatPercent', () => {
  it('비율 0~1 자동 × 100', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0.123, 1)).toBe('12.3%');
  });
  it('이미 100 단위', () => {
    expect(formatPercent(72.5)).toBe('72.5%');
  });
});

describe('truncateMiddle', () => {
  it('짧으면 그대로', () => {
    expect(truncateMiddle('짧음', 10)).toBe('짧음');
  });
  it('길면 가운데 …', () => {
    const out = truncateMiddle('AVeryLongFileName.pdf', 12);
    expect(out).toContain('…');
    expect(out.length).toBeLessThanOrEqual(13);
  });
});

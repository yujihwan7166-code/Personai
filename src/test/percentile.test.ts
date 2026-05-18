import { describe, it, expect } from 'vitest';
import { percentile, p50, p90, summarize } from '@/lib/percentile';

describe('percentile', () => {
  it('p=0 → min, p=1 → max', () => {
    expect(percentile([1,2,3,4,5], 0)).toBe(1);
    expect(percentile([1,2,3,4,5], 1)).toBe(5);
  });
  it('p=0.5 → median (interpolation)', () => {
    expect(p50([1,2,3,4,5])).toBe(3);
    expect(p50([1,2,3,4])).toBe(2.5);
  });
  it('p90', () => {
    // 10 values 1..10 → idx = 0.9*9 = 8.1 → between 9 and 10
    expect(p90([1,2,3,4,5,6,7,8,9,10])).toBeCloseTo(9.1, 5);
  });
  it('빈 배열 → NaN', () => {
    expect(percentile([], 0.5)).toBeNaN();
  });
  it('단일 → 그 값', () => {
    expect(percentile([7], 0.9)).toBe(7);
  });
});

describe('summarize', () => {
  it('통계 요약', () => {
    const s = summarize([1,2,3,4,5]);
    expect(s.count).toBe(5);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.mean).toBe(3);
    expect(s.p50).toBe(3);
  });
  it('빈 배열 → NaN 들', () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.mean).toBeNaN();
  });
});

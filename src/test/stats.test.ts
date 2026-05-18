import { describe, it, expect } from 'vitest';
import { mean, median, percentile, stdev, minOf, maxOf } from '@/lib/stats';

describe('mean / median', () => {
  it('mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([])).toBe(0);
  });
  it('median 홀/짝', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('percentile', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('P50 = median', () => {
    expect(percentile(data, 50)).toBe(median(data));
  });
  it('P0 / P100', () => {
    expect(percentile(data, 0)).toBe(1);
    expect(percentile(data, 100)).toBe(10);
  });
  it('P25 / P75 (선형)', () => {
    expect(percentile(data, 25)).toBeCloseTo(3.25, 2);
    expect(percentile(data, 75)).toBeCloseTo(7.75, 2);
  });
});

describe('stdev', () => {
  it('알려진 값', () => {
    // [2,4,4,4,5,5,7,9] 표본 표준편차 ≈ 2.138
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it('단일 → 0', () => {
    expect(stdev([5])).toBe(0);
  });
});

describe('minOf / maxOf', () => {
  it('정상', () => {
    expect(minOf([3, 1, 4, 1, 5])).toBe(1);
    expect(maxOf([3, 1, 4, 1, 5])).toBe(5);
  });
  it('빈 → 0', () => {
    expect(minOf([])).toBe(0);
    expect(maxOf([])).toBe(0);
  });
});

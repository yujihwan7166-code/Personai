import { describe, it, expect } from 'vitest';
import { randomInt, randomPick, shuffle, sample, weightedPick } from '@/lib/randomUtils';

describe('randomInt', () => {
  it('범위 내', () => {
    for (let i = 0; i < 100; i++) {
      const n = randomInt(0, 10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
    }
  });
  it('min === max', () => {
    expect(randomInt(5, 5)).toBe(5);
  });
});

describe('randomPick', () => {
  it('빈 배열 → undefined', () => {
    expect(randomPick([])).toBeUndefined();
  });
  it('배열 안 원소', () => {
    const arr = [1, 2, 3];
    expect(arr).toContain(randomPick(arr));
  });
});

describe('shuffle', () => {
  it('같은 원소 (순서만 무작위)', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.slice().sort()).toEqual(arr);
    expect(shuffled).not.toBe(arr); // 새 배열
  });
});

describe('sample', () => {
  it('n=0 → []', () => {
    expect(sample([1, 2, 3], 0)).toEqual([]);
  });
  it('n >= length → 모두', () => {
    expect(sample([1, 2], 5)).toHaveLength(2);
  });
  it('중복 없음', () => {
    const out = sample([1, 2, 3, 4, 5], 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
});

describe('weightedPick', () => {
  it('단일 → 그 항목', () => {
    expect(weightedPick(['a'], [10])).toBe('a');
  });
  it('가중치 0 만 → undefined', () => {
    expect(weightedPick(['a', 'b'], [0, 0])).toBeUndefined();
  });
  it('길이 불일치 → undefined', () => {
    expect(weightedPick(['a'], [1, 2])).toBeUndefined();
  });
});

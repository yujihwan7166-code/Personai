import { describe, it, expect } from 'vitest';
import { range, rangeInclusive } from '@/lib/range';

describe('range', () => {
  it('1-arg', () => {
    expect(range(5)).toEqual([0,1,2,3,4]);
    expect(range(0)).toEqual([]);
  });
  it('2-arg', () => {
    expect(range(2, 5)).toEqual([2,3,4]);
  });
  it('step', () => {
    expect(range(0, 10, 2)).toEqual([0,2,4,6,8]);
  });
  it('negative step', () => {
    expect(range(5, 0, -1)).toEqual([5,4,3,2,1]);
  });
  it('step=0 → []', () => {
    expect(range(0, 10, 0)).toEqual([]);
  });
});

describe('rangeInclusive', () => {
  it('정방향', () => {
    expect(rangeInclusive(1, 3)).toEqual([1,2,3]);
  });
  it('역방향', () => {
    expect(rangeInclusive(3, 1)).toEqual([3,2,1]);
  });
  it('단일 값', () => {
    expect(rangeInclusive(5, 5)).toEqual([5]);
  });
});

import { describe, it, expect } from 'vitest';
import { sortedIndex, binarySearch, insertSorted } from '@/lib/binarySearch';

describe('sortedIndex', () => {
  it('빈 배열 → 0', () => {
    expect(sortedIndex([], 5)).toBe(0);
  });
  it('중간 위치', () => {
    expect(sortedIndex([1, 3, 5, 7], 4)).toBe(2);
    expect(sortedIndex([1, 3, 5, 7], 3)).toBe(1);
  });
  it('끝 / 시작', () => {
    expect(sortedIndex([1, 2, 3], 0)).toBe(0);
    expect(sortedIndex([1, 2, 3], 10)).toBe(3);
  });
});

describe('binarySearch', () => {
  it('찾으면 인덱스', () => {
    expect(binarySearch([1, 3, 5, 7, 9], 5)).toBe(2);
    expect(binarySearch([1, 3, 5, 7, 9], 1)).toBe(0);
    expect(binarySearch([1, 3, 5, 7, 9], 9)).toBe(4);
  });
  it('없으면 -1', () => {
    expect(binarySearch([1, 3, 5, 7], 4)).toBe(-1);
    expect(binarySearch([], 1)).toBe(-1);
  });
  it('커스텀 cmp (역순)', () => {
    const desc = (a: number, b: number) => b - a;
    expect(binarySearch([9, 7, 5, 3, 1], 5, desc)).toBe(2);
  });
});

describe('insertSorted', () => {
  it('정렬 유지', () => {
    const arr = [1, 3, 5];
    insertSorted(arr, 4);
    expect(arr).toEqual([1, 3, 4, 5]);
  });
  it('빈 배열', () => {
    const arr: number[] = [];
    insertSorted(arr, 7);
    expect(arr).toEqual([7]);
  });
});

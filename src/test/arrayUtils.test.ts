import { describe, it, expect } from 'vitest';
import { unique, uniqueBy, groupBy, chunk, flatten, intersection, difference, rotateIndex } from '@/lib/arrayUtils';

describe('unique', () => {
  it('원시 중복 제거', () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });
});

describe('uniqueBy', () => {
  it('객체 키 기준', () => {
    const out = uniqueBy([{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 1, n: 'c' }], (x) => x.id);
    expect(out).toEqual([{ id: 1, n: 'a' }, { id: 2, n: 'b' }]);
  });
});

describe('groupBy', () => {
  it('태그 기준 그룹', () => {
    const items = [{ tag: 'a', v: 1 }, { tag: 'b', v: 2 }, { tag: 'a', v: 3 }];
    const grouped = groupBy(items, (x) => x.tag);
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe('chunk', () => {
  it('N 개씩 분할', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('size 0/음수 → []', () => {
    expect(chunk([1, 2], 0)).toEqual([]);
  });
});

describe('flatten', () => {
  it('1 레벨', () => {
    expect(flatten([[1, 2], [3], [4, 5]])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('intersection / difference', () => {
  it('intersection', () => {
    expect(intersection([1, 2, 3, 4], [3, 4, 5])).toEqual([3, 4]);
  });
  it('difference', () => {
    expect(difference([1, 2, 3], [2])).toEqual([1, 3]);
  });
});

describe('rotateIndex', () => {
  it('정상 / 음수 / overflow', () => {
    expect(rotateIndex(3, 1)).toBe(1);
    expect(rotateIndex(3, -1)).toBe(2);
    expect(rotateIndex(3, 5)).toBe(2);
  });
  it('빈 배열 → -1', () => {
    expect(rotateIndex(0, 0)).toBe(-1);
  });
});

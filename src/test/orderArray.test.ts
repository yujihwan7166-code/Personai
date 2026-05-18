import { describe, it, expect } from 'vitest';
import { moveItem, moveUp, moveDown, sortByIdOrder } from '@/lib/orderArray';

describe('moveItem', () => {
  it('정상 이동', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3]);
  });
  it('from === to → 원본', () => {
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
  });
  it('overflow to → clamp', () => {
    expect(moveItem([1, 2, 3], 0, 100)).toEqual([2, 3, 1]);
  });
});

describe('moveUp / moveDown', () => {
  it('moveUp', () => {
    expect(moveUp([1, 2, 3], 2)).toEqual([1, 3, 2]);
  });
  it('moveUp 맨 위 — 그대로', () => {
    expect(moveUp([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });
  it('moveDown', () => {
    expect(moveDown([1, 2, 3], 0)).toEqual([2, 1, 3]);
  });
  it('moveDown 맨 아래 — 그대로', () => {
    expect(moveDown([1, 2, 3], 2)).toEqual([1, 2, 3]);
  });
});

describe('sortByIdOrder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('id 순서 적용', () => {
    expect(sortByIdOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
  it('id 누락 → 끝에 stable', () => {
    expect(sortByIdOrder(items, ['b']).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });
});

import { describe, it, expect } from 'vitest';
import { groupBy, sortBy, uniqBy, partition } from '@/lib/collection';

describe('groupBy', () => {
  it('키별 묶기', () => {
    const r = groupBy([{t:'a',v:1},{t:'b',v:2},{t:'a',v:3}], x => x.t);
    expect(r.a).toHaveLength(2);
    expect(r.b).toHaveLength(1);
  });
});

describe('sortBy', () => {
  it('asc 정렬', () => {
    expect(sortBy([3,1,2], x => x)).toEqual([1,2,3]);
  });
  it('desc 정렬', () => {
    expect(sortBy([1,3,2], x => x, 'desc')).toEqual([3,2,1]);
  });
  it('안정성 (동일 키 → 원래 순서)', () => {
    const arr = [{k:1,id:'a'},{k:1,id:'b'},{k:1,id:'c'}];
    expect(sortBy(arr, x => x.k).map(x=>x.id)).toEqual(['a','b','c']);
  });
});

describe('uniqBy', () => {
  it('중복 제거', () => {
    expect(uniqBy([{id:1},{id:2},{id:1}], x => x.id)).toHaveLength(2);
  });
});

describe('partition', () => {
  it('짝/홀', () => {
    const [even, odd] = partition([1,2,3,4], x => x % 2 === 0);
    expect(even).toEqual([2,4]);
    expect(odd).toEqual([1,3]);
  });
});

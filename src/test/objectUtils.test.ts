import { describe, it, expect } from 'vitest';
import { pick, omit, get, mapValues } from '@/lib/objectUtils';

describe('pick / omit', () => {
  const o = { a: 1, b: 2, c: 3 };
  it('pick', () => { expect(pick(o, ['a', 'c'])).toEqual({ a: 1, c: 3 }); });
  it('omit', () => { expect(omit(o, ['b'])).toEqual({ a: 1, c: 3 }); });
  it('pick — 없는 key 무시', () => {
    expect(pick(o, ['a', 'x' as 'a'])).toEqual({ a: 1 });
  });
});

describe('get (dot path)', () => {
  const o = { a: { b: { c: 42 } } };
  it('정상', () => { expect(get(o, 'a.b.c')).toBe(42); });
  it('일부 없음 → fallback', () => {
    expect(get(o, 'a.x.y', 'def')).toBe('def');
  });
  it('null 통과', () => {
    expect(get(null, 'a.b')).toBeUndefined();
  });
});

describe('mapValues', () => {
  it('값 변환', () => {
    expect(mapValues({ a: 1, b: 2 }, (v) => v * 10)).toEqual({ a: 10, b: 20 });
  });
});

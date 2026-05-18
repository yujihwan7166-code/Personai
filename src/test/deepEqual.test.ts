import { describe, it, expect } from 'vitest';
import { deepEqual } from '@/lib/deepEqual';

describe('deepEqual', () => {
  it('primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
  });
  it('null/undefined', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });
  it('객체 동등', () => {
    expect(deepEqual({a:1,b:{c:2}}, {a:1,b:{c:2}})).toBe(true);
    expect(deepEqual({a:1}, {a:1,b:2})).toBe(false);
  });
  it('배열', () => {
    expect(deepEqual([1,[2,3]], [1,[2,3]])).toBe(true);
    expect(deepEqual([1,2], [1,2,3])).toBe(false);
  });
  it('Date / RegExp', () => {
    expect(deepEqual(new Date(100), new Date(100))).toBe(true);
    expect(deepEqual(/a/gi, /a/gi)).toBe(true);
    expect(deepEqual(/a/, /b/)).toBe(false);
  });
  it('타입 mismatch', () => {
    expect(deepEqual([1,2], {0:1,1:2,length:2})).toBe(false);
  });
  it('순환 참조 — 무한 루프 X', () => {
    const a: any = { x: 1 }; a.self = a;
    const b: any = { x: 1 }; b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });
});

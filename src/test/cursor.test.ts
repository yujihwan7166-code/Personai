import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, paginate } from '@/lib/cursor';

describe('encode/decode cursor', () => {
  it('roundtrip', () => {
    expect(decodeCursor(encodeCursor(42))).toBe(42);
    expect(decodeCursor(encodeCursor(0))).toBe(0);
  });
  it('null/empty → 0', () => {
    expect(decodeCursor(null)).toBe(0);
    expect(decodeCursor('')).toBe(0);
    expect(decodeCursor('garbage')).toBe(0);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('첫 페이지', () => {
    const p = paginate(items, null, 10);
    expect(p.items).toEqual([0,1,2,3,4,5,6,7,8,9]);
    expect(p.hasMore).toBe(true);
    expect(p.nextCursor).not.toBeNull();
  });

  it('중간 페이지', () => {
    const p1 = paginate(items, null, 10);
    const p2 = paginate(items, p1.nextCursor, 10);
    expect(p2.items[0]).toBe(10);
    expect(p2.items.length).toBe(10);
  });

  it('마지막 페이지', () => {
    const p1 = paginate(items, null, 10);
    const p2 = paginate(items, p1.nextCursor, 10);
    const p3 = paginate(items, p2.nextCursor, 10);
    expect(p3.items).toEqual([20,21,22,23,24]);
    expect(p3.hasMore).toBe(false);
    expect(p3.nextCursor).toBeNull();
  });

  it('limit 0 → 최소 1', () => {
    const p = paginate(items, null, 0);
    expect(p.items.length).toBe(1);
  });

  it('빈 배열', () => {
    const p = paginate([], null, 10);
    expect(p.items).toEqual([]);
    expect(p.hasMore).toBe(false);
    expect(p.nextCursor).toBeNull();
  });
});

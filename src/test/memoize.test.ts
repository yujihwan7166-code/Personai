import { describe, it, expect, vi } from 'vitest';
import { memoize } from '@/lib/memoize';

describe('memoize', () => {
  it('같은 인자 → 캐시 hit (fn 1회만)', () => {
    const fn = vi.fn((n: number) => n * 2);
    const m = memoize(fn);
    expect(m(5)).toBe(10);
    expect(m(5)).toBe(10);
    expect(m(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('다른 인자 → 분리 캐시', () => {
    const fn = vi.fn((n: number) => n * 2);
    const m = memoize(fn);
    m(1); m(2); m(1); m(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('max 초과 → LRU evict', () => {
    const fn = vi.fn((n: number) => n);
    const m = memoize(fn, { max: 2 });
    m(1); m(2); m(3); // 1 evict
    m(1); // miss → fn 다시 호출
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('TTL 만료 후 재호출', async () => {
    const fn = vi.fn((n: number) => n);
    const m = memoize(fn, { ttlMs: 20 });
    m(1);
    await new Promise((r) => setTimeout(r, 30));
    m(1); // 만료 → 재호출
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clear / size', () => {
    const m = memoize((n: number) => n);
    m(1); m(2); m(3);
    expect(m.size()).toBe(3);
    m.clear();
    expect(m.size()).toBe(0);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { QueryCache } from '@/lib/queryCache';

describe('QueryCache', () => {
  it('fetch + cache hit', async () => {
    const c = new QueryCache<number>(1000);
    const fn = vi.fn(async () => 42);
    expect(await c.fetch('a', fn)).toBe(42);
    expect(await c.fetch('a', fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('TTL 만료 → 재 fetch', async () => {
    const c = new QueryCache<number>(100);
    const fn = vi.fn(async () => Math.random());
    await c.fetch('a', fn, 0);
    await c.fetch('a', fn, 50); // hit
    await c.fetch('a', fn, 200); // miss
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('dedupe in-flight', async () => {
    const c = new QueryCache<number>(1000);
    let resolve!: (v: number) => void;
    const fn = vi.fn(() => new Promise<number>(r => { resolve = r; }));
    const p1 = c.fetch('k', fn);
    const p2 = c.fetch('k', fn);
    resolve(7);
    expect(await p1).toBe(7);
    expect(await p2).toBe(7);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invalidate', async () => {
    const c = new QueryCache<number>(1000);
    const fn = vi.fn(async () => 1);
    await c.fetch('a', fn);
    c.invalidate('a');
    await c.fetch('a', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('subscribe', () => {
    const c = new QueryCache<number>(1000);
    const listener = vi.fn();
    const unsub = c.subscribe('a', listener);
    c.set('a', 10);
    expect(listener).toHaveBeenCalledWith(10);
    unsub();
    c.set('a', 20);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

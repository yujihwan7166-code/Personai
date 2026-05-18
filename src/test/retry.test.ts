import { describe, it, expect, vi } from 'vitest';
import { sleep, retry } from '@/lib/retry';

describe('sleep', () => {
  it('지정 시간 후 resolve', async () => {
    const start = Date.now();
    await sleep(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(20);
  });
  it('signal abort 시 reject', async () => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10);
    await expect(sleep(100, ctrl.signal)).rejects.toThrow();
  });
});

describe('retry', () => {
  it('첫 시도 성공', async () => {
    const fn = vi.fn(async () => 1);
    expect(await retry(fn, { retries: 3 })).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('실패 후 재시도', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      if (++n < 3) throw new Error('x');
      return 'ok';
    });
    expect(await retry(fn, { retries: 3, baseDelayMs: 1 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('shouldRetry=false → 즉시 throw', async () => {
    const fn = vi.fn(async () => { throw new Error('fatal'); });
    await expect(retry(fn, { retries: 5, baseDelayMs: 1, shouldRetry: () => false }))
      .rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('모두 실패 → 마지막 에러', async () => {
    const fn = vi.fn(async () => { throw new Error('boom'); });
    await expect(retry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

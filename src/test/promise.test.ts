import { describe, it, expect, vi } from 'vitest';
import { sleep, withTimeout, retry, withFallback, allSuccess } from '@/lib/promise';

describe('sleep', () => {
  it('지정 ms 후 resolve', async () => {
    const t0 = Date.now();
    await sleep(20);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(15);
  });
});

describe('withTimeout', () => {
  it('정상 완료 → resolve', async () => {
    expect(await withTimeout(Promise.resolve(42), 100)).toBe(42);
  });
  it('초과 → reject', async () => {
    const slow = new Promise<number>((r) => setTimeout(() => r(1), 100));
    await expect(withTimeout(slow, 20)).rejects.toThrow();
  });
});

describe('retry', () => {
  it('첫 성공 → 1회', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    expect(await retry(fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('실패 후 성공', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      if (++n < 2) throw new Error('try again');
      return 'ok';
    });
    expect(await retry(fn, { attempts: 3, delayMs: 1 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('모두 실패 → 마지막 에러', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(retry(fn, { attempts: 2, delayMs: 1 })).rejects.toThrow('boom');
  });
});

describe('withFallback', () => {
  it('성공 → 결과', async () => {
    expect(await withFallback(Promise.resolve('a'), 'b')).toBe('a');
  });
  it('실패 → fallback', async () => {
    expect(await withFallback(Promise.reject('x'), 'b')).toBe('b');
  });
});

describe('allSuccess', () => {
  it('성공만 추출', async () => {
    const out = await allSuccess([
      Promise.resolve(1),
      Promise.reject(new Error('x')),
      Promise.resolve(3),
    ]);
    expect(out).toEqual([1, 3]);
  });
});

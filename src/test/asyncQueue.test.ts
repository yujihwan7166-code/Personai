import { describe, it, expect } from 'vitest';
import { createAsyncQueue } from '@/lib/asyncQueue';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('createAsyncQueue', () => {
  it('정상 작업 → resolve', async () => {
    const q = createAsyncQueue(2);
    const r = await q.enqueue(async () => 42);
    expect(r).toBe(42);
  });

  it('실패 작업 → reject', async () => {
    const q = createAsyncQueue(2);
    await expect(q.enqueue(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });

  it('동시성 제한 — 최대 N 만 in-flight', async () => {
    const q = createAsyncQueue(2);
    let concurrent = 0;
    let maxObserved = 0;
    const run = (i: number) => q.enqueue(async () => {
      concurrent++;
      maxObserved = Math.max(maxObserved, concurrent);
      await wait(20);
      concurrent--;
      return i;
    });
    await Promise.all([run(1), run(2), run(3), run(4), run(5)]);
    expect(maxObserved).toBeLessThanOrEqual(2);
  });

  it('drain — 모든 작업 완료 후 resolve', async () => {
    const q = createAsyncQueue(2);
    let done = 0;
    for (let i = 0; i < 5; i++) {
      void q.enqueue(async () => { await wait(10); done++; });
    }
    await q.drain();
    expect(done).toBe(5);
    expect(q.size()).toBe(0);
  });

  it('size — 큐 + in-flight 합계', async () => {
    const q = createAsyncQueue(1);
    void q.enqueue(async () => { await wait(20); });
    void q.enqueue(async () => { await wait(20); });
    expect(q.size()).toBe(2);
    await q.drain();
  });
});

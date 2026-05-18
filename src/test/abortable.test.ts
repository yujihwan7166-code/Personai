import { describe, it, expect } from 'vitest';
import { abortable, isAbortError } from '@/lib/abortable';

describe('abortable', () => {
  it('정상 완료 — promise resolve', async () => {
    const { promise } = abortable(async () => 42);
    expect(await promise).toBe(42);
  });

  it('abort 시 signal.aborted = true', async () => {
    const { abort, controller } = abortable(async (signal) => {
      await new Promise<void>((r) => setTimeout(r, 50));
      return signal.aborted;
    });
    abort();
    expect(controller.signal.aborted).toBe(true);
  });
});

describe('isAbortError', () => {
  it('AbortError 인식', () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    expect(isAbortError(e)).toBe(true);
  });
  it('일반 에러 false', () => {
    expect(isAbortError(new Error('other'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError('string')).toBe(false);
  });
});

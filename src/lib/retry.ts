/**
 * sleep / retry — 비동기 재시도 (지수 백오프).
 *
 * API 호출 일시 실패 / rate limit 대응.
 */

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => { clearTimeout(t); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort);
  });
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** error 검사 → false 면 즉시 throw (재시도 X). default: 항상 재시도. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 200, maxDelayMs = 5000, shouldRetry, signal } = opts;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= retries) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(err, attempt)) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(delay, signal);
      attempt++;
    }
  }
  throw lastErr;
}

/**
 * Promise 유틸 — sleep / timeout / retry / withFallback.
 *
 * API 호출, AI 응답 대기, 폴링 등에서 자주 필요한 패턴 통합.
 */

/** N ms 대기. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Promise 에 timeout — 초과 시 reject. */
export function withTimeout<T>(p: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * 재시도 — fn 실패 시 attempts 번까지 backoff 대기 후 재호출.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; backoff?: number } = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delay = options.delayMs ?? 200;
  const backoff = options.backoff ?? 2;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await sleep(delay * Math.pow(backoff, i));
    }
  }
  throw lastError;
}

/** Promise 실패 시 fallback 값 반환 (no throw). */
export async function withFallback<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** Promise.allSettled 의 성공 값만 추출. */
export async function allSuccess<T>(promises: ReadonlyArray<Promise<T>>): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value);
}

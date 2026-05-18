/**
 * 함수 결과 memoize — LRU + 선택적 TTL.
 *
 * 비싼 계산 (parseNaturalLanguage / formula eval 캐시 / API 응답 가공 등) 에 활용.
 * 인자 key 생성은 기본 JSON.stringify — 객체 인자도 가능.
 */

interface MemoOptions<Args extends unknown[]> {
  /** 캐시 최대 항목 수 (LRU evict). 기본 100. */
  max?: number;
  /** TTL ms — 만료된 항목 자동 무시. 기본 무한. */
  ttlMs?: number;
  /** 커스텀 key 생성 — 기본 JSON.stringify(args). */
  keyFn?: (...args: Args) => string;
}

export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  options: MemoOptions<Args> = {},
): ((...args: Args) => R) & { clear: () => void; size: () => number } {
  const max = Math.max(1, options.max ?? 100);
  const ttl = options.ttlMs;
  const keyFn = options.keyFn ?? ((...args: Args) => JSON.stringify(args));
  const cache = new Map<string, { value: R; at: number }>();

  const fnWrapped = ((...args: Args): R => {
    const k = keyFn(...args);
    const cached = cache.get(k);
    if (cached) {
      if (ttl == null || Date.now() - cached.at <= ttl) {
        // LRU touch — 다시 끝으로
        cache.delete(k);
        cache.set(k, cached);
        return cached.value;
      }
      cache.delete(k);
    }
    const value = fn(...args);
    cache.set(k, { value, at: Date.now() });
    // size cap
    if (cache.size > max) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    return value;
  }) as ((...args: Args) => R) & { clear: () => void; size: () => number };

  fnWrapped.clear = () => cache.clear();
  fnWrapped.size = () => cache.size;
  return fnWrapped;
}

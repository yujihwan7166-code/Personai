/**
 * 객체 처리 유틸 — pick/omit/get/mapValues.
 *
 * lodash 없이 경량 구현. 모두 새 객체 반환 (mutate X).
 */

/** keys 만 골라 새 객체. */
export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

/** keys 제외하고 새 객체. */
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const set = new Set<keyof T>(keys);
  const out = {} as Omit<T, K>;
  for (const k of Object.keys(obj) as Array<keyof T>) {
    if (!set.has(k)) (out as Record<string, unknown>)[k as string] = obj[k];
  }
  return out;
}

/**
 * dot 경로 안전 조회 ('a.b.c').
 *   get(obj, 'a.b') → obj.a.b
 *   존재하지 않으면 fallback 또는 undefined.
 */
export function get<T = unknown>(obj: unknown, path: string, fallback?: T): T | undefined {
  if (obj == null) return fallback;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return fallback;
    cur = (cur as Record<string, unknown>)[part];
  }
  return (cur as T | undefined) ?? fallback;
}

/** 값에 함수 적용 — 새 객체. */
export function mapValues<T extends object, R>(
  obj: T,
  fn: (value: T[keyof T], key: string) => R,
): Record<keyof T, R> {
  const out = {} as Record<keyof T, R>;
  for (const k of Object.keys(obj) as Array<keyof T>) {
    out[k] = fn(obj[k], k as string);
  }
  return out;
}

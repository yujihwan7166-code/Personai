/**
 * pick / omit — 객체 키 선택/제외.
 *
 * 직렬화 직전 민감 필드 제거, API payload 추출 등.
 */

export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const set = new Set<keyof T>(keys);
  const out = {} as Record<keyof T, unknown>;
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (!set.has(k)) out[k] = obj[k];
  }
  return out as Omit<T, K>;
}

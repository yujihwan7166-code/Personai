/**
 * 공용 타입 가드 — narrowing 패턴 통합.
 *
 * 각 모듈이 `typeof x === 'string'` / `Array.isArray` / `x != null` 등 인라인 검사 반복.
 * 명시적 이름으로 의도 표현 + 타입 narrow.
 */

export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

export function isArray<T = unknown>(v: unknown): v is T[] {
  return Array.isArray(v);
}

export function isNonEmptyArray<T = unknown>(v: unknown): v is [T, ...T[]] {
  return Array.isArray(v) && v.length > 0;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** v 가 null/undefined 도 아니고, 빈 문자열도 아닌지. 다른 type 은 그대로 OK. */
export function isDefined<T>(v: T | undefined | null): v is T {
  return v != null;
}

/** isDefined + 빈 문자열도 제외. */
export function isNonEmpty<T>(v: T | undefined | null): v is T {
  if (v == null) return false;
  if (typeof v === 'string' && v === '') return false;
  return true;
}

/** Array.filter 와 함께 — undefined/null 제거 + narrowing. */
export function notNull<T>(v: T | undefined | null): v is T {
  return v != null;
}

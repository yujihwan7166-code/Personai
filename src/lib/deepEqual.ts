/**
 * deepEqual — 구조적 동등 비교.
 *
 * 객체/배열/Date/RegExp 지원. Map/Set 미지원 (사용 시 toArray 후).
 * 순환 참조 방지 → seen WeakSet.
 */

export function deepEqual(a: unknown, b: unknown, _seen: WeakSet<object> = new WeakSet()): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  // 순환 참조 (한쪽이라도 이미 방문 → equal 로 간주, 무한 루프 방지)
  if (_seen.has(a as object) || _seen.has(b as object)) return true;
  _seen.add(a as object);
  _seen.add(b as object);

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags;

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr && bArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], _seen)) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], _seen)) return false;
  }
  return true;
}

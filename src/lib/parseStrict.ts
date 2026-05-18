/**
 * 엄격 숫자 파서 — Number(s) 의 모호함을 명시적 fallback 으로 회피.
 *
 * Number("") → 0  (의도와 다름 — 빈 입력)
 * Number("1.5abc") → NaN  (parseFloat 와 다름)
 * parseInt("abc") → NaN
 *
 * → toNumberStrict 는 정말 숫자로만 해석 가능할 때만 number, 아니면 undefined.
 */

/**
 * 엄격 숫자 파싱. 빈 문자열·공백만·"abc" 류는 undefined.
 * 콤마 천단위 자동 제거 (예: "1,234.5" → 1234.5).
 */
export function toNumberStrict(s: unknown, fallback?: number): number | undefined {
  if (typeof s === 'number') return Number.isFinite(s) ? s : fallback;
  if (typeof s !== 'string') return fallback;
  const trimmed = s.trim().replace(/,/g, '');
  if (trimmed === '') return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

/** 엄격 정수 파싱. 소수점 있으면 undefined. */
export function toIntStrict(s: unknown, fallback?: number): number | undefined {
  const n = toNumberStrict(s);
  if (n === undefined) return fallback;
  return Number.isInteger(n) ? n : fallback;
}

/**
 * boolean 파싱 — 'true'/'false'/'1'/'0'/'yes'/'no' 인식.
 * 그 외는 undefined.
 */
export function toBoolStrict(s: unknown, fallback?: boolean): boolean | undefined {
  if (typeof s === 'boolean') return s;
  if (typeof s === 'number') return s !== 0;
  if (typeof s !== 'string') return fallback;
  const t = s.trim().toLowerCase();
  if (t === 'true' || t === '1' || t === 'yes' || t === 'y' || t === 'on') return true;
  if (t === 'false' || t === '0' || t === 'no' || t === 'n' || t === 'off') return false;
  return fallback;
}

/**
 * Safe number parsing — string → number 의 fallback 보장.
 *
 * Number("") = 0 같은 함정 회피.
 * parseInt 의 부분 파싱 회피 ("12abc" → NaN).
 */

export function safeInt(input: unknown, fallback: number = 0): number {
  if (typeof input === 'number') return Number.isInteger(input) ? input : Math.trunc(input);
  if (typeof input !== 'string') return fallback;
  const s = input.trim();
  if (s === '') return fallback;
  if (!/^-?\d+$/.test(s)) return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function safeFloat(input: unknown, fallback: number = 0): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : fallback;
  if (typeof input !== 'string') return fallback;
  const s = input.trim();
  if (s === '') return fallback;
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

/** "1,234,567" → 1234567 (한국어 쉼표 표기). */
export function parseKoreanNumber(input: string, fallback: number = 0): number {
  if (typeof input !== 'string') return fallback;
  const s = input.replace(/,/g, '').trim();
  return safeFloat(s, fallback);
}

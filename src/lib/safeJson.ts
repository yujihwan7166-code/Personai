/**
 * JSON 안전 parse / stringify — 예외 던지지 않고 fallback.
 *
 * localStorage 읽기, API response 등에서 매번 try/catch JSON.parse 반복.
 * 한 곳 모음.
 */

/** 안전 parse — 실패 시 undefined. 옵션 default 있으면 default. */
export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | undefined;
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T;
export function safeJsonParse<T>(raw: string | null | undefined, fallback?: T): T | undefined {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 안전 stringify — 실패 시 fallback (기본 빈 문자열). 순환 참조 등 안전. */
export function safeJsonStringify(value: unknown, fallback = ''): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * 타입 가드 — parsed 가 객체(Record) 인지. 배열/null 제외.
 * safeJsonParse 결과 검증에 자주 사용.
 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

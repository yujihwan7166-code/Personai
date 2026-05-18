/**
 * URL 처리 유틸 — 안전 파싱·도메인 추출·쿼리 빌드.
 *
 * 각 페이지가 new URL() try/catch 패턴 반복.
 */

/** URL 안전 파싱 — 실패 시 null. */
export function safeParseUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

/** 호스트만 추출 ('https://www.example.com/path' → 'www.example.com'). 실패 시 빈 문자열. */
export function getHost(s: string): string {
  return safeParseUrl(s)?.host ?? '';
}

/** 도메인 추출 (www. 제거). */
export function getDomain(s: string): string {
  const host = getHost(s);
  return host.replace(/^www\./, '');
}

/**
 * 안전 URL 인지 — http(s) 만 허용.
 * (사용자 입력 링크 검증 — javascript:/data: 류 차단)
 */
export function isHttpUrl(s: string): boolean {
  const u = safeParseUrl(s);
  return !!u && (u.protocol === 'http:' || u.protocol === 'https:');
}

/**
 * 쿼리스트링 빌드. undefined/null 값은 자동 제외.
 *   buildQuery({ a: 1, b: undefined, c: 'x' }) → 'a=1&c=x'
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

/**
 * 기존 URL 에 쿼리 병합. fragment 보존.
 */
export function appendQuery(url: string, params: Record<string, string | number | boolean | undefined | null>): string {
  const u = safeParseUrl(url);
  if (!u) return url;
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

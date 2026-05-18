/**
 * JWT payload 파싱 (검증 없음 — 클라이언트 표시용).
 *
 * 서명 검증은 서버에서. 여기서는 만료 / username 등 UI 힌트 추출만.
 * 잘못된 토큰은 null 반환 (throw 안 함).
 */

export interface JwtPayload {
  /** issued at (sec) */
  iat?: number;
  /** expiration (sec) */
  exp?: number;
  /** subject */
  sub?: string;
  [k: string]: unknown;
}

function base64UrlDecode(seg: string): string {
  const pad = seg.length % 4 === 0 ? '' : '='.repeat(4 - (seg.length % 4));
  const b64 = (seg + pad).replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') {
    const bin = atob(b64);
    // UTF-8 decode
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Node fallback
   
  return Buffer.from(b64, 'base64').toString('utf-8');
}

export function parseJwt(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' ? (obj as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** 토큰 만료 여부. exp 없으면 false (모름). */
export function isJwtExpired(token: string | null | undefined, nowSec: number = Date.now() / 1000): boolean {
  const p = parseJwt(token);
  if (!p || typeof p.exp !== 'number') return false;
  return p.exp < nowSec;
}

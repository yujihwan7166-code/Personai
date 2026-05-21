/**
 * Safe URL — href/이미지 src 의 XSS 방지 (javascript:, data:html 차단).
 *
 * 사용자 입력 링크 (시트/문서/AI 응답) 에 그대로 신뢰 X.
 * isSafeHref 통과 못하면 '#' 으로 대체.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** http/https/mailto/tel + 상대 경로만 허용. */
export function isSafeHref(href: string | null | undefined): boolean {
  if (!href || typeof href !== 'string') return false;
  const trimmed = href.trim();
  if (trimmed === '') return false;
  // 상대 경로 / fragment / query
  if (/^[/#?]/.test(trimmed)) return true;
  // 명백한 위험 스키마
  if (/^\s*javascript:/i.test(trimmed)) return false;
  if (/^\s*data:/i.test(trimmed)) return false;
  if (/^\s*vbscript:/i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed, 'http://localhost');
    return SAFE_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

export function sanitizeHref(href: string | null | undefined, fallback: string = '#'): string {
  return isSafeHref(href) ? href!.trim() : fallback;
}

/** 이미지 src — http/https/data:image/* 만. */
export function isSafeImageSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  const t = src.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (/^data:image\/(png|jpe?g|gif|webp|bmp|x-ms-bmp);/i.test(t)) return true;
  if (/^\/[^/]/.test(t)) return true; // 절대 경로
  return false;
}

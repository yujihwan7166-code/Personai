/**
 * Cursor pagination — opaque base64 cursor + page slice.
 *
 * 클라이언트 무한 스크롤 / 페이지 이동 base.
 * 서버 cursor 와 동일 형식 가정 (id|sortKey 또는 idx).
 */

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

function b64(s: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
  return Buffer.from(s, 'utf-8').toString('base64');
}

function unb64(s: string): string {
  try {
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(s)));
    return Buffer.from(s, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export function encodeCursor(idx: number): string {
  return b64(`idx:${idx}`);
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const dec = unb64(cursor);
  const m = /^idx:(\d+)$/.exec(dec);
  return m ? parseInt(m[1], 10) : 0;
}

/** 메모리 배열 페이지 슬라이스 (서버 흉내 / 테스트용). */
export function paginate<T>(items: readonly T[], cursor: string | null | undefined, limit: number): Page<T> {
  const start = decodeCursor(cursor);
  const end = Math.min(items.length, start + Math.max(1, limit));
  const slice = items.slice(start, end);
  const hasMore = end < items.length;
  return {
    items: slice,
    nextCursor: hasMore ? encodeCursor(end) : null,
    hasMore,
  };
}

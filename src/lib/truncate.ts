/**
 * truncate — 텍스트 자르기 + 말줄임.
 *
 * truncate: 길이 기준 (말줄임 …).
 * truncateMiddle: 가운데 생략 (긴 ID/경로 표시).
 * truncateWords: 단어 단위.
 */

const ELLIPSIS = '…';

export function truncate(s: string, max: number, ellipsis: string = ELLIPSIS): string {
  if (!s) return '';
  if (max <= 0) return '';
  if (s.length <= max) return s;
  const cut = Math.max(0, max - ellipsis.length);
  return s.slice(0, cut) + ellipsis;
}

export function truncateMiddle(s: string, max: number, ellipsis: string = ELLIPSIS): string {
  if (!s) return '';
  if (s.length <= max) return s;
  const keep = max - ellipsis.length;
  if (keep <= 0) return ellipsis;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return s.slice(0, head) + ellipsis + s.slice(s.length - tail);
}

export function truncateWords(s: string, maxWords: number, ellipsis: string = ELLIPSIS): string {
  if (!s) return '';
  const words = s.trim().split(/\s+/);
  if (words.length <= maxWords) return s;
  return words.slice(0, maxWords).join(' ') + ellipsis;
}

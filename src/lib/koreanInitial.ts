/**
 * 한글 초성 추출 — '안녕' → 'ㅇㄴ'.
 *
 * 검색 입력에서 'ㅁㅅ' → '명사' 같은 매칭 가능.
 * 한국인 친화 UX (모바일 한글 자판 빠른 검색).
 */

const INITIAL_CHARS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7A3;

/** 한 글자 → 초성 (한글 아니면 자기 자신). */
export function toInitial(ch: string): string {
  if (!ch) return '';
  const code = ch.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return ch;
  const idx = Math.floor((code - HANGUL_START) / 588);
  return INITIAL_CHARS[idx] ?? ch;
}

/** 문자열 → 초성 문자열. */
export function toInitialString(s: string): string {
  let out = '';
  for (const ch of s) out += toInitial(ch);
  return out;
}

/**
 * 텍스트가 초성 query 와 매칭되는지.
 *   matchInitial('안녕하세요', 'ㅇㄴ') → true
 *   matchInitial('Hello', 'h') → true (영문도 lowercase 비교)
 */
export function matchInitial(text: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const textInit = toInitialString(text).toLowerCase();
  if (textInit.includes(q)) return true;
  // 원문 부분일치 fallback
  return text.toLowerCase().includes(q);
}

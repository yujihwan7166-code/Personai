/**
 * 텍스트 검색·매칭 공용.
 *
 * 검색창, 자동완성, 필터 등에서 매번 토큰화·표준화·매칭 패턴 반복.
 * 한국어 받침/공백/대소문자 처리 + 매칭 위치 추출까지.
 */

/** 표준화: trim + lower + 연속 공백 1칸. */
export function normalizeQuery(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * 부분 일치 검사 (대소문자·공백 무시). 빈 query 면 true (no filter).
 */
export function fuzzyIncludes(haystack: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

/**
 * 다중 토큰 AND 매칭. "사과 바나나" → 두 단어 모두 포함되면 true.
 * (순서 무관, 부분일치)
 */
export function tokenMatchAll(haystack: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  const tokens = q.split(' ').filter(Boolean);
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

/**
 * 매칭 위치 추출 — 하이라이트용. 대소문자 무시, 모든 발생.
 * 반환: [{ start, end }] (inclusive start, exclusive end). 빈 query 면 [].
 */
export function findMatches(haystack: string, query: string): Array<{ start: number; end: number }> {
  const q = query.toLowerCase();
  if (!q) return [];
  const lower = haystack.toLowerCase();
  const out: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < lower.length) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) break;
    out.push({ start: idx, end: idx + q.length });
    i = idx + q.length;
  }
  return out;
}

/**
 * 텍스트를 [{ text, hit }] 세그먼트로 분할 — JSX 렌더에 바로 사용.
 *
 * 예: highlight('안녕 세상', '세상') → [
 *   {text:'안녕 ', hit:false},
 *   {text:'세상', hit:true},
 * ]
 */
export function splitForHighlight(haystack: string, query: string): Array<{ text: string; hit: boolean }> {
  const matches = findMatches(haystack, query);
  if (matches.length === 0) return [{ text: haystack, hit: false }];
  const out: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) out.push({ text: haystack.slice(cursor, m.start), hit: false });
    out.push({ text: haystack.slice(m.start, m.end), hit: true });
    cursor = m.end;
  }
  if (cursor < haystack.length) out.push({ text: haystack.slice(cursor), hit: false });
  return out;
}

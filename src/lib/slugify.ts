/**
 * Slugify — 제목/이름 → URL-safe slug.
 *
 * 한글은 그대로 유지 (한국어 URL 일반화). 영문/숫자 외 특수문자는 - 로.
 * 다중 - 압축, 양끝 trim.
 */

interface Options {
  /** 한글 유지 (default: true). false 면 한글도 제거. */
  preserveHangul?: boolean;
  maxLength?: number;
}

export function slugify(input: string, opts: Options = {}): string {
  const { preserveHangul = true, maxLength = 80 } = opts;
  if (!input) return '';
  let s = input.toLowerCase().trim();
  // 공백 → -
  s = s.replace(/\s+/g, '-');
  // 허용: a-z, 0-9, -, (한글)
  const allowed = preserveHangul ? /[^a-z0-9\-가-힣]/g : /[^a-z0-9-]/g;
  s = s.replace(allowed, '-');
  // 다중 - 압축
  s = s.replace(/-+/g, '-');
  // 양끝 -
  s = s.replace(/^-+|-+$/g, '');
  if (maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength).replace(/-+$/, '');
  }
  return s;
}

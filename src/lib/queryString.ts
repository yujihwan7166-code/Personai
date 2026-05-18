/**
 * Query string parse / build.
 *
 * URLSearchParams 보다 친화적 객체 API.
 * 배열 값 (?tag=a&tag=b) → string[] 자동.
 */

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];
export type QueryObject = Record<string, QueryValue>;

export function parseQueryString(input: string): Record<string, string | string[]> {
  const s = input.startsWith('?') ? input.slice(1) : input;
  if (!s) return {};
  const out: Record<string, string | string[]> = {};
  for (const part of s.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = decodeURIComponent(eq < 0 ? part : part.slice(0, eq));
    const val = eq < 0 ? '' : decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '));
    if (out[key] === undefined) {
      out[key] = val;
    } else if (Array.isArray(out[key])) {
      (out[key] as string[]).push(val);
    } else {
      out[key] = [out[key] as string, val];
    }
  }
  return out;
}

export function buildQueryString(obj: QueryObject): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.join('&');
}

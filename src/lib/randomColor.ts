/**
 * Random color — name → 안정된 HSL 색상 (재시작해도 동일).
 *
 * Avatar / 카테고리 색 / 차트 자동 컬러.
 */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface Options {
  saturation?: number; // 0~100
  lightness?: number; // 0~100
}

/** 항상 동일 입력 → 동일 색. HSL string 반환. */
export function colorFromString(s: string, opts: Options = {}): string {
  const { saturation = 65, lightness = 55 } = opts;
  const hue = hashStr(s) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/** N 개의 구분되는 hue 색상 (차트 시리즈). */
export function distinctColors(n: number, opts: Options = {}): string[] {
  const { saturation = 65, lightness = 55 } = opts;
  if (n <= 0) return [];
  const step = 360 / n;
  return Array.from({ length: n }, (_, i) => `hsl(${Math.round(i * step)}, ${saturation}%, ${lightness}%)`);
}

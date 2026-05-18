/**
 * Numeric range utils — clamp / lerp / mapRange / inRange.
 *
 * UI 슬라이더 / 차트 스케일 / 픽셀 → 데이터 변환 base.
 */

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (min > max) [min, max] = [max, min];
  return n < min ? min : n > max ? max : n;
}

/** linear interpolation: a + (b-a)*t. t 는 0~1 권장 (clamp 안 함). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** [inMin, inMax] 의 value 를 [outMin, outMax] 로 매핑 (외삽 가능). */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) return outMin;
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/** value ∈ [min, max] (양쪽 포함). */
export function inRange(value: number, min: number, max: number): boolean {
  if (min > max) [min, max] = [max, min];
  return value >= min && value <= max;
}

/** 가까운 step 으로 snap. */
export function snap(value: number, step: number, offset: number = 0): number {
  if (step <= 0) return value;
  return offset + Math.round((value - offset) / step) * step;
}

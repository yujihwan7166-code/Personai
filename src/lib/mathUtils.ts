/**
 * 수학 유틸 — 자주 쓰는 작은 패턴.
 */

/** 값을 [min, max] 범위로 강제. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * [start, end) 정수 배열. step 옵션.
 *   range(3) → [0,1,2]
 *   range(2, 5) → [2,3,4]
 *   range(0, 10, 2) → [0,2,4,6,8]
 */
export function range(startOrEnd: number, end?: number, step = 1): number[] {
  const start = end === undefined ? 0 : startOrEnd;
  const stop = end === undefined ? startOrEnd : end;
  if (step === 0) return [];
  const out: number[] = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) out.push(i);
  } else {
    for (let i = start; i > stop; i += step) out.push(i);
  }
  return out;
}

/** value 가 [min, max) 안인지 (start 포함, end 제외). */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value < max;
}

/**
 * 선형 보간. t = 0 → a, t = 1 → b.
 *   lerp(0, 100, 0.5) → 50
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * value 가 [inMin, inMax] 범위면 [outMin, outMax] 로 비례 매핑.
 * (zoom 비율, slider 값 변환 등)
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, t);
}

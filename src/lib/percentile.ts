/**
 * Percentile — p50/p90/p99 등 분위수.
 *
 * API 응답 시간 / 사용자 점수 분포 측정.
 * linear interpolation (Excel PERCENTILE.INC 와 동일).
 */

/** p ∈ [0, 1]. 빈 배열 → NaN. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, p));
  const idx = clamped * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export const p50 = (v: readonly number[]) => percentile(v, 0.5);
export const p90 = (v: readonly number[]) => percentile(v, 0.9);
export const p95 = (v: readonly number[]) => percentile(v, 0.95);
export const p99 = (v: readonly number[]) => percentile(v, 0.99);

/** 통계 요약. */
export interface Stats {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
}

export function summarize(values: readonly number[]): Stats {
  if (values.length === 0) {
    return { count: 0, min: NaN, max: NaN, mean: NaN, p50: NaN, p90: NaN, p99: NaN };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: sum / values.length,
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p99: percentile(values, 0.99),
  };
}

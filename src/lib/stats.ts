/**
 * 통계 유틸 — mean/median/percentile/stdev.
 *
 * 일기 인사이트, 습관 통계, 시트 데이터 분석 등에 활용.
 * 모두 빈 배열에 안전 (0 또는 NaN 회피용 fallback).
 */

const filterNumeric = (arr: readonly unknown[]): number[] => {
  const out: number[] = [];
  for (const v of arr) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
};

/** 산술 평균. 빈 배열은 0. */
export function mean(arr: readonly number[]): number {
  const nums = filterNumeric(arr);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** 중앙값. */
export function median(arr: readonly number[]): number {
  const nums = filterNumeric(arr).sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const m = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[m] : (nums[m - 1] + nums[m]) / 2;
}

/**
 * P-percentile (0~100). 선형 보간 (numpy 'linear' 동등).
 * p=50 → median.
 */
export function percentile(arr: readonly number[], p: number): number {
  const nums = filterNumeric(arr).sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  const clamped = Math.max(0, Math.min(100, p));
  const idx = (clamped / 100) * (nums.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return nums[lo];
  const t = idx - lo;
  return nums[lo] * (1 - t) + nums[hi] * t;
}

/** 표본 표준편차 (n-1 분모). */
export function stdev(arr: readonly number[]): number {
  const nums = filterNumeric(arr);
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

/** min / max — 안전 (빈 배열은 0). */
export function minOf(arr: readonly number[]): number {
  const nums = filterNumeric(arr);
  return nums.length === 0 ? 0 : Math.min(...nums);
}
export function maxOf(arr: readonly number[]): number {
  const nums = filterNumeric(arr);
  return nums.length === 0 ? 0 : Math.max(...nums);
}

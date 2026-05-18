/**
 * Binary Search — 정렬 배열에서 O(log n) 검색/삽입 위치.
 *
 * sortedIndex: 삽입 위치 (lower_bound).
 * binarySearch: 일치하는 인덱스 (없으면 -1).
 * 정렬되지 않은 배열에 호출하면 undefined behavior.
 */

export type Comparator<T> = (a: T, b: T) => number;

const defaultCompare = <T>(a: T, b: T): number => (a < b ? -1 : a > b ? 1 : 0);

/** lower_bound: target 이 들어갈 가장 왼쪽 위치 (0 ~ length). */
export function sortedIndex<T>(arr: readonly T[], target: T, cmp: Comparator<T> = defaultCompare): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cmp(arr[mid], target) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** target 인덱스 반환. 없으면 -1. */
export function binarySearch<T>(arr: readonly T[], target: T, cmp: Comparator<T> = defaultCompare): number {
  const i = sortedIndex(arr, target, cmp);
  if (i < arr.length && cmp(arr[i], target) === 0) return i;
  return -1;
}

/** 정렬된 배열에 target 삽입 (mutating). 반환: 삽입된 인덱스. */
export function insertSorted<T>(arr: T[], target: T, cmp: Comparator<T> = defaultCompare): number {
  const i = sortedIndex(arr, target, cmp);
  arr.splice(i, 0, target);
  return i;
}

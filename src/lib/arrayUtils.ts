/**
 * 배열 유틸 — 자주 쓰는 작업 모음.
 *
 * 외부 lodash 의존 회피 (번들 ↓).
 */

/** 중복 제거 (객체는 ref 비교, 원시는 값). 첫 등장 순서 보존. */
export function unique<T>(arr: readonly T[]): T[] {
  return Array.from(new Set(arr));
}

/** 키 기준 중복 제거. 같은 키가 여러 번 나오면 첫 번째 유지. */
export function uniqueBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

/** 키 → 항목 배열 그룹화. */
export function groupBy<T, K extends string | number>(
  arr: readonly T[], keyFn: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

/** N 개씩 잘라 chunk. */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size <= 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** 배열 평탄화 (1 레벨). */
export function flatten<T>(arr: readonly T[][]): T[] {
  const out: T[] = [];
  for (const inner of arr) out.push(...inner);
  return out;
}

/** 두 배열의 교집합 (Set 기반, 첫 배열 순서 보존). */
export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** 두 배열의 차집합 (a - b). */
export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => !set.has(x));
}

/**
 * 안전 인덱스 회전 (음수·overflow 자동). 빈 배열은 undefined.
 *   rotateIndex([a,b,c], -1) → 2 (c)
 *   rotateIndex([a,b,c], 5)  → 2 (c)
 */
export function rotateIndex(length: number, idx: number): number {
  if (length <= 0) return -1;
  return ((idx % length) + length) % length;
}

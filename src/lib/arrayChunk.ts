/**
 * Array chunk / zip / flatten.
 *
 * 큰 리스트 페이지화 / 동시 처리 batch.
 */

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size <= 0 || !Number.isFinite(size)) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** 길이 다르면 짧은 쪽 기준. */
export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  const len = Math.min(a.length, b.length);
  const out: [A, B][] = [];
  for (let i = 0; i < len; i++) out.push([a[i], b[i]]);
  return out;
}

/** 한 단계 flatten (배열의 배열 → 배열). */
export function flatten<T>(arr: readonly (T | readonly T[])[]): T[] {
  const out: T[] = [];
  for (const x of arr) {
    if (Array.isArray(x)) out.push(...x);
    else out.push(x as T);
  }
  return out;
}

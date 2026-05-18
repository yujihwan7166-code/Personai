/**
 * Collection utils — groupBy / sortBy / uniqBy / partition.
 *
 * lodash 대체 (트리쉐이킹 친화).
 */

export type Key = string | number;
export type KeyFn<T> = (item: T) => Key;

export function groupBy<T>(items: readonly T[], keyFn: KeyFn<T>): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    const k = String(keyFn(it));
    (out[k] ||= []).push(it);
  }
  return out;
}

/** 안정 정렬. order=desc 지원. multi-key 는 cmp chain. */
export function sortBy<T>(items: readonly T[], keyFn: (item: T) => Key, order: 'asc' | 'desc' = 'asc'): T[] {
  const mul = order === 'asc' ? 1 : -1;
  return [...items]
    .map((v, i) => ({ v, i, k: keyFn(v) }))
    .sort((a, b) => {
      if (a.k < b.k) return -1 * mul;
      if (a.k > b.k) return 1 * mul;
      return a.i - b.i;
    })
    .map(x => x.v);
}

export function uniqBy<T>(items: readonly T[], keyFn: KeyFn<T>): T[] {
  const seen = new Set<Key>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (!seen.has(k)) { seen.add(k); out.push(it); }
  }
  return out;
}

/** [통과, 실패] 두 배열로 split. */
export function partition<T>(items: readonly T[], pred: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const it of items) (pred(it) ? pass : fail).push(it);
  return [pass, fail];
}

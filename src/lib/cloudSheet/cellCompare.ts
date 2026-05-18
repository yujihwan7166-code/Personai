/** 시트 셀 값 비교 함수 — 정렬/필터 공용.
 *  규칙: 빈 셀 항상 끝, 숫자끼리는 수치 비교, 그 외 한국어 localeCompare.
 */

/** asc/desc 인지에 따라 부호 반전. */
export function compareCellValues(a: string, b: string, dir: 'asc' | 'desc' = 'asc'): number {
  // 빈 셀은 항상 끝으로
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const na = Number(a);
  const nb = Number(b);
  let cmp: number;
  if (Number.isFinite(na) && Number.isFinite(nb)) cmp = na - nb;
  else cmp = String(a).localeCompare(String(b), 'ko');
  return dir === 'asc' ? cmp : -cmp;
}

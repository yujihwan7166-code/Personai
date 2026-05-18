/** 셀 자동완성 — editing 중인 셀의 같은 col 에서 prefix 매치되는 첫 값. */

import { cellRef } from './sheetUtils';
import type { Cells } from './cellTypes';

/**
 * @returns prefix 매치되는 셀 값 (대소문자 무시, 가까운 위 우선). 없으면 null.
 *   prefix 가 비어있거나 = 로 시작 (수식) 이면 null.
 */
export function findAutocomplete(
  cells: Cells,
  prefix: string,
  editingRow: number,
  editingCol: number,
  rowCount: number,
): string | null {
  if (!prefix || prefix.startsWith('=')) return null;
  const lowerPrefix = prefix.toLowerCase();
  const editingRef = cellRef(editingRow, editingCol);
  for (let r = 0; r < rowCount; r++) {
    if (r === editingRow) continue;
    const ref = cellRef(r, editingCol);
    const v = cells[ref];
    if (v === undefined || v === '') continue;
    if (v.startsWith('=')) continue; // 수식 셀의 raw 는 추천 X
    if (v === prefix) continue; // 완전 동일은 추천 X
    if (v.toLowerCase().startsWith(lowerPrefix)) {
      return v !== editingRef ? v : null;
    }
  }
  return null;
}

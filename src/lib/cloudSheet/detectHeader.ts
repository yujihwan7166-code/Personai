/** 정렬·필터 시 첫 행이 헤더인지 자동 감지.
 *  규칙: 첫 행이 모두 비숫자 + 나머지 행에 숫자가 1개라도 있으면 헤더.
 */

import { cellRef } from './sheetUtils';
import type { Cells } from './cellTypes';

export function detectHeaderRow(
  cells: Cells,
  area: { minR: number; maxR: number; minC: number; maxC: number },
): boolean {
  let firstRowAllText = true;
  for (let c = area.minC; c <= area.maxC; c++) {
    const v = cells[cellRef(area.minR, c)] ?? '';
    if (v && Number.isFinite(Number(v))) { firstRowAllText = false; break; }
  }
  let restHasNumber = false;
  outer: for (let r = area.minR + 1; r <= area.maxR; r++) {
    for (let c = area.minC; c <= area.maxC; c++) {
      const v = cells[cellRef(r, c)] ?? '';
      if (v && Number.isFinite(Number(v))) { restHasNumber = true; break outer; }
    }
  }
  return firstRowAllText && restHasNumber;
}

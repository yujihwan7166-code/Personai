/** 선택 영역 통계 (Sum/Avg/Count/Min/Max) — 엑셀 상태표시줄과 동일. */

import { cellRef } from './sheetUtils';
import type { Cells, SelBounds } from './cellTypes';

export interface SelectionStats {
  cellsInSel: number;
  count: number;      // 값이 있는 셀
  numCount: number;   // 숫자로 파싱 가능한 셀
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export function computeSelectionStats(
  selBounds: SelBounds,
  cells: Cells,
  displayValues: Cells,
): SelectionStats {
  let count = 0;
  let numCount = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
    for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
      const ref = cellRef(r, c);
      const raw = cells[ref];
      if (raw === undefined || raw === '') continue;
      count++;
      const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
      const n = Number(display);
      if (Number.isFinite(n) && display.trim() !== '') {
        numCount++;
        sum += n;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
  }
  const cellsInSel = (selBounds.maxR - selBounds.minR + 1) * (selBounds.maxC - selBounds.minC + 1);
  return {
    cellsInSel,
    count,
    numCount,
    sum: numCount > 0 ? sum : null,
    avg: numCount > 0 ? sum / numCount : null,
    min: numCount > 0 ? min : null,
    max: numCount > 0 ? max : null,
  };
}

/** 상태표시줄 표시용 — 정수면 천단위 콤마, 아니면 소수 4자리. */
export function formatStatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('ko-KR');
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
}

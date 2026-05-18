/** 시트 데이터의 최대 행/열 계산 (참조 → 좌표). */

import { colToIdx } from '@/lib/cloudSheet/formula';
import type { Cells, AllCells, AllMerges } from '@/lib/cloudSheet/cellTypes';

/** cells 의 최대 row / col 계산. 없으면 -1. */
export function maxRowColFromCells(cells: Cells): { row: number; col: number } {
  let maxR = -1; let maxC = -1;
  for (const ref of Object.keys(cells)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const c = colToIdx(m[1]);
    const r = Number(m[2]) - 1;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { row: maxR, col: maxC };
}

/** 모든 시트의 cells + merges 중 가장 큰 범위. */
export function maxRowColFromAll(
  allCells: AllCells, allMerges: AllMerges,
): { row: number; col: number } {
  let maxR = -1; let maxC = -1;
  for (const sheetId of Object.keys(allCells)) {
    const { row, col } = maxRowColFromCells(allCells[sheetId] ?? {});
    if (row > maxR) maxR = row;
    if (col > maxC) maxC = col;
  }
  for (const sheetId of Object.keys(allMerges)) {
    for (const m of allMerges[sheetId] ?? []) {
      if (m.maxR > maxR) maxR = m.maxR;
      if (m.maxC > maxC) maxC = m.maxC;
    }
  }
  return { row: maxR, col: maxC };
}

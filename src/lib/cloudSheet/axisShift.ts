/** 행/열 삽입·삭제 시 셀/서식/병합 좌표 이동. delta>0 = 삽입, delta<0 = 삭제. */

import { colToIdx, idxToCol } from './formula';
import type { Cells, Merge } from './cellTypes';
import type { CellFormats } from './cellFormat';

export function shiftCellsRow(cur: Cells, atRow: number, delta: number): Cells {
  if (delta === 0) return cur;
  const out: Cells = {};
  for (const [ref, v] of Object.entries(cur)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) { out[ref] = v; continue; }
    const colStr = m[1];
    const r = Number(m[2]) - 1;
    if (delta < 0 && r === atRow) continue; // 삭제 대상 행
    const nr = r >= atRow ? r + delta : r;
    if (nr < 0) continue;
    out[`${colStr}${nr + 1}`] = v;
  }
  return out;
}

export function shiftCellsCol(cur: Cells, atCol: number, delta: number): Cells {
  if (delta === 0) return cur;
  const out: Cells = {};
  for (const [ref, v] of Object.entries(cur)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) { out[ref] = v; continue; }
    const c = colToIdx(m[1]);
    const rowStr = m[2];
    if (delta < 0 && c === atCol) continue;
    const nc = c >= atCol ? c + delta : c;
    if (nc < 0) continue;
    out[`${idxToCol(nc)}${rowStr}`] = v;
  }
  return out;
}

export function shiftFormatsRow(cur: CellFormats, atRow: number, delta: number): CellFormats {
  if (delta === 0) return cur;
  const out: CellFormats = {};
  for (const [ref, v] of Object.entries(cur)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) { out[ref] = v; continue; }
    const colStr = m[1];
    const r = Number(m[2]) - 1;
    if (delta < 0 && r === atRow) continue;
    const nr = r >= atRow ? r + delta : r;
    if (nr < 0) continue;
    out[`${colStr}${nr + 1}`] = v;
  }
  return out;
}

export function shiftFormatsCol(cur: CellFormats, atCol: number, delta: number): CellFormats {
  if (delta === 0) return cur;
  const out: CellFormats = {};
  for (const [ref, v] of Object.entries(cur)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) { out[ref] = v; continue; }
    const c = colToIdx(m[1]);
    const rowStr = m[2];
    if (delta < 0 && c === atCol) continue;
    const nc = c >= atCol ? c + delta : c;
    if (nc < 0) continue;
    out[`${idxToCol(nc)}${rowStr}`] = v;
  }
  return out;
}

export function shiftMergesRow(cur: Merge[], atRow: number, delta: number): Merge[] {
  if (delta === 0) return cur;
  const out: Merge[] = [];
  for (const m of cur) {
    // 삭제 행에 완전 흡수되는 1행 병합은 제거
    if (delta < 0 && m.minR === atRow && m.maxR === atRow) continue;
    const adj = (r: number) => (r >= atRow ? r + delta : r);
    const nMinR = adj(m.minR);
    const nMaxR = adj(m.maxR);
    if (nMaxR < nMinR) continue;
    out.push({ ...m, minR: Math.max(0, nMinR), maxR: nMaxR });
  }
  return out;
}

export function shiftMergesCol(cur: Merge[], atCol: number, delta: number): Merge[] {
  if (delta === 0) return cur;
  const out: Merge[] = [];
  for (const m of cur) {
    if (delta < 0 && m.minC === atCol && m.maxC === atCol) continue;
    const adj = (c: number) => (c >= atCol ? c + delta : c);
    const nMinC = adj(m.minC);
    const nMaxC = adj(m.maxC);
    if (nMaxC < nMinC) continue;
    out.push({ ...m, minC: Math.max(0, nMinC), maxC: nMaxC });
  }
  return out;
}

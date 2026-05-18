/** 선택 범위 계산 — single focus + optional anchor → SelBounds. */

import type { Merge, SelBounds } from './cellTypes';

interface Point { row: number; col: number }

/** anchor=null → 단일 셀. anchor=있음 → min/max bounding box. */
export function computeSelBounds(selected: Point, anchor: Point | null): SelBounds {
  if (!anchor) {
    return { minR: selected.row, maxR: selected.row, minC: selected.col, maxC: selected.col };
  }
  return {
    minR: Math.min(anchor.row, selected.row),
    maxR: Math.max(anchor.row, selected.row),
    minC: Math.min(anchor.col, selected.col),
    maxC: Math.max(anchor.col, selected.col),
  };
}

/** 병합 렌더링용 — top-left 위치 → 크기 map, 그 외 위치 → covered set. */
export function buildMergeMaps(merges: Merge[]): {
  mergeAtMap: Map<string, { rows: number; cols: number }>;
  coveredSet: Set<string>;
} {
  const at = new Map<string, { rows: number; cols: number }>();
  const covered = new Set<string>();
  for (const m of merges) {
    at.set(`${m.minR},${m.minC}`, { rows: m.maxR - m.minR + 1, cols: m.maxC - m.minC + 1 });
    for (let r = m.minR; r <= m.maxR; r++) {
      for (let c = m.minC; c <= m.maxC; c++) {
        if (r === m.minR && c === m.minC) continue;
        covered.add(`${r},${c}`);
      }
    }
  }
  return { mergeAtMap: at, coveredSet: covered };
}

/** 선택 범위 계산 — single focus + optional anchor → SelBounds. */

import type { SelBounds } from './cellTypes';

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

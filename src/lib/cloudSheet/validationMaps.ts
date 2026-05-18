/** Validation 규칙 → 셀 ref 기반 빠른 lookup map 계산. */

import { cellRef } from './sheetUtils';
import type { Cells } from './cellTypes';
import type { Validation } from './validation';

/** ref → 허용 items (드롭다운 셀). checkbox 는 별도 처리 — 여기서는 제외. */
export function buildValidationItemsMap(validations: Validation[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const v of validations) {
    if (v.kind === 'checkbox') continue;
    for (let r = v.range.minR; r <= v.range.maxR; r++) {
      for (let c = v.range.minC; c <= v.range.maxC; c++) {
        out.set(cellRef(r, c), v.items);
      }
    }
  }
  return out;
}

/** 체크박스 위젯 표시 셀 ref 집합. */
export function buildCheckboxRefSet(validations: Validation[]): Set<string> {
  const out = new Set<string>();
  for (const v of validations) {
    if (v.kind !== 'checkbox') continue;
    for (let r = v.range.minR; r <= v.range.maxR; r++) {
      for (let c = v.range.minC; c <= v.range.maxC; c++) {
        out.add(cellRef(r, c));
      }
    }
  }
  return out;
}

/** Drop-down rule 있고 값이 items 에 없으면 invalid. */
export function buildInvalidRefSet(
  validationItemsMap: Map<string, string[]>,
  cells: Cells,
  displayValues: Cells,
): Set<string> {
  const out = new Set<string>();
  for (const [ref, items] of validationItemsMap) {
    const raw = cells[ref];
    if (raw === undefined || raw === '') continue; // 빈 셀은 valid
    const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
    if (!items.includes(display) && !items.includes(raw)) out.add(ref);
  }
  return out;
}

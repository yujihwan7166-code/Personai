/** Validation 규칙 → 셀 ref 기반 빠른 lookup map 계산. */

import { cellRef } from './sheetUtils';
import type { Cells } from './cellTypes';
import type { Validation } from './validation';

/** ref → 허용 items (드롭다운 셀). checkbox 는 별도 처리 — 여기서는 제외. */
export function buildValidationItemsMap(validations: Validation[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const v of validations) {
    if (v.kind !== 'list') continue;
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

function numericRuleInvalid(rule: Validation, value: string): boolean {
  if (rule.kind !== 'number' && rule.kind !== 'integer' && rule.kind !== 'textLength') return false;
  if (value.trim() === '') return false;
  const n = rule.kind === 'textLength' ? value.length : Number(value);
  if (!Number.isFinite(n)) return true;
  if (rule.kind === 'integer' && !Number.isInteger(n)) return true;
  const a = Number(rule.formula1);
  const b = Number(rule.formula2);
  if (!Number.isFinite(a)) return false;
  switch (rule.operator) {
    case 'between':
      return Number.isFinite(b) ? n < Math.min(a, b) || n > Math.max(a, b) : false;
    case 'notBetween':
      return Number.isFinite(b) ? n >= Math.min(a, b) && n <= Math.max(a, b) : false;
    case 'equal':
      return n !== a;
    case 'notEqual':
      return n === a;
    case 'greaterThan':
      return n <= a;
    case 'lessThan':
      return n >= a;
    case 'greaterThanOrEqual':
      return n < a;
    case 'lessThanOrEqual':
      return n > a;
    default:
      return false;
  }
}

function dateSerial(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return numeric;
  const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return undefined;
  const date = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    m[4] ? Number(m[4]) : 12,
    m[5] ? Number(m[5]) : 0,
    m[6] ? Number(m[6]) : 0,
  );
  if (!Number.isFinite(date)) return undefined;
  // Excel 1900 date system, matching the formula engine's serial convention.
  return Math.floor(date / 86400000) + 25569;
}

function dateRuleInvalid(rule: Validation, value: string): boolean {
  if (rule.kind !== 'date') return false;
  if (value.trim() === '') return false;
  const n = dateSerial(value);
  if (n === undefined) return true;
  const a = dateSerial(rule.formula1);
  const b = rule.formula2 ? dateSerial(rule.formula2) : undefined;
  if (a === undefined) return false;
  switch (rule.operator) {
    case 'between':
      return b === undefined ? false : n < Math.min(a, b) || n > Math.max(a, b);
    case 'notBetween':
      return b === undefined ? false : n >= Math.min(a, b) && n <= Math.max(a, b);
    case 'equal':
      return n !== a;
    case 'notEqual':
      return n === a;
    case 'greaterThan':
      return n <= a;
    case 'lessThan':
      return n >= a;
    case 'greaterThanOrEqual':
      return n < a;
    case 'lessThanOrEqual':
      return n > a;
    default:
      return false;
  }
}

/** Drop-down rule 있고 값이 items 에 없으면 invalid. */
export function buildInvalidRefSet(
  validationItemsMap: Map<string, string[]>,
  cells: Cells,
  displayValues: Cells,
  validations: Validation[] = [],
): Set<string> {
  const out = new Set<string>();
  for (const [ref, items] of validationItemsMap) {
    const raw = cells[ref];
    if (raw === undefined || raw === '') continue; // 빈 셀은 valid
    const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
    if (!items.includes(display) && !items.includes(raw)) out.add(ref);
  }
  for (const rule of validations) {
    if (rule.kind !== 'number' && rule.kind !== 'integer' && rule.kind !== 'textLength' && rule.kind !== 'date') continue;
    for (let r = rule.range.minR; r <= rule.range.maxR; r++) {
      for (let c = rule.range.minC; c <= rule.range.maxC; c++) {
        const ref = cellRef(r, c);
        const raw = cells[ref];
        if (raw === undefined || raw === '') continue;
        const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
        if (numericRuleInvalid(rule, display) || dateRuleInvalid(rule, display)) out.add(ref);
      }
    }
  }
  return out;
}

/**
 * 시트 ↔ .xlsx 호환.
 *
 * Import: SheetJS (xlsx) — 값·수식·셀 병합 추출
 * Export: ExcelJS — 셀 서식(글꼴·색·배경·정렬·숫자형식·테두리) + 셀 병합 보존
 *
 * 함수명 변환: 엑셀 AVERAGE ↔ 우리 AVG
 * 한계: 차트·매크로·피벗·데이터 검증 무시. 이미지·코멘트 v1 미반영.
 */

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  AI_ERROR_PREFIX,
  AI_LOADING_PREFIX,
  AI_SENTINEL,
  IMAGE_SENTINEL,
  LINK_SENTINEL,
  SPILL_SENTINEL,
  colToIdx,
  evalCell,
  idxToCol,
} from './formula';
import { excelNumFmtToToken } from './numFmtMap';
import { SPARKLINE_SENTINEL } from './sparkline';
import type { Validation } from './validation';
import { isSafeHref, isSafeImageSrc } from '@/lib/safeUrl';
import { parseCsv } from '@/lib/csv';

type Cells = Record<string, string>;
type NamedRanges = Record<string, string>;
type Comments = Record<string, string>;

type FontFamily = 'pretendard' | 'inter' | 'arial' | 'noto-sans' | 'georgia' | 'jetbrains';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  wrap?: 'overflow' | 'wrap' | 'clip';
  fontFamily?: FontFamily;
  fontSize?: number;
  numberFmt?: 'currency-krw' | 'percent' | 'integer' | 'decimal1' | 'decimal2' | 'decimal3' | 'decimal4' | 'date' | 'datetime';
  border?: 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right';
}
type CellFormats = Record<string, CellFormat>;

/** 엑셀 폰트 이름 → 우리 FontFamily 토큰. 알 수 없으면 undefined. */
const FONT_NAME_MAP: Record<string, FontFamily> = {
  'pretendard variable': 'pretendard', 'pretendard': 'pretendard',
  'inter': 'inter',
  'arial': 'arial', 'helvetica': 'arial',
  'noto sans kr': 'noto-sans', 'noto sans': 'noto-sans', '맑은 고딕': 'noto-sans', 'malgun gothic': 'noto-sans',
  'georgia': 'georgia', 'times new roman': 'georgia', 'times': 'georgia',
  'jetbrains mono': 'jetbrains', 'consolas': 'jetbrains', 'monaco': 'jetbrains', 'menlo': 'jetbrains', 'courier new': 'jetbrains',
};

const FONT_TOKEN_TO_EXCEL: Record<FontFamily, string> = {
  pretendard: 'Pretendard',
  inter: 'Inter',
  arial: 'Arial',
  'noto-sans': 'Noto Sans KR',
  georgia: 'Georgia',
  jetbrains: 'JetBrains Mono',
};

export interface Merge { minR: number; maxR: number; minC: number; maxC: number }

export interface ImportedSheet {
  name: string;
  cells: Cells;
  merges?: Merge[];
  namedRanges?: NamedRanges;
  validations?: Validation[];
  comments?: Comments;
  /** A1 좌표 → 셀 서식 (글꼴/색/배경/정렬/숫자형식/테두리). 가능한 것만. */
  cellFormats?: CellFormats;
  /** 0-based 열 인덱스 → 픽셀 너비. 엑셀의 character-unit 너비를 px 추정. */
  colWidths?: Record<number, number>;
  /** 1-based 행 번호 → 픽셀 높이. */
  rowHeights?: Record<number, number>;
  /** 행 고정 개수 (0 = 없음). */
  freezeRows?: number;
  /** 열 고정 개수 (0 = 없음). */
  freezeCols?: number;
}

export interface ExportSheetInput {
  name: string;
  cells: Cells;
  cellFormats?: CellFormats;
  merges?: Merge[];
  validations?: Validation[];
  comments?: Comments;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  freezeRows?: number;
  freezeCols?: number;
}

export interface ExportXlsxOptions {
  namedRanges?: NamedRanges;
}

// ─────────────────────────────────────────────
// Import (.xlsx → 우리 형식)  ← SheetJS 그대로 (안정성 검증)
// ─────────────────────────────────────────────

const EXCEL_SHEET_NAME_MAX = 31;
const INLINE_VALIDATION_FORMULA_LIMIT = 255;
const VALIDATION_LIST_SHEET_BASE = '__cloudsheet_lists';

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').trim();
  return cleaned.slice(0, EXCEL_SHEET_NAME_MAX) || 'Sheet';
}

function uniqueSheetName(name: string, used: Set<string>): string {
  const base = sanitizeSheetName(name);
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = `${base.slice(0, EXCEL_SHEET_NAME_MAX - suffix.length)}${suffix}`;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function isInternalValidationListSheet(wb: XLSX.WorkBook, name: string): boolean {
  if (!new RegExp(`^${VALIDATION_LIST_SHEET_BASE.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?: \\(\\d+\\))?$`).test(name)) {
    return false;
  }
  const meta = wb.Workbook?.Sheets?.find((sheet) => sheet.name === name);
  return meta?.Hidden === 1 || meta?.Hidden === 2;
}

function quoteSheetNameForFormula(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

function parseSheetNamePrefix(raw: string): string {
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

function escapeFormulaString(value: string): string {
  return value.replace(/"/g, '""');
}

function parseFormulaStringArg(source: string, index: number): { value: string; next: number } | undefined {
  while (/\s/.test(source[index] ?? '')) index++;
  if (source[index] !== '"') return undefined;
  let value = '';
  index++;
  while (index < source.length) {
    const ch = source[index];
    if (ch === '"' && source[index + 1] === '"') {
      value += '"';
      index += 2;
      continue;
    }
    if (ch === '"') return { value, next: index + 1 };
    value += ch;
    index++;
  }
  return undefined;
}

function parseLiteralHyperlinkFormula(raw: string): { url: string; label?: string } | undefined {
  const match = raw.match(/^=\s*HYPERLINK\s*\(/i);
  if (!match) return undefined;
  let index = match[0].length;
  const first = parseFormulaStringArg(raw, index);
  if (!first) return undefined;
  index = first.next;
  while (/\s/.test(raw[index] ?? '')) index++;
  if (raw[index] === ')') return { url: first.value };
  if (raw[index] !== ',') return undefined;
  const second = parseFormulaStringArg(raw, index + 1);
  if (!second) return undefined;
  index = second.next;
  while (/\s/.test(raw[index] ?? '')) index++;
  if (raw[index] !== ')') return undefined;
  return { url: first.value, label: second.value };
}

function parseLiteralImageFormula(raw: string): { url: string } | undefined {
  const match = raw.match(/^=\s*IMAGE\s*\(/i);
  if (!match) return undefined;
  let index = match[0].length;
  const first = parseFormulaStringArg(raw, index);
  if (!first) return undefined;
  index = first.next;
  while (/\s/.test(raw[index] ?? '')) index++;
  if (raw[index] !== ')') return undefined;
  return { url: first.value };
}

function isHyperlinkFormula(raw: string): boolean {
  return /^=\s*HYPERLINK\s*\(/i.test(raw);
}

function isImageFormula(raw: string): boolean {
  return /^=\s*IMAGE\s*\(/i.test(raw);
}

function parseRangeReference(raw: string): {
  sheetName?: string;
  startCol: string;
  startRow: number;
  endCol: string;
  endRow: number;
} | undefined {
  const sheet = String.raw`(?:(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_]*))!)?`;
  const cell = String.raw`\$?([A-Z]+)\$?(\d+)`;
  const re = new RegExp(`^${sheet}${cell}(?::${sheet}${cell})?$`, 'i');
  const match = raw.trim().match(re);
  if (!match) return undefined;
  const firstSheet = match[1] ? parseSheetNamePrefix(`'${match[1]}'`) : match[2];
  const secondSheet = match[5] ? parseSheetNamePrefix(`'${match[5]}'`) : match[6];
  if (firstSheet && secondSheet && firstSheet !== secondSheet) return undefined;
  const startCol = match[3].toUpperCase();
  const startRow = Number(match[4]);
  const endCol = (match[7] ?? match[3]).toUpperCase();
  const endRow = Number(match[8] ?? match[4]);
  if (!Number.isInteger(startRow) || !Number.isInteger(endRow) || startRow < 1 || endRow < 1) {
    return undefined;
  }
  return { sheetName: firstSheet ?? secondSheet, startCol, startRow, endCol, endRow };
}

function appRangeReference(raw: string): string | undefined {
  const parsed = parseRangeReference(raw);
  if (!parsed?.sheetName) return undefined;
  const start = `${parsed.startCol}${parsed.startRow}`;
  const end = `${parsed.endCol}${parsed.endRow}`;
  return `${quoteSheetNameForFormula(parsed.sheetName)}!${start === end ? start : `${start}:${end}`}`;
}

function excelRangeReference(
  raw: string,
  exportNameByOriginal: Map<string, string>,
  defaultSheetName?: string,
): string | undefined {
  const parsed = parseRangeReference(raw);
  const originalSheet = parsed?.sheetName ?? defaultSheetName;
  if (!parsed || !originalSheet) return undefined;
  const exportedSheet = exportNameByOriginal.get(originalSheet);
  if (!exportedSheet) return undefined;
  const start = `$${parsed.startCol}$${parsed.startRow}`;
  const end = `$${parsed.endCol}$${parsed.endRow}`;
  return `${quoteSheetNameForFormula(exportedSheet)}!${start === end ? start : `${start}:${end}`}`;
}

function parseInlineListFormula(formula: unknown): string[] | undefined {
  if (typeof formula !== 'string') return undefined;
  const trimmed = formula.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return undefined;
  const inner = trimmed.slice(1, -1).replace(/""/g, '"');
  const [row] = parseCsv(inner);
  const items = (row ?? []).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function cellDisplayText(cell: ExcelJS.Cell): string {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateLiteral(value);
  if (typeof value === 'object') {
    if ('result' in value && (value as { result?: unknown }).result !== undefined) {
      return String((value as { result?: unknown }).result ?? '');
    }
    if ('text' in value && (value as { text?: unknown }).text !== undefined) {
      return String((value as { text?: unknown }).text ?? '');
    }
    if ('richText' in value && Array.isArray((value as { richText?: unknown }).richText)) {
      return ((value as { richText: Array<{ text?: unknown }> }).richText)
        .map((part) => String(part.text ?? ''))
        .join('');
    }
  }
  return String(value);
}

function parseListSourceFormula(formula: unknown, currentSheetName: string): {
  sheetName: string;
  startCol: string;
  startRow: number;
  endCol: string;
  endRow: number;
} | undefined {
  if (typeof formula !== 'string') return undefined;
  const trimmed = formula.trim().replace(/^=/, '');
  const parsed = parseRangeReference(trimmed);
  if (!parsed) return undefined;
  return {
    sheetName: parsed.sheetName ?? currentSheetName,
    startCol: parsed.startCol,
    startRow: parsed.startRow,
    endCol: parsed.endCol,
    endRow: parsed.endRow,
  };
}

function collectListSourceItems(
  wb: ExcelJS.Workbook,
  source: {
    sheetName: string;
    startCol: string;
    startRow: number;
    endCol: string;
    endRow: number;
  },
): string[] | undefined {
  const ws = wb.getWorksheet(source.sheetName);
  if (!ws) return undefined;
  const minR = Math.min(source.startRow, source.endRow);
  const maxR = Math.max(source.startRow, source.endRow);
  const minC = Math.min(colToIdx(source.startCol), colToIdx(source.endCol)) + 1;
  const maxC = Math.max(colToIdx(source.startCol), colToIdx(source.endCol)) + 1;
  const items: string[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const text = cellDisplayText(ws.getCell(r, c)).trim();
      if (text !== '') items.push(text);
    }
  }
  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

function resolveListSourceItems(
  wb: ExcelJS.Workbook,
  formula: unknown,
  currentSheetName: string,
): string[] | undefined {
  const parsed = parseListSourceFormula(formula, currentSheetName);
  return parsed ? collectListSourceItems(wb, parsed) : undefined;
}

function namedRangeToken(formula: unknown): string | undefined {
  if (typeof formula !== 'string') return undefined;
  const token = formula.trim().replace(/^=/, '');
  if (token === '' || parseRangeReference(token)) return undefined;
  if (/[\s+\-*/^&=(),:{}[\]"'!]/.test(token)) return undefined;
  return token;
}

function namedRangeRanges(wb: ExcelJS.Workbook, name: string): string[] {
  const direct = wb.definedNames.getRanges(name).ranges;
  if (direct.length > 0) return direct;
  const found = wb.definedNames.model.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  return found?.ranges ?? [];
}

function resolveNamedListSourceItems(wb: ExcelJS.Workbook, formula: unknown): string[] | undefined {
  const token = namedRangeToken(formula);
  if (!token) return undefined;
  const items: string[] = [];
  for (const range of namedRangeRanges(wb, token)) {
    const parsed = parseListSourceFormula(range, '');
    if (!parsed) continue;
    const rangeItems = collectListSourceItems(wb, parsed);
    if (rangeItems) items.push(...rangeItems);
  }
  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

function rangeFromAddress(address: string): Validation['range'] | undefined {
  const parsed = parseRangeReference(address);
  if (!parsed) return undefined;
  const c1 = colToIdx(parsed.startCol);
  const c2 = colToIdx(parsed.endCol);
  return {
    minR: Math.min(parsed.startRow, parsed.endRow) - 1,
    maxR: Math.max(parsed.startRow, parsed.endRow) - 1,
    minC: Math.min(c1, c2),
    maxC: Math.max(c1, c2),
  };
}

function validationId(index: number): string {
  return `xlsx_vd_${index}`;
}

function importDataValidation(
  address: string,
  dv: ExcelJS.DataValidation,
  index: number,
  wb: ExcelJS.Workbook,
  currentSheetName: string,
): Validation | undefined {
  if (dv.type !== 'list') return undefined;
  const items = parseInlineListFormula(dv.formulae?.[0])
    ?? resolveListSourceItems(wb, dv.formulae?.[0], currentSheetName)
    ?? resolveNamedListSourceItems(wb, dv.formulae?.[0]);
  const range = rangeFromAddress(address);
  if (!items || !range) return undefined;
  const upper = items.map((item) => item.toUpperCase());
  const isCheckbox = items.length === 2 && upper.includes('TRUE') && upper.includes('FALSE');
  return {
    id: validationId(index),
    range,
    kind: isCheckbox ? 'checkbox' : 'list',
    items: isCheckbox ? ['TRUE', 'FALSE'] : items,
  };
}

function extractDataValidations(ws: ExcelJS.Worksheet): Validation[] {
  const model = (ws as unknown as {
    dataValidations?: { model?: Record<string, ExcelJS.DataValidation | undefined> };
  }).dataValidations?.model ?? {};
  const out: Validation[] = [];
  for (const [address, dv] of Object.entries(model)) {
    if (!dv) continue;
    const imported = importDataValidation(address, dv, out.length, ws.workbook, ws.name);
    if (imported) out.push(imported);
  }
  return out;
}

function escapeInlineListItem(item: string): string {
  return item.replace(/"/g, '""');
}

function inlineListFormula(items: string[]): string {
  return `"${items.map(escapeInlineListItem).join(',')}"`;
}

function extractCellNoteText(note: ExcelJS.Cell['note']): string | undefined {
  if (!note) return undefined;
  if (typeof note === 'string') return note;
  const texts = note.texts ?? [];
  const text = texts.map((part) => part.text ?? '').join('');
  return text.trim() === '' ? undefined : text;
}

function exportDataValidation(
  rule: Validation,
  rangeFormulaForLongList?: (items: string[]) => string,
): ExcelJS.DataValidation | undefined {
  if (rule.kind !== 'list' && rule.kind !== 'checkbox') return undefined;
  const items = rule.kind === 'checkbox' ? ['TRUE', 'FALSE'] : rule.items;
  if (items.length === 0) return undefined;
  const inlineFormula = inlineListFormula(items);
  const formula = inlineFormula.length <= INLINE_VALIDATION_FORMULA_LIMIT
    ? inlineFormula
    : rangeFormulaForLongList?.(items);
  if (!formula) return undefined;
  return {
    type: 'list',
    allowBlank: true,
    showErrorMessage: true,
    formulae: [formula],
  };
}

function applyDataValidations(
  ws: ExcelJS.Worksheet,
  validations: Validation[] | undefined,
  rangeFormulaForLongList?: (items: string[]) => string,
): void {
  for (const rule of validations ?? []) {
    const dv = exportDataValidation(rule, rangeFormulaForLongList);
    if (!dv) continue;
    for (let r = rule.range.minR; r <= rule.range.maxR; r++) {
      for (let c = rule.range.minC; c <= rule.range.maxC; c++) {
        ws.getCell(r + 1, c + 1).dataValidation = dv;
      }
    }
  }
}

function rewriteFormulaSheetNames(formula: string, exportNameByOriginal: Map<string, string>): string {
  let out = '';
  let i = 0;
  let inDoubleString = false;

  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      out += ch;
      if (formula[i + 1] === '"') {
        out += '"';
        i += 2;
        continue;
      }
      inDoubleString = !inDoubleString;
      i++;
      continue;
    }

    if (inDoubleString) {
      out += ch;
      i++;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      let name = '';
      while (j < formula.length) {
        if (formula[j] === "'" && formula[j + 1] === "'") {
          name += "'";
          j += 2;
          continue;
        }
        if (formula[j] === "'") break;
        name += formula[j++];
      }
      if (j < formula.length && formula[j + 1] === '!') {
        const exported = exportNameByOriginal.get(name);
        out += exported ? `${quoteSheetNameForFormula(exported)}!` : formula.slice(i, j + 2);
        i = j + 2;
        continue;
      }
    }

    const bare = formula.slice(i).match(/^([A-Za-z_][A-Za-z0-9_]*)!/);
    if (bare) {
      const exported = exportNameByOriginal.get(bare[1]);
      out += exported ? `${quoteSheetNameForFormula(exported)}!` : bare[0];
      i += bare[0].length;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

function getCellHyperlink(cell: ExcelJS.Cell): { url: string; label: string } | undefined {
  const value = cell.value as unknown;
  const hyperlink = typeof cell.hyperlink === 'string'
    ? cell.hyperlink
    : value && typeof value === 'object' && 'hyperlink' in value && typeof (value as { hyperlink?: unknown }).hyperlink === 'string'
      ? (value as { hyperlink: string }).hyperlink
      : undefined;
  if (!hyperlink) return undefined;
  const textValue = value && typeof value === 'object' && 'text' in value
    ? (value as { text?: unknown }).text
    : undefined;
  const label = String(textValue ?? cell.text ?? hyperlink);
  return { url: hyperlink, label };
}

function getCellDateValue(cell: ExcelJS.Cell): Date | undefined {
  const value = cell.value as unknown;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'result' in value && (value as { result?: unknown }).result instanceof Date) {
    return (value as { result: Date }).result;
  }
  return undefined;
}

function parseDateLiteral(raw: string): Date | undefined {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return undefined;
  const [, y, m, d, hh, mm, ss] = match;
  const hasTime = hh !== undefined;
  const hour = hasTime ? Number(hh) : 12;
  const minute = hasTime ? Number(mm) : 0;
  const second = hasTime && ss !== undefined ? Number(ss) : 0;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hour, minute, second));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d) ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return undefined;
  }
  return date;
}

function isSafeNumericLiteral(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed !== raw) return false;
  if (!/^[+-]?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return false;
  if (!Number.isFinite(Number(trimmed))) return false;

  const signless = trimmed.replace(/^[+-]/, '');
  const integerPart = signless.split(/[.eE]/)[0];
  if (integerPart.length > 1 && integerPart.startsWith('0')) return false;
  if (integerPart.replace(/^0$/, '').length > 15) return false;
  return true;
}

function coerceCellValue(raw: string, fmt?: CellFormat): ExcelJS.CellValue {
  if (fmt?.numberFmt === 'date' || fmt?.numberFmt === 'datetime') {
    const date = parseDateLiteral(raw);
    if (date) return date;
  }
  if (raw === 'TRUE' || raw === 'FALSE') return raw === 'TRUE';
  if (isSafeNumericLiteral(raw)) return Number(raw);
  return raw;
}

function coerceFormulaResult(raw: string, fmt?: CellFormat): ExcelJS.CellValue {
  if (raw.startsWith(LINK_SENTINEL)) {
    try {
      const payload = JSON.parse(raw.slice(LINK_SENTINEL.length)) as { label?: unknown; url?: unknown };
      const label = payload.label == null ? '' : String(payload.label);
      return label || String(payload.url ?? '');
    } catch {
      return '';
    }
  }

  if (raw.startsWith(IMAGE_SENTINEL)) {
    const url = raw.slice(IMAGE_SENTINEL.length);
    return isSafeImageSrc(url) ? url : '#REF!';
  }

  if (raw.startsWith(SPARKLINE_SENTINEL)) {
    return 'Sparkline';
  }

  if (raw.startsWith(SPILL_SENTINEL)) {
    try {
      const grid = JSON.parse(raw.slice(SPILL_SENTINEL.length)) as unknown[][];
      const first = Array.isArray(grid) && Array.isArray(grid[0]) ? grid[0][0] : '';
      return coerceCellValue(first == null ? '' : String(first), fmt);
    } catch {
      return '';
    }
  }

  if (raw.startsWith(AI_SENTINEL)) {
    const body = raw.slice(AI_SENTINEL.length);
    if (body.startsWith(AI_ERROR_PREFIX)) return '#ERROR';
    if (body.startsWith(AI_LOADING_PREFIX)) return 'AI loading';
    return body;
  }

  if (raw.startsWith('__CLOUDSHEET_')) return '';
  return coerceCellValue(raw, fmt);
}

function formatDateLiteral(date: Date): string {
  const ymd = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0;
  if (!hasTime) return ymd;
  const hm = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  return date.getUTCSeconds() === 0 ? `${ymd} ${hm}` : `${ymd} ${hm}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsText(file);
  });
}

async function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

export async function importXlsxFile(file: File): Promise<ImportedSheet[]> {
  if (/\.(csv|tsv)$/i.test(file.name)) {
    const delimiter = /\.tsv$/i.test(file.name) ? '\t' : ',';
    const name = file.name.replace(/\.[^.]+$/, '') || 'CSV';
    return [importCsvText(await readFileText(file), name, delimiter)];
  }
  const data = await readFileArrayBuffer(file);
  return importXlsxBuffer(data);
}

export function importCsvText(text: string, name = 'CSV', delimiter = ','): ImportedSheet {
  const rows = parseCsv(text, delimiter);
  const cells: Cells = {};
  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== '') cells[`${idxToCol(c)}${r + 1}`] = value;
    });
  });
  return { name, cells, merges: [] };
}

/**
 * Buffer 기반 import — 테스트·서버사이드용. importXlsxFile 의 내부 구현.
 * SheetJS 로 값/수식/병합, ExcelJS 로 서식/열·행 크기/freeze 추출.
 */
export async function importXlsxBuffer(data: ArrayBuffer): Promise<ImportedSheet[]> {
  // SheetJS — 값/수식/병합 추출 (안정적).
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const importSheetNames = wb.SheetNames.filter((name) => !isInternalValidationListSheet(wb, name));
  const base = importSheetNames.map((name) => extractSheet(wb.Sheets[name], name));
  const namedRanges = extractNamedRanges(wb);
  if (base.length > 0 && Object.keys(namedRanges).length > 0) {
    base[0].namedRanges = namedRanges;
  }

  // ExcelJS — 서식/열너비/행높이/freeze 추가 추출. 실패해도 base 반환.
  try {
    const ewb = new ExcelJS.Workbook();
    await ewb.xlsx.load(data);
    for (const sheet of base) {
      const ews = ewb.getWorksheet(sheet.name);
      if (ews) enrichWithStyles(sheet, ews);
    }
  } catch {
    // ExcelJS 파싱 실패해도 base (값+병합) 는 유지.
  }
  return base;
}

function extractNamedRanges(wb: XLSX.WorkBook): NamedRanges {
  const out: NamedRanges = {};
  for (const def of wb.Workbook?.Names ?? []) {
    if (!def.Name || def.Name.startsWith('_xlnm.')) continue;
    if (def.Sheet !== undefined && out[def.Name] !== undefined) continue;
    const range = appRangeReference(def.Ref);
    if (range) out[def.Name] = range;
  }
  return out;
}

function extractSheet(ws: XLSX.WorkSheet | undefined, name: string): ImportedSheet {
  const cells: Cells = {};
  if (!ws) return { name, cells, merges: [] };
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue;
    const cell = ws[key] as XLSX.CellObject;
    if (cell.f) {
      cells[key] = '=' + normalizeFormula(cell.f);
    } else if (cell.v instanceof Date) {
      cells[key] = formatDateLiteral(cell.v);
    } else if (cell.v !== undefined && cell.v !== null) {
      cells[key] = String(cell.v);
    }
  }
  // SheetJS 의 셀 병합: '!merges' 키에 Array<{ s:{r,c}, e:{r,c} }> (0-based, inclusive)
  const rawMerges = (ws as XLSX.WorkSheet & { '!merges'?: XLSX.Range[] })['!merges'];
  const merges: Merge[] = (rawMerges ?? []).map((r) => ({
    minR: r.s.r, maxR: r.e.r, minC: r.s.c, maxC: r.e.c,
  }));
  return { name, cells, merges };
}

/**
 * ExcelJS 워크시트의 서식 정보를 ImportedSheet 에 mutate.
 *  - 셀 서식 (글꼴/색/배경/정렬/numFmt/테두리) — 가능한 것만 우리 토큰으로 매핑
 *  - 열 너비 (엑셀 character unit → px 추정)
 *  - 행 높이 (point → px)
 *  - freeze (ws.views[0].xSplit/ySplit)
 */
function enrichWithStyles(sheet: ImportedSheet, ews: ExcelJS.Worksheet): void {
  const cellFormats: CellFormats = {};
  const colWidths: Record<number, number> = {};
  const rowHeights: Record<number, number> = {};
  const comments: Comments = {};

  // 열 너비 — character units → px (대략 width * 7 + 5)
  ews.columns?.forEach((col, idx) => {
    if (typeof col?.width === 'number' && Number.isFinite(col.width)) {
      colWidths[idx] = Math.round(col.width * 7 + 5);
    }
  });

  // 행 높이 + 셀 서식
  ews.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (typeof row.height === 'number' && Number.isFinite(row.height)) {
      // pt → px (1pt ≈ 1.333px)
      rowHeights[rowNum - 1] = Math.round(row.height * 1.333);
    }
    row.eachCell({ includeEmpty: false }, (cell) => {
      const ref = cell.address; // 'A1' 형식
      const hyperlink = getCellHyperlink(cell);
      if (hyperlink) {
        if (isSafeHref(hyperlink.url)) {
          sheet.cells[ref] = `=HYPERLINK("${escapeFormulaString(hyperlink.url)}","${escapeFormulaString(hyperlink.label)}")`;
        } else if (!sheet.cells[ref]) {
          sheet.cells[ref] = hyperlink.label;
        }
      }
      const fmt = extractCellFormat(cell);
      if (fmt) {
        const existing = sheet.cells[ref] ?? '';
        const isFormulaCell = existing.startsWith('=');
        if (!isFormulaCell && (fmt.numberFmt === 'date' || fmt.numberFmt === 'datetime')) {
          const dateValue = getCellDateValue(cell);
          if (dateValue) {
            const literal = formatDateLiteral(dateValue);
            sheet.cells[ref] = fmt.numberFmt === 'date' ? literal.slice(0, 10) : literal;
          } else if (fmt.numberFmt === 'date' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(sheet.cells[ref] ?? '')) {
            sheet.cells[ref] = sheet.cells[ref].slice(0, 10);
          }
        }
        cellFormats[ref] = fmt;
      }
      const note = extractCellNoteText(cell.note);
      if (note) comments[ref] = note;
    });
  });

  // Freeze pane — views[0].state === 'frozen' 이면 xSplit/ySplit 가 freeze 위치 (1-based 분리 지점)
  const view = ews.views?.[0];
  let freezeRows = 0;
  let freezeCols = 0;
  if (view && view.state === 'frozen') {
    freezeRows = view.ySplit ?? 0;
    freezeCols = view.xSplit ?? 0;
  }

  if (Object.keys(cellFormats).length > 0) sheet.cellFormats = cellFormats;
  if (Object.keys(colWidths).length > 0) sheet.colWidths = colWidths;
  if (Object.keys(rowHeights).length > 0) sheet.rowHeights = rowHeights;
  if (Object.keys(comments).length > 0) sheet.comments = comments;
  if (freezeRows > 0) sheet.freezeRows = freezeRows;
  if (freezeCols > 0) sheet.freezeCols = freezeCols;
  const validations = extractDataValidations(ews);
  if (validations.length > 0) sheet.validations = validations;
}

/** ExcelJS cell → 우리 CellFormat. 빈 결과면 undefined. */
function extractCellFormat(cell: ExcelJS.Cell): CellFormat | undefined {
  const out: CellFormat = {};

  const font = cell.font;
  if (font?.bold) out.bold = true;
  if (font?.italic) out.italic = true;
  if (font?.underline) out.underline = true;
  if (font?.strike) out.strikethrough = true;
  if (font?.color?.argb) out.textColor = argbToHex(font.color.argb);
  if (typeof font?.size === 'number' && Number.isFinite(font.size)) {
    out.fontSize = Math.round(font.size);
  }
  if (font?.name) {
    const tok = FONT_NAME_MAP[font.name.toLowerCase().trim()];
    if (tok) out.fontFamily = tok;
  }

  const fill = cell.fill as ExcelJS.FillPattern | undefined;
  if (fill?.type === 'pattern' && fill.fgColor?.argb) {
    const bg = argbToHex(fill.fgColor.argb);
    if (bg) out.bgColor = bg;
  }

  const align = cell.alignment?.horizontal;
  if (align === 'left' || align === 'center' || align === 'right') {
    out.align = align;
  }
  const vert = cell.alignment?.vertical;
  if (vert === 'top' || vert === 'middle' || vert === 'bottom') {
    out.vAlign = vert;
  }
  if (cell.alignment?.wrapText) out.wrap = 'wrap';

  const tok = excelNumFmtToToken(cell.numFmt);
  if (tok) out.numberFmt = tok;

  // 테두리 — ExcelJS 는 4면 개별 정보만 — 'all'(=4면 다) vs 단일 면만 매핑.
  // 'outer' 는 우리 토큰 정의상 'all' 과 결과 동일하므로 별도 매핑 안 함.
  const b = cell.border;
  if (b?.top && b?.bottom && b?.left && b?.right) out.border = 'all';
  else if (b?.top) out.border = 'top';
  else if (b?.bottom) out.border = 'bottom';
  else if (b?.left) out.border = 'left';
  else if (b?.right) out.border = 'right';

  return Object.keys(out).length > 0 ? out : undefined;
}

/** ExcelJS 의 ARGB(8자리 hex, alpha 첫 2) → #RRGGBB. */
function argbToHex(argb: string): string | undefined {
  if (!argb || argb.length < 6) return undefined;
  // 8자리이면 alpha 떼고, 6자리이면 그대로.
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  return '#' + hex.toUpperCase();
}

/**
 * 엑셀/구글시트 → 우리 수식 별칭 정규화.
 * 새 함수(XLOOKUP, IFERROR, ROUNDUP 등)는 우리도 같은 이름을 쓰므로 별도 매핑 불필요.
 * AVG 만 우리 고유 별칭 — AVERAGE 들어오면 AVG 로 변환.
 */
function normalizeFormula(f: string): string {
  return f.replace(/\bAVERAGE\b/gi, 'AVG');
}

// ─────────────────────────────────────────────
// Export — ExcelJS (서식 포함)
// ─────────────────────────────────────────────

export async function exportXlsxBuffer(
  sheets: ExportSheetInput[],
  options: ExportXlsxOptions = {},
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ancano cloud';
  wb.created = new Date();
  const usedSheetNames = new Set<string>();
  const allSheetsByName = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.cells]));
  const exportNames = sheets.map((sheet) => uniqueSheetName(sheet.name, usedSheetNames));
  const exportNameByOriginal = new Map<string, string>();
  sheets.forEach((sheet, idx) => {
    if (!exportNameByOriginal.has(sheet.name)) exportNameByOriginal.set(sheet.name, exportNames[idx]);
  });
  let validationListSheet: ExcelJS.Worksheet | undefined;
  let validationListRow = 1;
  const rangeFormulaForLongList = (items: string[]): string => {
    if (!validationListSheet) {
      validationListSheet = wb.addWorksheet(uniqueSheetName(VALIDATION_LIST_SHEET_BASE, usedSheetNames));
      validationListSheet.state = 'veryHidden';
    }
    const start = validationListRow;
    items.forEach((item, idx) => {
      validationListSheet!.getCell(start + idx, 1).value = item;
    });
    validationListRow += items.length + 1;
    return `${quoteSheetNameForFormula(validationListSheet.name)}!$A$${start}:$A$${start + items.length - 1}`;
  };

  for (const [sheetIdx, sheet] of sheets.entries()) {
    const safeName = exportNames[sheetIdx];
    const ws = wb.addWorksheet(safeName);

    let maxColIdx = -1;
    for (const [ref, raw] of Object.entries(sheet.cells)) {
      const match = ref.match(/^([A-Z]+)(\d+)$/);
      if (!match) continue;
      const col = colToIdx(match[1]) + 1;  // exceljs는 1-based
      const row = Number(match[2]);
      maxColIdx = Math.max(maxColIdx, col - 1);
      const cell = ws.getCell(row, col);

      // 값/수식
      if (raw.startsWith('=')) {
        const hyperlinkMatch = parseLiteralHyperlinkFormula(raw);
        if (hyperlinkMatch) {
          if (!isSafeHref(hyperlinkMatch.url)) {
            cell.value = '#REF!';
          } else {
            const label = hyperlinkMatch.label ?? hyperlinkMatch.url;
            cell.value = {
              formula: rewriteFormulaSheetNames(raw.slice(1), exportNameByOriginal),
              result: label,
            };
            try { cell.hyperlink = hyperlinkMatch.url; } catch { /* exceljs 가 거부하면 skip */ }
          }
        } else {
          // IMAGE(url) 특별 처리 — Microsoft 365 의 IMAGE 가 호환되지만 이전 버전엔 #NAME?
          // → result 에 URL 텍스트 + hyperlink 도 함께 저장하여 클릭 가능한 fallback 보장.
          const imgMatch = parseLiteralImageFormula(raw);
          if (imgMatch) {
            const url = imgMatch.url;
            if (!isSafeImageSrc(url)) {
              cell.value = '#REF!';
            } else {
              cell.value = {
                formula: rewriteFormulaSheetNames(raw.slice(1), exportNameByOriginal),
                result: url,
              };
              try { cell.hyperlink = url; } catch { /* exceljs 가 거부하면 skip */ }
            }
          } else {
            const evaluated = evalCell(ref, sheet.cells, {
              currentName: sheet.name,
              allSheets: allSheetsByName,
              namedRanges: options.namedRanges,
            });
            if ((isHyperlinkFormula(raw) || isImageFormula(raw)) && evaluated === '#REF!') {
              cell.value = '#REF!';
            } else {
              cell.value = {
                formula: rewriteFormulaSheetNames(raw.slice(1).replace(/\bAVG\b/gi, 'AVERAGE'), exportNameByOriginal),
                result: coerceFormulaResult(evaluated, sheet.cellFormats?.[ref]),
                // result는 비워두면 excel이 열 때 자동 계산
              };
            }
          }
        }
      } else {
        cell.value = coerceCellValue(raw, sheet.cellFormats?.[ref]);
      }

      // 서식
      const fmt = sheet.cellFormats?.[ref];
      if (fmt) applyFormat(cell, fmt);
    }

    // 열 자동 너비 (대략)
    for (const key of Object.keys(sheet.colWidths ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx)) maxColIdx = Math.max(maxColIdx, idx);
    }
    for (let idx = 0; idx <= maxColIdx; idx++) {
      const px = sheet.colWidths?.[idx];
      ws.getColumn(idx + 1).width = typeof px === 'number' && Number.isFinite(px)
        ? Math.max(1, Math.round(((px - 5) / 7) * 100) / 100)
        : 15;
    }
    for (const [key, px] of Object.entries(sheet.rowHeights ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx) && typeof px === 'number' && Number.isFinite(px)) {
        ws.getRow(idx + 1).height = Math.max(1, Math.round((px / 1.333) * 100) / 100);
      }
    }
    for (const [ref, text] of Object.entries(sheet.comments ?? {})) {
      if (text.trim() === '') continue;
      try {
        ws.getCell(ref).note = text;
      } catch {
        // Invalid refs are ignored; comments are metadata and must not block export.
      }
    }
    if ((sheet.freezeRows ?? 0) > 0 || (sheet.freezeCols ?? 0) > 0) {
      ws.views = [{
        state: 'frozen',
        xSplit: Math.max(0, sheet.freezeCols ?? 0),
        ySplit: Math.max(0, sheet.freezeRows ?? 0),
      }];
    }

    // 셀 병합 — ExcelJS 는 1-based, (top, left, bottom, right)
    for (const m of sheet.merges ?? []) {
      try {
        ws.mergeCells(m.minR + 1, m.minC + 1, m.maxR + 1, m.maxC + 1);
      } catch {
        // 영역이 겹치면 던짐 — 무시하고 진행
      }
    }
    applyDataValidations(ws, sheet.validations, rangeFormulaForLongList);
  }

  if (wb.worksheets.length === 0) {
    wb.addWorksheet('Sheet1');
  }

  const defaultSheetName = sheets[0]?.name;
  for (const [name, range] of Object.entries(options.namedRanges ?? {})) {
    const excelRange = excelRangeReference(range, exportNameByOriginal, defaultSheetName);
    if (!excelRange) continue;
    try {
      wb.definedNames.add(excelRange, name);
    } catch {
      // Excel-compatible name validation varies; invalid names are skipped.
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buffer as ArrayBufferLike);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

export async function exportXlsxFile(
  sheets: ExportSheetInput[],
  fileName: string,
  options: ExportXlsxOptions = {},
): Promise<void> {
  const buffer = await exportXlsxBuffer(sheets, options);
  const safeFile = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, safeFile);
}

function applyFormat(cell: ExcelJS.Cell, fmt: CellFormat): void {
  // 글꼴 (B/I/U/S/색/이름/크기) — 하나라도 있으면 font 설정
  if (
    fmt.bold || fmt.italic || fmt.underline || fmt.strikethrough ||
    fmt.textColor || fmt.fontFamily || fmt.fontSize
  ) {
    cell.font = {
      bold: fmt.bold || undefined,
      italic: fmt.italic || undefined,
      underline: fmt.underline || undefined,
      strike: fmt.strikethrough || undefined,
      color: fmt.textColor ? { argb: 'FF' + fmt.textColor.replace('#', '').toUpperCase() } : undefined,
      name: fmt.fontFamily ? FONT_TOKEN_TO_EXCEL[fmt.fontFamily] : undefined,
      size: fmt.fontSize || undefined,
    };
  }
  // 배경색
  if (fmt.bgColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + fmt.bgColor.replace('#', '').toUpperCase() },
    };
  }
  // 정렬 (가로 + 세로 + 줄바꿈)
  if (fmt.align || fmt.vAlign || fmt.wrap) {
    cell.alignment = {
      horizontal: fmt.align ?? undefined,
      vertical: fmt.vAlign ?? 'middle',
      wrapText: fmt.wrap === 'wrap' ? true : undefined,
    };
  }
  // 숫자 형식
  if (fmt.numberFmt) {
    cell.numFmt = numFmtFor(fmt.numberFmt);
  }
  // 테두리
  if (fmt.border) {
    cell.border = bordersFor(fmt.border);
  }
}

function numFmtFor(fmt: NonNullable<CellFormat['numberFmt']>): string {
  switch (fmt) {
    case 'integer':       return '#,##0';
    case 'decimal1':      return '0.0';
    case 'decimal2':      return '0.00';
    case 'decimal3':      return '0.000';
    case 'decimal4':      return '0.0000';
    case 'currency-krw':  return '"₩"#,##0';
    case 'percent':       return '0.0%';
    case 'date':          return 'yyyy-mm-dd';
    case 'datetime':      return 'yyyy-mm-dd hh:mm';
    default:              return 'General';
  }
}

function bordersFor(b: NonNullable<CellFormat['border']>): Partial<ExcelJS.Borders> {
  const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FF222222' } };
  if (b === 'all' || b === 'outer') {
    return { top: thin, bottom: thin, left: thin, right: thin };
  }
  if (b === 'top')    return { top: thin };
  if (b === 'bottom') return { bottom: thin };
  if (b === 'left')   return { left: thin };
  if (b === 'right')  return { right: thin };
  return {};
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// idxToCol 이 import 만 되고 사용 안 되면 lint warning — 미래 호환을 위해 유지
void idxToCol;

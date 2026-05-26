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
import JSZip from 'jszip';
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
import type { NumericValidationOperator, Validation } from './validation';
import type { CondOp, CondRule } from './condFormat';
import { isSafeHref, isSafeImageSrc } from '@/lib/safeUrl';
import { parseCsv } from '@/lib/csv';

type Cells = Record<string, string>;
type NamedRanges = Record<string, string>;
type Comments = Record<string, string>;
type SheetVisibility = 'visible' | 'hidden' | 'veryHidden';
type HiddenDimensionMap = Record<number, boolean>;
type OutlineLevelMap = Record<number, number>;
const EXCEL_ERROR_LITERALS = new Set<ExcelJS.CellErrorValue['error']>([
  '#N/A',
  '#REF!',
  '#NAME?',
  '#DIV/0!',
  '#NULL!',
  '#VALUE!',
  '#NUM!',
]);
export interface XlsxImportLimits {
  maxFileBytes: number;
  maxSheets: number;
  maxCells: number;
  maxZipEntries: number;
  maxZipEntryBytes: number;
  maxZipUncompressedBytes: number;
}
export interface XlsxImportOptions {
  limits?: Partial<XlsxImportLimits>;
}
export const DEFAULT_XLSX_IMPORT_LIMITS: XlsxImportLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  maxSheets: 128,
  maxCells: 750_000,
  maxZipEntries: 12_000,
  maxZipEntryBytes: 32 * 1024 * 1024,
  maxZipUncompressedBytes: 250 * 1024 * 1024,
};
type SheetProtectionBooleanKey =
  | 'sheet'
  | 'objects'
  | 'scenarios'
  | 'selectLockedCells'
  | 'selectUnlockedCells'
  | 'formatCells'
  | 'formatColumns'
  | 'formatRows'
  | 'insertColumns'
  | 'insertRows'
  | 'insertHyperlinks'
  | 'deleteColumns'
  | 'deleteRows'
  | 'sort'
  | 'autoFilter'
  | 'pivotTables';

export type SheetProtection = Partial<Record<SheetProtectionBooleanKey, boolean>> & {
  algorithmName?: string;
  hashValue?: string;
  saltValue?: string;
  spinCount?: number;
};

interface CellProtection {
  locked?: boolean;
  hidden?: boolean;
}

export interface TableColumnFilter {
  values?: string[];
  customFilters?: Array<{
    val: string;
    operator?: string;
  }>;
  and?: boolean;
}

export interface SheetSortCondition {
  ref: string;
  descending?: boolean;
  sortBy?: string;
  customList?: string;
  dxfId?: number;
  iconSet?: string;
  iconId?: number;
}

export interface SheetSortState {
  ref?: string;
  caseSensitive?: boolean;
  columnSort?: boolean;
  sortMethod?: string;
  conditions: SheetSortCondition[];
}

export interface SheetTable {
  name: string;
  displayName?: string;
  ref: string;
  headerRow?: boolean;
  totalsRow?: boolean;
  style?: {
    theme?: string;
    showFirstColumn?: boolean;
    showLastColumn?: boolean;
    showRowStripes?: boolean;
    showColumnStripes?: boolean;
  };
  columns?: Array<{
    name: string;
    filterButton?: boolean;
    filter?: TableColumnFilter;
    totalsRowLabel?: string;
    totalsRowFunction?: string;
    totalsRowFormula?: string;
  }>;
}

export interface XlsxEmbeddedChart {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie';
  orientation: 'columns' | 'rows';
  range: Merge;
  title?: string;
  palette?: string;
  collapsed?: boolean;
}

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
  protection?: CellProtection;
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

export interface SheetViewOptions {
  showGridLines?: boolean;
  showRowColHeaders?: boolean;
  rightToLeft?: boolean;
  zoomScale?: number;
}

export interface SheetPageMargins {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  header?: number;
  footer?: number;
}

export interface SheetPageSetup {
  margins?: SheetPageMargins;
  orientation?: 'portrait' | 'landscape';
  paperSize?: number;
  scale?: number;
  fitToPage?: boolean;
  fitToWidth?: number;
  fitToHeight?: number;
  pageOrder?: 'downThenOver' | 'overThenDown';
  blackAndWhite?: boolean;
  draft?: boolean;
  cellComments?: 'atEnd' | 'asDisplayed' | 'None';
  errors?: 'dash' | 'blank' | 'NA' | 'displayed';
  firstPageNumber?: number;
  horizontalCentered?: boolean;
  verticalCentered?: boolean;
  showRowColHeaders?: boolean;
  showGridLines?: boolean;
  horizontalDpi?: number;
  verticalDpi?: number;
  printArea?: string;
  printTitlesRow?: string;
  printTitlesColumn?: string;
}

export interface SheetHeaderFooter {
  differentFirst?: boolean;
  differentOddEven?: boolean;
  oddHeader?: string;
  oddFooter?: string;
  evenHeader?: string;
  evenFooter?: string;
  firstHeader?: string;
  firstFooter?: string;
}

export interface SheetOutlineOptions {
  rowLevels?: OutlineLevelMap;
  colLevels?: OutlineLevelMap;
  summaryBelow?: boolean;
  summaryRight?: boolean;
}

export interface ImportedSheet {
  name: string;
  cells: Cells;
  sheetState?: SheetVisibility;
  tabColor?: string;
  sheetView?: SheetViewOptions;
  pageSetup?: SheetPageSetup;
  headerFooter?: SheetHeaderFooter;
  sheetOutline?: SheetOutlineOptions;
  hiddenCols?: HiddenDimensionMap;
  hiddenRows?: HiddenDimensionMap;
  autoFilterRef?: string;
  autoFilterColumns?: Array<TableColumnFilter | undefined>;
  sortState?: SheetSortState;
  sheetProtection?: SheetProtection;
  tables?: SheetTable[];
  embeddedCharts?: XlsxEmbeddedChart[];
  condRules?: CondRule[];
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
  sheetState?: SheetVisibility;
  tabColor?: string;
  sheetView?: SheetViewOptions;
  pageSetup?: SheetPageSetup;
  headerFooter?: SheetHeaderFooter;
  sheetOutline?: SheetOutlineOptions;
  cellFormats?: CellFormats;
  merges?: Merge[];
  validations?: Validation[];
  comments?: Comments;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  hiddenCols?: HiddenDimensionMap;
  hiddenRows?: HiddenDimensionMap;
  freezeRows?: number;
  freezeCols?: number;
  autoFilterRef?: string;
  autoFilterColumns?: Array<TableColumnFilter | undefined>;
  sortState?: SheetSortState;
  sheetProtection?: SheetProtection;
  tables?: SheetTable[];
  embeddedCharts?: XlsxEmbeddedChart[];
  condRules?: CondRule[];
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
const CHART_METADATA_SHEET_BASE = '__cloudsheet_charts';
const CHART_METADATA_VERSION = 1;
const SHEET_PROTECTION_BOOLEAN_KEYS: SheetProtectionBooleanKey[] = [
  'sheet',
  'objects',
  'scenarios',
  'selectLockedCells',
  'selectUnlockedCells',
  'formatCells',
  'formatColumns',
  'formatRows',
  'insertColumns',
  'insertRows',
  'insertHyperlinks',
  'deleteColumns',
  'deleteRows',
  'sort',
  'autoFilter',
  'pivotTables',
];

function normalizeSheetVisibility(state: unknown): SheetVisibility | undefined {
  return state === 'hidden' || state === 'veryHidden' ? state : undefined;
}

function normalizeSheetProtection(raw: unknown): SheetProtection | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetProtection = {};
  for (const key of SHEET_PROTECTION_BOOLEAN_KEYS) {
    if (typeof source[key] === 'boolean') out[key] = source[key];
  }
  if (typeof source.algorithmName === 'string') out.algorithmName = source.algorithmName;
  if (typeof source.hashValue === 'string') out.hashValue = source.hashValue;
  if (typeof source.saltValue === 'string') out.saltValue = source.saltValue;
  if (typeof source.spinCount === 'number' && Number.isFinite(source.spinCount)) {
    out.spinCount = source.spinCount;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeHexColor(hex: string | undefined): string | undefined {
  if (!hex) return undefined;
  const value = hex.startsWith('#') ? hex.slice(1) : hex;
  return /^[0-9a-fA-F]{6}$/.test(value) ? `#${value.toUpperCase()}` : undefined;
}

function normalizeSheetView(raw: unknown): SheetViewOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetViewOptions = {};
  if (typeof source.showGridLines === 'boolean') out.showGridLines = source.showGridLines;
  if (typeof source.showRowColHeaders === 'boolean') out.showRowColHeaders = source.showRowColHeaders;
  if (typeof source.rightToLeft === 'boolean') out.rightToLeft = source.rightToLeft;
  if (typeof source.zoomScale === 'number' && Number.isFinite(source.zoomScale)) {
    out.zoomScale = Math.max(10, Math.min(400, Math.round(source.zoomScale)));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function finiteNumber(value: unknown, min?: number, max?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(min ?? value, Math.min(max ?? value, value));
}

function normalizePageMargins(raw: unknown): SheetPageMargins | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetPageMargins = {};
  for (const key of ['left', 'right', 'top', 'bottom', 'header', 'footer'] as const) {
    const value = finiteNumber(source[key], 0, 10);
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSheetPageSetup(raw: unknown): SheetPageSetup | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetPageSetup = {};
  const margins = normalizePageMargins(source.margins);
  if (margins) out.margins = margins;
  if (source.orientation === 'portrait' || source.orientation === 'landscape') out.orientation = source.orientation;
  for (const key of ['paperSize', 'fitToWidth', 'fitToHeight', 'firstPageNumber', 'horizontalDpi', 'verticalDpi'] as const) {
    const value = finiteNumber(source[key], 0);
    if (value !== undefined) out[key] = Math.floor(value);
  }
  const scale = finiteNumber(source.scale, 10, 400);
  if (scale !== undefined) out.scale = Math.round(scale);
  for (const key of ['fitToPage', 'blackAndWhite', 'draft', 'horizontalCentered', 'verticalCentered', 'showRowColHeaders', 'showGridLines'] as const) {
    if (typeof source[key] === 'boolean') out[key] = source[key];
  }
  if (source.pageOrder === 'downThenOver' || source.pageOrder === 'overThenDown') out.pageOrder = source.pageOrder;
  if (source.cellComments === 'atEnd' || source.cellComments === 'asDisplayed' || source.cellComments === 'None') out.cellComments = source.cellComments;
  if (source.errors === 'dash' || source.errors === 'blank' || source.errors === 'NA' || source.errors === 'displayed') out.errors = source.errors;
  for (const key of ['printArea', 'printTitlesRow', 'printTitlesColumn'] as const) {
    if (typeof source[key] === 'string' && source[key].trim()) out[key] = source[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSheetHeaderFooter(raw: unknown): SheetHeaderFooter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetHeaderFooter = {};
  for (const key of ['differentFirst', 'differentOddEven'] as const) {
    if (typeof source[key] === 'boolean') out[key] = source[key];
  }
  for (const key of ['oddHeader', 'oddFooter', 'evenHeader', 'evenFooter', 'firstHeader', 'firstFooter'] as const) {
    if (typeof source[key] === 'string' && source[key] !== '') out[key] = source[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeOutlineLevelMap(raw: unknown): OutlineLevelMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: OutlineLevelMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(key);
    const level = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : undefined;
    if (Number.isInteger(idx) && idx >= 0 && level !== undefined && level > 0) {
      out[idx] = Math.min(7, level);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSheetOutline(raw: unknown): SheetOutlineOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const out: SheetOutlineOptions = {};
  const rowLevels = normalizeOutlineLevelMap(source.rowLevels);
  const colLevels = normalizeOutlineLevelMap(source.colLevels);
  if (rowLevels) out.rowLevels = rowLevels;
  if (colLevels) out.colLevels = colLevels;
  if (typeof source.summaryBelow === 'boolean') out.summaryBelow = source.summaryBelow;
  if (typeof source.summaryRight === 'boolean') out.summaryRight = source.summaryRight;
  return Object.keys(out).length > 0 ? out : undefined;
}

function cellAddress(row: number, col: number): string {
  return `${idxToCol(col - 1)}${row}`;
}

function autoFilterToRef(autoFilter: unknown): string | undefined {
  if (typeof autoFilter === 'string') return autoFilter;
  if (!autoFilter || typeof autoFilter !== 'object') return undefined;
  const value = autoFilter as {
    from?: string | { row?: number; column?: number; col?: number };
    to?: string | { row?: number; column?: number; col?: number };
  };
  if (typeof value.from === 'string' && typeof value.to === 'string') {
    return `${value.from}:${value.to}`;
  }
  if (typeof value.from === 'string') return value.from;
  const from = value.from;
  const to = value.to ?? value.from;
  const fromRow = typeof from?.row === 'number' ? from.row : undefined;
  const fromCol = typeof from?.column === 'number' ? from.column : typeof from?.col === 'number' ? from.col : undefined;
  const toRow = typeof to?.row === 'number' ? to.row : undefined;
  const toCol = typeof to?.column === 'number' ? to.column : typeof to?.col === 'number' ? to.col : undefined;
  if (!fromRow || !fromCol || !toRow || !toCol) return undefined;
  const start = cellAddress(fromRow, fromCol);
  const end = cellAddress(toRow, toCol);
  return start === end ? start : `${start}:${end}`;
}

function sanitizeTableName(name: string, fallback: string, used: Set<string>): string {
  let base = name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '');
  if (!base) base = fallback;
  if (isValidExcelCellReference(base)) base = `${base}_Table`;
  let out = base.slice(0, 240);
  let n = 2;
  while (used.has(out)) {
    const suffix = `_${n++}`;
    out = `${base.slice(0, 240 - suffix.length)}${suffix}`;
  }
  used.add(out);
  return out;
}

function isValidExcelCellReference(name: string): boolean {
  const match = name.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return false;
  const col = colToIdx(match[1]);
  const row = Number(match[2]);
  return col >= 0 && col < 16_384 && Number.isInteger(row) && row >= 1 && row <= 1_048_576;
}

type TableFiltersByName = Record<string, Array<TableColumnFilter | undefined>>;
type WorksheetFiltersByName = Record<string, { ref?: string; columns: Array<TableColumnFilter | undefined>; sortState?: SheetSortState }>;

function hasTableColumnFilter(filter: TableColumnFilter | undefined): boolean {
  return Boolean(filter && ((filter.values?.length ?? 0) > 0 || (filter.customFilters?.length ?? 0) > 0));
}

function normalizeTableColumnFilter(filter: TableColumnFilter | undefined): TableColumnFilter | undefined {
  if (!filter) return undefined;
  const values = filter.values?.filter((value) => typeof value === 'string');
  const customFilters = filter.customFilters
    ?.filter((item) => item && typeof item.val === 'string')
    .map((item) => ({
      val: item.val,
      ...(typeof item.operator === 'string' && item.operator ? { operator: item.operator } : {}),
    }));
  const out: TableColumnFilter = {};
  if (values && values.length > 0) out.values = values;
  if (customFilters && customFilters.length > 0) out.customFilters = customFilters;
  if (filter.and === true && customFilters && customFilters.length > 1) out.and = true;
  return hasTableColumnFilter(out) ? out : undefined;
}

function extractFilterColumnsFromXml(parent: Element | undefined | null): Array<TableColumnFilter | undefined> {
  const columns: Array<TableColumnFilter | undefined> = [];
  if (!parent) return columns;
  for (const filterColumn of Array.from(parent.getElementsByTagName('filterColumn'))) {
    const colId = Number(filterColumn.getAttribute('colId'));
    if (!Number.isInteger(colId) || colId < 0) continue;
    const values = Array.from(filterColumn.getElementsByTagName('filter'))
      .map((node) => node.getAttribute('val'))
      .filter((value): value is string => typeof value === 'string');
    const customFiltersEl = filterColumn.getElementsByTagName('customFilters')[0];
    const customFilters = Array.from(filterColumn.getElementsByTagName('customFilter'))
      .map((node) => {
        const val = node.getAttribute('val');
        if (typeof val !== 'string') return undefined;
        const operator = node.getAttribute('operator') ?? undefined;
        return { val, ...(operator ? { operator } : {}) };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
    columns[colId] = normalizeTableColumnFilter({
      values,
      customFilters,
      and: customFiltersEl?.getAttribute('and') === '1',
    });
  }
  return columns;
}

function xmlBool(value: string | null): boolean | undefined {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return undefined;
}

function extractSortStateFromXml(parent: Element | undefined | null): SheetSortState | undefined {
  const sortState = parent?.getElementsByTagName('sortState')[0];
  if (!sortState) return undefined;
  const conditions = Array.from(sortState.getElementsByTagName('sortCondition'))
    .map((node): SheetSortCondition | undefined => {
      const ref = node.getAttribute('ref');
      if (!ref) return undefined;
      const dxfIdRaw = node.getAttribute('dxfId');
      const iconIdRaw = node.getAttribute('iconId');
      const dxfId = dxfIdRaw == null ? undefined : Number(dxfIdRaw);
      const iconId = iconIdRaw == null ? undefined : Number(iconIdRaw);
      return {
        ref,
        ...(xmlBool(node.getAttribute('descending')) === true ? { descending: true } : {}),
        ...(node.getAttribute('sortBy') ? { sortBy: node.getAttribute('sortBy')! } : {}),
        ...(node.getAttribute('customList') ? { customList: node.getAttribute('customList')! } : {}),
        ...(Number.isInteger(dxfId) ? { dxfId } : {}),
        ...(node.getAttribute('iconSet') ? { iconSet: node.getAttribute('iconSet')! } : {}),
        ...(Number.isInteger(iconId) ? { iconId } : {}),
      };
    })
    .filter((value): value is SheetSortCondition => Boolean(value));
  if (conditions.length === 0) return undefined;
  return {
    ...(sortState.getAttribute('ref') ? { ref: sortState.getAttribute('ref')! } : {}),
    ...(xmlBool(sortState.getAttribute('caseSensitive')) === true ? { caseSensitive: true } : {}),
    ...(xmlBool(sortState.getAttribute('columnSort')) === true ? { columnSort: true } : {}),
    ...(sortState.getAttribute('sortMethod') ? { sortMethod: sortState.getAttribute('sortMethod')! } : {}),
    conditions,
  };
}

async function extractTableFilterMetadata(data: ArrayBuffer): Promise<TableFiltersByName> {
  const out: TableFiltersByName = {};
  try {
    const zip = await JSZip.loadAsync(data);
    const tablePaths = Object.keys(zip.files).filter((path) => /^xl\/tables\/table\d+\.xml$/i.test(path));
    await Promise.all(tablePaths.map(async (path) => {
      const file = zip.file(path);
      if (!file) return;
      const xml = await file.async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const tableEl = doc.getElementsByTagName('table')[0];
      const name = tableEl?.getAttribute('name') || tableEl?.getAttribute('displayName');
      if (!name) return;
      const columns = extractFilterColumnsFromXml(tableEl.getElementsByTagName('autoFilter')[0]);
      if (columns.some(hasTableColumnFilter)) out[name] = columns;
    }));
  } catch {
    // Filter criteria are compatibility metadata; import should continue without them.
  }
  return out;
}

function normalizeWorkbookRelTarget(target: string): string {
  const raw = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  return raw.replace(/\\/g, '/').replace(/\/\.\//g, '/');
}

async function extractWorksheetAutoFilterMetadata(data: ArrayBuffer): Promise<WorksheetFiltersByName> {
  const out: WorksheetFiltersByName = {};
  try {
    const zip = await JSZip.loadAsync(data);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) return out;

    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const targetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targetById.set(id, normalizeWorkbookRelTarget(target));
    }

    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    for (const sheetEl of Array.from(workbookDoc.getElementsByTagName('sheet'))) {
      const name = sheetEl.getAttribute('name');
      const relId = sheetEl.getAttribute('r:id');
      const path = relId ? targetById.get(relId) : undefined;
      if (!name || !path) continue;
      const worksheetXml = await zip.file(path)?.async('string');
      if (!worksheetXml) continue;
      const worksheetDoc = new DOMParser().parseFromString(worksheetXml, 'application/xml');
      const autoFilter = worksheetDoc.getElementsByTagName('autoFilter')[0];
      const ref = autoFilter?.getAttribute('ref') ?? undefined;
      const columns = extractFilterColumnsFromXml(autoFilter);
      const sortState = extractSortStateFromXml(autoFilter ?? worksheetDoc.documentElement);
      if (ref || columns.some(hasTableColumnFilter) || sortState) out[name] = { ref, columns, sortState };
    }
  } catch {
    // Worksheet filter criteria are compatibility metadata; import should continue without them.
  }
  return out;
}

function extractTableModels(ews: ExcelJS.Worksheet, tableFilters: TableFiltersByName = {}): SheetTable[] {
  const models = (ews.model as { tables?: Array<{
    name?: string;
    displayName?: string;
    tableRef?: string;
    ref?: string;
    autoFilterRef?: string;
    headerRow?: boolean;
    totalsRow?: boolean;
    style?: SheetTable['style'];
    columns?: SheetTable['columns'];
  }> }).tables ?? [];
  return models.flatMap((table): SheetTable[] => {
    const ref = table.tableRef ?? table.ref ?? table.autoFilterRef;
    if (!table.name || !ref) return [];
    const filters = tableFilters[table.name] ?? (table.displayName ? tableFilters[table.displayName] : undefined);
    return [{
      name: table.name,
      displayName: table.displayName,
      ref,
      headerRow: table.headerRow,
      totalsRow: table.totalsRow,
      style: table.style,
      columns: table.columns?.map((col) => ({
        name: col.name,
        filterButton: col.filterButton,
        filter: normalizeTableColumnFilter(col.filter ?? filters?.[table.columns?.indexOf(col) ?? -1]),
        totalsRowLabel: col.totalsRowLabel,
        totalsRowFunction: col.totalsRowFunction,
        totalsRowFormula: col.totalsRowFormula,
      })),
    }];
  });
}

function tableCellValue(sheet: ExportSheetInput, row: number, col: number): ExcelJS.CellValue {
  const raw = sheet.cells[cellAddress(row, col)] ?? '';
  return raw.startsWith('=') ? raw.slice(1) : coerceCellValue(raw, sheet.cellFormats?.[cellAddress(row, col)]);
}

function applyTables(
  ws: ExcelJS.Worksheet,
  sheet: ExportSheetInput,
  usedTableNames: Set<string>,
  tableFiltersByExportName?: Record<string, SheetTable>,
): void {
  for (const [idx, table] of (sheet.tables ?? []).entries()) {
    const parsed = parseRangeReference(table.ref);
    if (!parsed) continue;
    const startCol = colToIdx(parsed.startCol) + 1;
    const endCol = colToIdx(parsed.endCol) + 1;
    const startRow = parsed.startRow;
    const endRow = parsed.endRow;
    if (endCol < startCol || endRow < startRow) continue;
    const colCount = endCol - startCol + 1;
    const headerRow = table.headerRow ?? true;
    const totalsRow = table.totalsRow ?? false;
    const columns = Array.from({ length: colCount }, (_, offset) => {
      const source = table.columns?.[offset];
      const name = source?.name || (headerRow ? String(sheet.cells[cellAddress(startRow, startCol + offset)] ?? '') : '') || `Column${offset + 1}`;
      return {
        name,
        filterButton: source?.filterButton ?? true,
        filter: normalizeTableColumnFilter(source?.filter),
        customFilters: normalizeTableColumnFilter(source?.filter)?.customFilters,
        totalsRowLabel: source?.totalsRowLabel,
        totalsRowFunction: source?.totalsRowFunction as ExcelJS.TableColumnProperties['totalsRowFunction'],
        totalsRowFormula: source?.totalsRowFormula,
      };
    });
    const firstDataRow = startRow + (headerRow ? 1 : 0);
    const lastDataRow = endRow - (totalsRow ? 1 : 0);
    const rows = firstDataRow <= lastDataRow
      ? Array.from({ length: lastDataRow - firstDataRow + 1 }, (_, rowOffset) => (
        Array.from({ length: colCount }, (_, colOffset) => (
          tableCellValue(sheet, firstDataRow + rowOffset, startCol + colOffset)
        ))
      ))
      : [];
    try {
      const exportName = sanitizeTableName(table.name, `Table${idx + 1}`, usedTableNames);
      if (tableFiltersByExportName && table.columns?.some((column) => hasTableColumnFilter(column.filter))) {
        tableFiltersByExportName[exportName] = table;
      }
      ws.addTable({
        name: exportName,
        displayName: table.displayName,
        ref: `${parsed.startCol}${parsed.startRow}`,
        headerRow,
        totalsRow,
        style: table.style as ExcelJS.TableStyleProperties | undefined,
        columns,
        rows,
      });
    } catch {
      // Table metadata should never block the rest of the workbook export.
    }
  }
}

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

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function unescapeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getXmlAttr(xml: string, attr: string): string | undefined {
  const match = xml.match(new RegExp(`\\b${attr}="([^"]*)"`));
  return match ? unescapeXmlAttr(match[1]) : undefined;
}

function setXmlAttr(xml: string, attr: string, value: string): string {
  const escaped = escapeXmlAttr(value);
  const attrRe = new RegExp(`\\b${attr}="[^"]*"`);
  if (attrRe.test(xml)) return xml.replace(attrRe, `${attr}="${escaped}"`);
  return xml.replace(/\/?>$/, (end) => ` ${attr}="${escaped}"${end}`);
}

function filterColumnsXml(
  columns: Array<{ filter?: TableColumnFilter; filterButton?: boolean } | TableColumnFilter | undefined>,
  includeButtonState = false,
): string {
  return columns.map((column, idx) => {
    const rawFilter = column && ('filter' in column ? column.filter : column);
    const filter = normalizeTableColumnFilter(rawFilter);
    const hiddenButton = includeButtonState && column && 'filterButton' in column && column.filterButton === false ? ' hiddenButton="1"' : '';
    if (!filter) return `<filterColumn colId="${idx}"${hiddenButton}/>`;
    if (filter.customFilters && filter.customFilters.length > 0) {
      const body = filter.customFilters.map((item) => (
        `<customFilter val="${escapeXmlAttr(item.val)}"${item.operator ? ` operator="${escapeXmlAttr(item.operator)}"` : ''}/>`
      )).join('');
      const andAttr = filter.and ? ' and="1"' : '';
      return `<filterColumn colId="${idx}"${hiddenButton}><customFilters${andAttr}>${body}</customFilters></filterColumn>`;
    }
    const body = (filter.values ?? []).map((value) => `<filter val="${escapeXmlAttr(value)}"/>`).join('');
    return `<filterColumn colId="${idx}"${hiddenButton}><filters>${body}</filters></filterColumn>`;
  }).join('');
}

function tableFilterXml(table: SheetTable): string {
  return filterColumnsXml(table.columns ?? [], true);
}

function normalizeSortState(sortState: SheetSortState | undefined): SheetSortState | undefined {
  const conditions = sortState?.conditions
    ?.filter((condition) => condition && typeof condition.ref === 'string' && condition.ref.trim())
    .map((condition) => ({
      ref: condition.ref.trim(),
      ...(condition.descending === true ? { descending: true } : {}),
      ...(typeof condition.sortBy === 'string' && condition.sortBy ? { sortBy: condition.sortBy } : {}),
      ...(typeof condition.customList === 'string' && condition.customList ? { customList: condition.customList } : {}),
      ...(Number.isInteger(condition.dxfId) ? { dxfId: condition.dxfId } : {}),
      ...(typeof condition.iconSet === 'string' && condition.iconSet ? { iconSet: condition.iconSet } : {}),
      ...(Number.isInteger(condition.iconId) ? { iconId: condition.iconId } : {}),
    }));
  if (!conditions || conditions.length === 0) return undefined;
  return {
    ...(typeof sortState?.ref === 'string' && sortState.ref.trim() ? { ref: sortState.ref.trim() } : {}),
    ...(sortState?.caseSensitive === true ? { caseSensitive: true } : {}),
    ...(sortState?.columnSort === true ? { columnSort: true } : {}),
    ...(typeof sortState?.sortMethod === 'string' && sortState.sortMethod ? { sortMethod: sortState.sortMethod } : {}),
    conditions,
  };
}

function sortStateXml(sortState: SheetSortState | undefined): string {
  const normalized = normalizeSortState(sortState);
  if (!normalized) return '';
  const attrs = [
    normalized.ref ? ` ref="${escapeXmlAttr(normalized.ref)}"` : '',
    normalized.caseSensitive ? ' caseSensitive="1"' : '',
    normalized.columnSort ? ' columnSort="1"' : '',
    normalized.sortMethod ? ` sortMethod="${escapeXmlAttr(normalized.sortMethod)}"` : '',
  ].join('');
  const body = normalized.conditions.map((condition) => {
    const conditionAttrs = [
      ` ref="${escapeXmlAttr(condition.ref)}"`,
      condition.descending ? ' descending="1"' : '',
      condition.sortBy ? ` sortBy="${escapeXmlAttr(condition.sortBy)}"` : '',
      condition.customList ? ` customList="${escapeXmlAttr(condition.customList)}"` : '',
      Number.isInteger(condition.dxfId) ? ` dxfId="${condition.dxfId}"` : '',
      condition.iconSet ? ` iconSet="${escapeXmlAttr(condition.iconSet)}"` : '',
      Number.isInteger(condition.iconId) ? ` iconId="${condition.iconId}"` : '',
    ].join('');
    return `<sortCondition${conditionAttrs}/>`;
  }).join('');
  return `<sortState${attrs}>${body}</sortState>`;
}

function patchTableXmlFilters(xml: string, table: SheetTable): string {
  const autoFilterMatch = xml.match(/<autoFilter\b([^>]*)\/>|<autoFilter\b([^>]*)>[\s\S]*?<\/autoFilter>/);
  const ref = getXmlAttr(autoFilterMatch?.[0] ?? '', 'ref') ?? table.ref;
  const replacement = `<autoFilter ref="${escapeXmlAttr(ref)}">${tableFilterXml(table)}</autoFilter>`;
  if (!autoFilterMatch) return xml.replace(/(<table\b[^>]*>)/, `$1${replacement}`);
  const start = autoFilterMatch.index ?? 0;
  return xml.slice(0, start) + replacement + xml.slice(start + autoFilterMatch[0].length);
}

async function patchWorkbookTableFilters(
  buffer: ArrayBuffer,
  tableFiltersByExportName: Record<string, SheetTable>,
): Promise<ArrayBuffer> {
  if (Object.keys(tableFiltersByExportName).length === 0) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const tablePaths = Object.keys(zip.files).filter((path) => /^xl\/tables\/table\d+\.xml$/i.test(path));
    let changed = false;
    for (const path of tablePaths) {
      const file = zip.file(path);
      if (!file) continue;
      const xml = await file.async('string');
      const name = getXmlAttr(xml, 'name');
      const table = name ? tableFiltersByExportName[name] : undefined;
      if (!table) continue;
      zip.file(path, patchTableXmlFilters(xml, table));
      changed = true;
    }
    if (!changed) return buffer;
    const patched = await zip.generateAsync({ type: 'arraybuffer' });
    const u8 = new Uint8Array(patched);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  } catch {
    return buffer;
  }
}

function patchWorksheetXmlAutoFilter(xml: string, filterConfig: { ref?: string; columns: Array<TableColumnFilter | undefined>; sortState?: SheetSortState }): string {
  const autoFilterMatch = xml.match(/<autoFilter\b([^>]*)\/>|<autoFilter\b([^>]*)>[\s\S]*?<\/autoFilter>/);
  const sortXml = sortStateXml(filterConfig.sortState);
  const ref = filterConfig.ref ?? getXmlAttr(autoFilterMatch?.[0] ?? '', 'ref') ?? filterConfig.sortState?.ref;
  const hasFilters = filterConfig.columns.some(hasTableColumnFilter);
  if (!ref || (!hasFilters && !sortXml)) return xml;
  const replacement = `<autoFilter ref="${escapeXmlAttr(ref)}">${hasFilters ? filterColumnsXml(filterConfig.columns) : ''}${sortXml}</autoFilter>`;
  if (autoFilterMatch) {
    const start = autoFilterMatch.index ?? 0;
    return xml.slice(0, start) + replacement + xml.slice(start + autoFilterMatch[0].length);
  }
  const insertAfter = xml.match(/<sheetData\b[\s\S]*?<\/sheetData>/);
  if (insertAfter?.index === undefined) return xml.replace(/(<worksheet\b[^>]*>)/, `$1${replacement}`);
  const end = insertAfter.index + insertAfter[0].length;
  return xml.slice(0, end) + replacement + xml.slice(end);
}

async function patchWorkbookWorksheetFilters(
  buffer: ArrayBuffer,
  worksheetFiltersByExportName: WorksheetFiltersByName,
): Promise<ArrayBuffer> {
  if (Object.keys(worksheetFiltersByExportName).length === 0) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) return buffer;

    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const targetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targetById.set(id, normalizeWorkbookRelTarget(target));
    }

    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    let changed = false;
    for (const sheetEl of Array.from(workbookDoc.getElementsByTagName('sheet'))) {
      const name = sheetEl.getAttribute('name');
      const relId = sheetEl.getAttribute('r:id');
      const path = relId ? targetById.get(relId) : undefined;
      const filterConfig = name ? worksheetFiltersByExportName[name] : undefined;
      if (!path || !filterConfig) continue;
      const file = zip.file(path);
      if (!file) continue;
      const xml = await file.async('string');
      zip.file(path, patchWorksheetXmlAutoFilter(xml, filterConfig));
      changed = true;
    }
    if (!changed) return buffer;
    const patched = await zip.generateAsync({ type: 'arraybuffer' });
    const u8 = new Uint8Array(patched);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  } catch {
    return buffer;
  }
}

function refIntersectsValidationRange(ref: string, range: Validation['range']): boolean {
  const parsed = parseRangeReference(ref);
  if (!parsed) return false;
  const minR = Math.min(parsed.startRow, parsed.endRow) - 1;
  const maxR = Math.max(parsed.startRow, parsed.endRow) - 1;
  const minC = Math.min(colToIdx(parsed.startCol), colToIdx(parsed.endCol));
  const maxC = Math.max(colToIdx(parsed.startCol), colToIdx(parsed.endCol));
  return (
    minR <= Math.max(range.minR, range.maxR) &&
    maxR >= Math.min(range.minR, range.maxR) &&
    minC <= Math.max(range.minC, range.maxC) &&
    maxC >= Math.min(range.minC, range.maxC)
  );
}

function patchWorksheetXmlDataValidations(xml: string, patches: DataValidationXmlPatch[]): string {
  if (patches.length === 0) return xml;
  return xml.replace(/<dataValidation\b[^>]*>/g, (tag) => {
    const sqref = getXmlAttr(tag, 'sqref');
    if (!sqref) return tag;
    const refs = sqref.split(/\s+/).filter(Boolean);
    const meta = refs.reduce<ValidationMeta>((acc, ref) => {
      for (const patch of patches) {
        if (!refIntersectsValidationRange(ref, patch.range)) continue;
        return { ...acc, ...patch.meta };
      }
      return acc;
    }, {});
    let out = tag;
    if (meta.allowBlank === false) out = setXmlAttr(out, 'allowBlank', '0');
    if (meta.showErrorMessage === false) out = setXmlAttr(out, 'showErrorMessage', '0');
    return out;
  });
}

async function patchWorkbookDataValidationMetadata(
  buffer: ArrayBuffer,
  validationPatchesByExportName: DataValidationXmlPatchesBySheet,
): Promise<ArrayBuffer> {
  if (Object.keys(validationPatchesByExportName).length === 0) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) return buffer;

    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const targetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targetById.set(id, normalizeWorkbookRelTarget(target));
    }

    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    let changed = false;
    for (const sheetEl of Array.from(workbookDoc.getElementsByTagName('sheet'))) {
      const name = sheetEl.getAttribute('name');
      const relId = sheetEl.getAttribute('r:id');
      const path = relId ? targetById.get(relId) : undefined;
      const patches = name ? validationPatchesByExportName[name] : undefined;
      if (!path || !patches || patches.length === 0) continue;
      const file = zip.file(path);
      if (!file) continue;
      const xml = await file.async('string');
      const patched = patchWorksheetXmlDataValidations(xml, patches);
      if (patched === xml) continue;
      zip.file(path, patched);
      changed = true;
    }
    if (!changed) return buffer;
    const patched = await zip.generateAsync({ type: 'arraybuffer' });
    const u8 = new Uint8Array(patched);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  } catch {
    return buffer;
  }
}

function patchWorksheetXmlPageSetup(xml: string, patch: Pick<SheetPageSetup, 'cellComments'>): string {
  if (!patch.cellComments) return xml;
  const attr = ` cellComments="${escapeXmlAttr(patch.cellComments)}"`;
  const pageSetupMatch = xml.match(/<pageSetup\b[^>]*\/>|<pageSetup\b[^>]*>[\s\S]*?<\/pageSetup>/);
  if (pageSetupMatch) {
    const patched = setXmlAttr(pageSetupMatch[0], 'cellComments', patch.cellComments);
    const start = pageSetupMatch.index ?? 0;
    return xml.slice(0, start) + patched + xml.slice(start + pageSetupMatch[0].length);
  }
  const tag = `<pageSetup${attr}/>`;
  const pageMarginsMatch = xml.match(/<pageMargins\b[^>]*\/>/);
  if (pageMarginsMatch?.index !== undefined) {
    const end = pageMarginsMatch.index + pageMarginsMatch[0].length;
    return xml.slice(0, end) + tag + xml.slice(end);
  }
  return xml.replace(/(<\/worksheet>)/, `${tag}$1`);
}

async function patchWorkbookPageSetupMetadata(
  buffer: ArrayBuffer,
  pageSetupPatchesByExportName: PageSetupXmlPatchesBySheet,
): Promise<ArrayBuffer> {
  if (Object.keys(pageSetupPatchesByExportName).length === 0) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) return buffer;

    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const targetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targetById.set(id, normalizeWorkbookRelTarget(target));
    }

    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    let changed = false;
    for (const sheetEl of Array.from(workbookDoc.getElementsByTagName('sheet'))) {
      const name = sheetEl.getAttribute('name');
      const relId = sheetEl.getAttribute('r:id');
      const path = relId ? targetById.get(relId) : undefined;
      const patch = name ? pageSetupPatchesByExportName[name] : undefined;
      if (!path || !patch) continue;
      const file = zip.file(path);
      if (!file) continue;
      const xml = await file.async('string');
      const patched = patchWorksheetXmlPageSetup(xml, patch);
      if (patched === xml) continue;
      zip.file(path, patched);
      changed = true;
    }
    if (!changed) return buffer;
    const patched = await zip.generateAsync({ type: 'arraybuffer' });
    const u8 = new Uint8Array(patched);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  } catch {
    return buffer;
  }
}

function isInternalValidationListSheet(wb: XLSX.WorkBook, name: string): boolean {
  if (!new RegExp(`^${VALIDATION_LIST_SHEET_BASE.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?: \\(\\d+\\))?$`).test(name)) {
    return false;
  }
  const meta = wb.Workbook?.Sheets?.find((sheet) => sheet.name === name);
  return meta?.Hidden === 1 || meta?.Hidden === 2;
}

function isInternalChartMetadataSheet(wb: XLSX.WorkBook, name: string): boolean {
  if (!new RegExp(`^${CHART_METADATA_SHEET_BASE.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?: \\(\\d+\\))?$`).test(name)) {
    return false;
  }
  const meta = wb.Workbook?.Sheets?.find((sheet) => sheet.name === name);
  return meta?.Hidden === 1 || meta?.Hidden === 2;
}

function normalizeChartRange(raw: unknown): Merge | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const minR = Number(source.minR);
  const maxR = Number(source.maxR);
  const minC = Number(source.minC);
  const maxC = Number(source.maxC);
  if (![minR, maxR, minC, maxC].every((value) => Number.isInteger(value) && value >= 0)) return undefined;
  if (maxR < minR || maxC < minC) return undefined;
  return { minR, maxR, minC, maxC };
}

function normalizeEmbeddedCharts(raw: unknown): XlsxEmbeddedChart[] {
  if (!Array.isArray(raw)) return [];
  const out: XlsxEmbeddedChart[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Record<string, unknown>;
    const type = source.type;
    const orientation = source.orientation;
    const range = normalizeChartRange(source.range);
    if (typeof source.id !== 'string' || !range) continue;
    if (type !== 'bar' && type !== 'line' && type !== 'area' && type !== 'pie') continue;
    if (orientation !== 'columns' && orientation !== 'rows') continue;
    const chart: XlsxEmbeddedChart = { id: source.id, type, orientation, range };
    if (typeof source.title === 'string') chart.title = source.title;
    if (typeof source.palette === 'string') chart.palette = source.palette;
    if (typeof source.collapsed === 'boolean') chart.collapsed = source.collapsed;
    out.push(chart);
  }
  return out;
}

function chartCompatibilityKey(chart: XlsxEmbeddedChart): string {
  return [
    chart.type,
    chart.orientation,
    chart.range.minR,
    chart.range.maxR,
    chart.range.minC,
    chart.range.maxC,
    chart.title ?? '',
  ].join('|');
}

function mergeEmbeddedCharts(...groups: Array<XlsxEmbeddedChart[] | undefined>): XlsxEmbeddedChart[] {
  const out: XlsxEmbeddedChart[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const chart of group ?? []) {
      const key = chartCompatibilityKey(chart);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(chart);
    }
  }
  return out;
}

function extractEmbeddedChartMetadata(wb: XLSX.WorkBook): Record<string, XlsxEmbeddedChart[]> {
  const out: Record<string, XlsxEmbeddedChart[]> = {};
  for (const name of wb.SheetNames) {
    if (!isInternalChartMetadataSheet(wb, name)) continue;
    const raw = wb.Sheets[name]?.A1?.v;
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    try {
      const parsed = JSON.parse(raw) as { version?: unknown; sheets?: unknown };
      if (parsed.version !== CHART_METADATA_VERSION || !parsed.sheets || typeof parsed.sheets !== 'object') continue;
      for (const [sheetName, charts] of Object.entries(parsed.sheets as Record<string, unknown>)) {
        const normalized = normalizeEmbeddedCharts(charts);
        if (normalized.length > 0) out[sheetName] = normalized;
      }
    } catch {
      // Invalid metadata is ignored so third-party workbooks still import normally.
    }
  }
  return out;
}

function xmlElements(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagName('*')).filter((el) => (
    el.localName === localName || el.tagName.split(':').pop() === localName
  ));
}

function xmlAttr(el: Element | undefined, localName: string): string | undefined {
  if (!el) return undefined;
  for (const attr of Array.from(el.attributes)) {
    if (attr.localName === localName || attr.name.split(':').pop() === localName) return attr.value;
  }
  return undefined;
}

function relationshipPathFor(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  const dir = slash >= 0 ? normalized.slice(0, slash + 1) : '';
  const file = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  return `${dir}_rels/${file}.rels`;
}

function resolveRelationshipTarget(sourcePath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1).replace(/\\/g, '/');
  const source = sourcePath.replace(/\\/g, '/');
  const slash = source.lastIndexOf('/');
  const baseParts = (slash >= 0 ? source.slice(0, slash) : '').split('/').filter(Boolean);
  for (const part of target.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

function relationshipMap(xml: string | undefined): Map<string, { target: string; type?: string }> {
  const out = new Map<string, { target: string; type?: string }>();
  if (!xml) return out;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  for (const rel of xmlElements(doc, 'Relationship')) {
    const id = xmlAttr(rel, 'Id');
    const target = xmlAttr(rel, 'Target');
    if (id && target) out.set(id, { target, type: xmlAttr(rel, 'Type') });
  }
  return out;
}

function chartTypeFromXml(doc: Document): XlsxEmbeddedChart['type'] | undefined {
  if (xmlElements(doc, 'lineChart').length > 0) return 'line';
  if (xmlElements(doc, 'areaChart').length > 0) return 'area';
  if (xmlElements(doc, 'pieChart').length > 0 || xmlElements(doc, 'doughnutChart').length > 0) return 'pie';
  if (xmlElements(doc, 'barChart').length > 0) return 'bar';
  return undefined;
}

function chartTitleFromXml(doc: Document): string | undefined {
  const title = xmlElements(doc, 'title')[0];
  if (!title) return undefined;
  const text = xmlElements(title, 't').map((node) => node.textContent ?? '').join('').trim();
  return text || undefined;
}

function parseNativeChartXml(xml: string, sheetName: string, id: string): XlsxEmbeddedChart | undefined {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const type = chartTypeFromXml(doc);
  if (!type) return undefined;
  const ranges = xmlElements(doc, 'f')
    .map((node) => parseRangeReference(node.textContent ?? ''))
    .filter((range): range is NonNullable<ReturnType<typeof parseRangeReference>> => Boolean(range))
    .filter((range) => !range.sheetName || range.sheetName === sheetName);
  if (ranges.length === 0) return undefined;

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const range of ranges) {
    minR = Math.min(minR, range.startRow - 1, range.endRow - 1);
    maxR = Math.max(maxR, range.startRow - 1, range.endRow - 1);
    minC = Math.min(minC, colToIdx(range.startCol), colToIdx(range.endCol));
    maxC = Math.max(maxC, colToIdx(range.startCol), colToIdx(range.endCol));
  }
  if (![minR, maxR, minC, maxC].every(Number.isFinite) || maxR < minR || maxC < minC) return undefined;
  const chart: XlsxEmbeddedChart = {
    id,
    type,
    orientation: 'columns',
    range: { minR, maxR, minC, maxC },
    collapsed: false,
  };
  const title = chartTitleFromXml(doc);
  if (title) chart.title = title;
  return chart;
}

async function extractNativeEmbeddedCharts(data: ArrayBuffer): Promise<Record<string, XlsxEmbeddedChart[]>> {
  const out: Record<string, XlsxEmbeddedChart[]> = {};
  try {
    const zip = await JSZip.loadAsync(data);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const workbookRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !workbookRelsXml) return out;
    const workbookRels = relationshipMap(workbookRelsXml);
    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    for (const [sheetIdx, sheetEl] of xmlElements(workbookDoc, 'sheet').entries()) {
      const sheetName = xmlAttr(sheetEl, 'name');
      const relId = xmlAttr(sheetEl, 'id');
      const sheetRel = relId ? workbookRels.get(relId) : undefined;
      if (!sheetName || !sheetRel) continue;
      const sheetPath = normalizeWorkbookRelTarget(sheetRel.target);
      const sheetXml = await zip.file(sheetPath)?.async('string');
      const sheetRelsXml = await zip.file(relationshipPathFor(sheetPath))?.async('string');
      if (!sheetXml || !sheetRelsXml) continue;
      const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
      const sheetRels = relationshipMap(sheetRelsXml);
      let chartIdx = 0;
      for (const drawing of xmlElements(sheetDoc, 'drawing')) {
        const drawingRelId = xmlAttr(drawing, 'id');
        const drawingRel = drawingRelId ? sheetRels.get(drawingRelId) : undefined;
        if (!drawingRel) continue;
        const drawingPath = resolveRelationshipTarget(sheetPath, drawingRel.target);
        const drawingXml = await zip.file(drawingPath)?.async('string');
        const drawingRelsXml = await zip.file(relationshipPathFor(drawingPath))?.async('string');
        if (!drawingXml || !drawingRelsXml) continue;
        const drawingDoc = new DOMParser().parseFromString(drawingXml, 'application/xml');
        const drawingRels = relationshipMap(drawingRelsXml);
        for (const chartEl of xmlElements(drawingDoc, 'chart')) {
          const chartRelId = xmlAttr(chartEl, 'id');
          const chartRel = chartRelId ? drawingRels.get(chartRelId) : undefined;
          if (!chartRel) continue;
          const chartPath = resolveRelationshipTarget(drawingPath, chartRel.target);
          const chartXml = await zip.file(chartPath)?.async('string');
          if (!chartXml) continue;
          const chart = parseNativeChartXml(chartXml, sheetName, `xlsx_chart_${sheetIdx + 1}_${++chartIdx}`);
          if (chart) (out[sheetName] ??= []).push(chart);
        }
      }
    }
  } catch {
    // Native chart extraction is best-effort compatibility metadata.
  }
  return out;
}

function addEmbeddedChartMetadataSheet(
  wb: ExcelJS.Workbook,
  sheets: ExportSheetInput[],
  exportNames: string[],
  usedSheetNames: Set<string>,
): void {
  const metadata: Record<string, XlsxEmbeddedChart[]> = {};
  sheets.forEach((sheet, idx) => {
    const charts = normalizeEmbeddedCharts(sheet.embeddedCharts);
    if (charts.length > 0) metadata[exportNames[idx]] = charts;
  });
  if (Object.keys(metadata).length === 0) return;
  const ws = wb.addWorksheet(uniqueSheetName(CHART_METADATA_SHEET_BASE, usedSheetNames));
  ws.state = 'veryHidden';
  ws.getCell('A1').value = JSON.stringify({
    version: CHART_METADATA_VERSION,
    sheets: metadata,
  });
}

function contentTypeOverride(partName: string, contentType: string): string {
  return `<Override PartName="/${escapeXmlAttr(partName)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
}

function patchContentTypesXml(xml: string, overrides: Array<{ partName: string; contentType: string }>): string {
  let out = xml;
  for (const override of overrides) {
    if (out.includes(`PartName="/${override.partName}"`)) continue;
    out = out.replace('</Types>', `${contentTypeOverride(override.partName, override.contentType)}</Types>`);
  }
  return out;
}

function nextRelationshipId(xml: string): string {
  const ids = Array.from(xml.matchAll(/\bId="rId(\d+)"/g)).map((match) => Number(match[1]));
  const next = ids.length ? Math.max(...ids) + 1 : 1;
  return `rId${next}`;
}

function relationshipXml(id: string, type: string, target: string): string {
  return `<Relationship Id="${escapeXmlAttr(id)}" Type="${escapeXmlAttr(type)}" Target="${escapeXmlAttr(target)}"/>`;
}

function addRelationship(xml: string | undefined, type: string, target: string): { xml: string; id: string } {
  const base = xml && xml.trim()
    ? xml
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const id = nextRelationshipId(base);
  return {
    id,
    xml: base.replace('</Relationships>', `${relationshipXml(id, type, target)}</Relationships>`),
  };
}

function patchWorksheetXmlDrawing(xml: string, relId: string): string {
  if (/<drawing\b/.test(xml)) return xml;
  return xml.replace('</worksheet>', `<drawing r:id="${escapeXmlAttr(relId)}"/></worksheet>`);
}

function chartAbsRef(sheetName: string, startCol: number, startRow: number, endCol: number, endRow: number): string {
  const start = `$${idxToCol(startCol)}$${startRow + 1}`;
  const end = `$${idxToCol(endCol)}$${endRow + 1}`;
  return `${quoteSheetNameForFormula(sheetName)}!${start === end ? start : `${start}:${end}`}`;
}

function chartFormulaRefs(sheetName: string, chart: XlsxEmbeddedChart): Array<{ title: string; cat: string; val: string }> {
  const r = chart.range;
  if (r.maxR <= r.minR || r.maxC <= r.minC) return [];
  if (chart.orientation === 'rows') {
    return Array.from({ length: r.maxR - r.minR }, (_, idx) => {
      const row = r.minR + idx + 1;
      return {
        title: chartAbsRef(sheetName, r.minC, row, r.minC, row),
        cat: chartAbsRef(sheetName, r.minC + 1, r.minR, r.maxC, r.minR),
        val: chartAbsRef(sheetName, r.minC + 1, row, r.maxC, row),
      };
    });
  }
  return Array.from({ length: r.maxC - r.minC }, (_, idx) => {
    const col = r.minC + idx + 1;
    return {
      title: chartAbsRef(sheetName, col, r.minR, col, r.minR),
      cat: chartAbsRef(sheetName, r.minC, r.minR + 1, r.minC, r.maxR),
      val: chartAbsRef(sheetName, col, r.minR + 1, col, r.maxR),
    };
  });
}

function chartSeriesXml(sheetName: string, chart: XlsxEmbeddedChart): string {
  const refs = chartFormulaRefs(sheetName, chart);
  const series = chart.type === 'pie' ? refs.slice(0, 1) : refs;
  return series.map((ref, idx) => `
      <c:ser>
        <c:idx val="${idx}"/><c:order val="${idx}"/>
        <c:tx><c:strRef><c:f>${escapeXmlAttr(ref.title)}</c:f></c:strRef></c:tx>
        <c:cat><c:strRef><c:f>${escapeXmlAttr(ref.cat)}</c:f></c:strRef></c:cat>
        <c:val><c:numRef><c:f>${escapeXmlAttr(ref.val)}</c:f></c:numRef></c:val>
      </c:ser>`).join('');
}

function nativeChartXml(sheetName: string, chart: XlsxEmbeddedChart): string {
  const title = chart.title?.trim()
    ? `<c:title><c:tx><c:rich><a:p><a:r><a:t>${escapeXmlAttr(chart.title.trim())}</a:t></a:r></a:p></c:rich></c:tx></c:title>`
    : '';
  const series = chartSeriesXml(sheetName, chart);
  const axis = chart.type === 'pie' ? '' : '<c:axId val="123456"/><c:axId val="654321"/>';
  const axisDefs = chart.type === 'pie' ? '' : `
      <c:catAx><c:axId val="123456"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="654321"/><c:tickLblPos val="nextTo"/></c:catAx>
      <c:valAx><c:axId val="654321"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="123456"/><c:tickLblPos val="nextTo"/></c:valAx>`;
  const chartBody = chart.type === 'line'
    ? `<c:lineChart><c:grouping val="standard"/>${series}${axis}</c:lineChart>`
    : chart.type === 'area'
      ? `<c:areaChart><c:grouping val="standard"/>${series}${axis}</c:areaChart>`
      : chart.type === 'pie'
        ? `<c:pieChart>${series}</c:pieChart>`
        : `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>${series}${axis}</c:barChart>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>${title}<c:plotArea>${chartBody}${axisDefs}</c:plotArea><c:legend><c:legendPos val="r"/></c:legend><c:plotVisOnly val="1"/></c:chart>
</c:chartSpace>`;
}

function drawingXml(chartCount: number): string {
  const anchors = Array.from({ length: chartCount }, (_, idx) => {
    const row = idx * 16;
    return `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>6</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 15}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame>
      <xdr:nvGraphicFramePr><xdr:cNvPr id="${idx + 2}" name="Chart ${idx + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId${idx + 1}"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}
</xdr:wsDr>`;
}

function drawingRelsXml(startChartIdx: number, chartCount: number): string {
  const rels = Array.from({ length: chartCount }, (_, idx) => (
    relationshipXml(
      `rId${idx + 1}`,
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
      `../charts/chart${startChartIdx + idx}.xml`,
    )
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

async function worksheetPathsByName(zip: JSZip): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) return out;
  const rels = relationshipMap(relsXml);
  const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
  for (const sheetEl of xmlElements(workbookDoc, 'sheet')) {
    const name = xmlAttr(sheetEl, 'name');
    const relId = xmlAttr(sheetEl, 'id');
    const rel = relId ? rels.get(relId) : undefined;
    if (name && rel) out.set(name, normalizeWorkbookRelTarget(rel.target));
  }
  return out;
}

async function patchWorkbookEmbeddedNativeCharts(
  buffer: ArrayBuffer,
  sheets: ExportSheetInput[],
  exportNames: string[],
): Promise<ArrayBuffer> {
  const chartSheets = sheets
    .map((sheet, idx) => ({ sheet, exportName: exportNames[idx], charts: normalizeEmbeddedCharts(sheet.embeddedCharts) }))
    .filter((item) => item.charts.length > 0);
  if (chartSheets.length === 0) return buffer;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const pathsByName = await worksheetPathsByName(zip);
    const overrides: Array<{ partName: string; contentType: string }> = [];
    let drawingIdx = Object.keys(zip.files).filter((path) => /^xl\/drawings\/drawing\d+\.xml$/i.test(path)).length + 1;
    let chartIdx = Object.keys(zip.files).filter((path) => /^xl\/charts\/chart\d+\.xml$/i.test(path)).length + 1;
    let changed = false;
    for (const item of chartSheets) {
      const sheetPath = pathsByName.get(item.exportName);
      const sheetFile = sheetPath ? zip.file(sheetPath) : undefined;
      if (!sheetPath || !sheetFile) continue;
      const currentDrawingIdx = drawingIdx++;
      const firstChartIdx = chartIdx;
      const drawingPath = `xl/drawings/drawing${currentDrawingIdx}.xml`;
      const drawingRelsPath = `xl/drawings/_rels/drawing${currentDrawingIdx}.xml.rels`;
      zip.file(drawingPath, drawingXml(item.charts.length));
      zip.file(drawingRelsPath, drawingRelsXml(firstChartIdx, item.charts.length));
      overrides.push({
        partName: drawingPath,
        contentType: 'application/vnd.openxmlformats-officedocument.drawing+xml',
      });
      for (const chart of item.charts) {
        const chartPath = `xl/charts/chart${chartIdx++}.xml`;
        zip.file(chartPath, nativeChartXml(item.exportName, chart));
        overrides.push({
          partName: chartPath,
          contentType: 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
        });
      }
      const sheetRelsPath = relationshipPathFor(sheetPath);
      const sheetRelsXml = await zip.file(sheetRelsPath)?.async('string');
      const rel = addRelationship(
        sheetRelsXml,
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',
        `../drawings/drawing${currentDrawingIdx}.xml`,
      );
      zip.file(sheetRelsPath, rel.xml);
      const sheetXml = await sheetFile.async('string');
      zip.file(sheetPath, patchWorksheetXmlDrawing(sheetXml, rel.id));
      changed = true;
    }
    if (!changed) return buffer;
    const contentTypes = await zip.file('[Content_Types].xml')?.async('string');
    if (contentTypes) zip.file('[Content_Types].xml', patchContentTypesXml(contentTypes, overrides));
    const patched = await zip.generateAsync({ type: 'arraybuffer' });
    const u8 = new Uint8Array(patched);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  } catch {
    return buffer;
  }
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
    if ('error' in value && typeof (value as { error?: unknown }).error === 'string') {
      return (value as { error: string }).error;
    }
    if ('result' in value && (value as { result?: unknown }).result !== undefined) {
      const result = (value as { result?: unknown }).result;
      if (result && typeof result === 'object' && 'error' in result && typeof (result as { error?: unknown }).error === 'string') {
        return (result as { error: string }).error;
      }
      return String(result ?? '');
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

type ValidationMeta = Pick<
  Validation,
  'allowBlank' | 'showInputMessage' | 'promptTitle' | 'prompt' | 'showErrorMessage' | 'errorStyle' | 'errorTitle' | 'error'
>;
type DataValidationMetaBySheet = Record<string, Record<string, ValidationMeta>>;
type DataValidationXmlPatch = { range: Validation['range']; meta: ValidationMeta };
type DataValidationXmlPatchesBySheet = Record<string, DataValidationXmlPatch[]>;
type PageSetupXmlPatchesBySheet = Record<string, Pick<SheetPageSetup, 'cellComments'>>;

function importValidationMeta(dv: ExcelJS.DataValidation): ValidationMeta {
  const source = dv as ExcelJS.DataValidation & {
    promptTitle?: string;
    prompt?: string;
    errorStyle?: string;
    errorTitle?: string;
    error?: string;
  };
  const meta: ValidationMeta = {};
  if (source.allowBlank === false) meta.allowBlank = false;
  if (source.showInputMessage === true) meta.showInputMessage = true;
  if (typeof source.promptTitle === 'string' && source.promptTitle) meta.promptTitle = source.promptTitle;
  if (typeof source.prompt === 'string' && source.prompt) meta.prompt = source.prompt;
  if (source.showErrorMessage === false) meta.showErrorMessage = false;
  if (source.errorStyle === 'stop' || source.errorStyle === 'warning' || source.errorStyle === 'information') {
    meta.errorStyle = source.errorStyle;
  }
  if (typeof source.errorTitle === 'string' && source.errorTitle) meta.errorTitle = source.errorTitle;
  if (typeof source.error === 'string' && source.error) meta.error = source.error;
  return meta;
}

function exportValidationMeta(rule: Validation): Partial<ExcelJS.DataValidation> {
  return {
    allowBlank: rule.allowBlank ?? true,
    showInputMessage: rule.showInputMessage,
    promptTitle: rule.promptTitle,
    prompt: rule.prompt,
    showErrorMessage: rule.showErrorMessage ?? true,
    errorStyle: rule.errorStyle,
    errorTitle: rule.errorTitle,
    error: rule.error,
  } as Partial<ExcelJS.DataValidation>;
}

function exportValidationXmlPatch(rule: Validation): ValidationMeta | undefined {
  const meta: ValidationMeta = {};
  if (rule.allowBlank === false) meta.allowBlank = false;
  if (rule.showErrorMessage === false) meta.showErrorMessage = false;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function parseXmlValidationMeta(node: Element): ValidationMeta {
  const meta: ValidationMeta = {};
  const allowBlank = xmlBool(node.getAttribute('allowBlank'));
  const showInputMessage = xmlBool(node.getAttribute('showInputMessage'));
  const showErrorMessage = xmlBool(node.getAttribute('showErrorMessage'));
  if (allowBlank === false) meta.allowBlank = false;
  if (showInputMessage === true) meta.showInputMessage = true;
  if (showErrorMessage === false) meta.showErrorMessage = false;
  const errorStyle = node.getAttribute('errorStyle');
  if (errorStyle === 'stop' || errorStyle === 'warning' || errorStyle === 'information') meta.errorStyle = errorStyle;
  const promptTitle = node.getAttribute('promptTitle');
  const prompt = node.getAttribute('prompt');
  const errorTitle = node.getAttribute('errorTitle');
  const error = node.getAttribute('error');
  if (promptTitle) meta.promptTitle = promptTitle;
  if (prompt) meta.prompt = prompt;
  if (errorTitle) meta.errorTitle = errorTitle;
  if (error) meta.error = error;
  return meta;
}

async function extractDataValidationMetadata(data: ArrayBuffer): Promise<DataValidationMetaBySheet> {
  const out: DataValidationMetaBySheet = {};
  try {
    const zip = await JSZip.loadAsync(data);
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relsXml) return out;

    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const targetById = new Map<string, string>();
    for (const rel of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) targetById.set(id, normalizeWorkbookRelTarget(target));
    }

    const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
    for (const sheetEl of Array.from(workbookDoc.getElementsByTagName('sheet'))) {
      const name = sheetEl.getAttribute('name');
      const relId = sheetEl.getAttribute('r:id');
      const path = relId ? targetById.get(relId) : undefined;
      if (!name || !path) continue;
      const worksheetXml = await zip.file(path)?.async('string');
      if (!worksheetXml) continue;
      const worksheetDoc = new DOMParser().parseFromString(worksheetXml, 'application/xml');
      for (const node of Array.from(worksheetDoc.getElementsByTagName('dataValidation'))) {
        const sqref = node.getAttribute('sqref');
        if (!sqref) continue;
        const meta = parseXmlValidationMeta(node);
        if (Object.keys(meta).length === 0) continue;
        for (const ref of sqref.split(/\s+/).filter(Boolean)) {
          out[name] ??= {};
          out[name][ref] = meta;
        }
      }
    }
  } catch {
    // Validation UI metadata is compatibility metadata; import should continue without it.
  }
  return out;
}

function rangeToAddress(range: CondRule['range']): string | undefined {
  const { minR, maxR, minC, maxC } = range;
  if (![minR, maxR, minC, maxC].every((value) => Number.isInteger(value) && value >= 0)) {
    return undefined;
  }
  const start = `${idxToCol(Math.min(minC, maxC))}${Math.min(minR, maxR) + 1}`;
  const end = `${idxToCol(Math.max(minC, maxC))}${Math.max(minR, maxR) + 1}`;
  return start === end ? start : `${start}:${end}`;
}

function topLeftFromRange(range: CondRule['range']): string {
  return `${idxToCol(Math.min(range.minC, range.maxC))}${Math.min(range.minR, range.maxR) + 1}`;
}

function conditionalStyleFromFormat(format: CondRule['format']): Partial<ExcelJS.Style> | undefined {
  const style: Partial<ExcelJS.Style> = {};
  if (format.bgColor) {
    const bg = normalizeHexColor(format.bgColor);
    if (bg) {
      style.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bg.slice(1)}` },
        bgColor: { argb: `FF${bg.slice(1)}` },
      };
    }
  }
  if (format.textColor || format.bold) {
    const color = normalizeHexColor(format.textColor);
    style.font = {
      bold: format.bold || undefined,
      color: color ? { argb: `FF${color.slice(1)}` } : undefined,
    };
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function conditionalFormatFromStyle(style: Partial<ExcelJS.Style> | null | undefined): CondRule['format'] | undefined {
  if (!style) return undefined;
  const out: CondRule['format'] = {};
  const font = style.font as ExcelJS.Font | undefined;
  if (font?.bold) out.bold = true;
  const textColor = argbToHex(font?.color?.argb ?? '');
  if (textColor) out.textColor = textColor;
  const fill = style.fill as ExcelJS.FillPattern | undefined;
  const bgColor = argbToHex(fill?.fgColor?.argb ?? fill?.bgColor?.argb ?? '');
  if (bgColor) out.bgColor = bgColor;
  return Object.keys(out).length > 0 ? out : undefined;
}

function conditionalFormulaLiteral(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('=')) return trimmed.slice(1);
  if (/^(?:TRUE|FALSE)$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[+-]?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) && Number.isFinite(Number(trimmed))) {
    return trimmed;
  }
  return `"${escapeFormulaString(value)}"`;
}

function formulaLiteralValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/""/g, '"');
  }
  return raw;
}

function conditionalRuleToExcel(
  rule: CondRule,
  priority: number,
): { ref: string; rule: ExcelJS.ConditionalFormattingRule } | undefined {
  const ref = rangeToAddress(rule.range);
  if (!ref) return undefined;
  const style = conditionalStyleFromFormat(rule.format);
  if (!style) return undefined;
  const base = { priority, style };
  const simpleOps: Partial<Record<CondOp, string>> = {
    '>': 'greaterThan',
    '<': 'lessThan',
    '>=': 'greaterThanOrEqual',
    '<=': 'lessThanOrEqual',
    '==': 'equal',
    '!=': 'notEqual',
  };
  const simpleOp = simpleOps[rule.op];
  if (simpleOp) {
    return {
      ref,
      rule: {
        ...base,
        type: 'cellIs',
        operator: simpleOp,
        formulae: [conditionalFormulaLiteral(rule.value)],
      } as ExcelJS.ConditionalFormattingRule,
    };
  }
  if (rule.op === 'between') {
    const [a = '', b = ''] = rule.value.split(',');
    return {
      ref,
      rule: {
        ...base,
        type: 'cellIs',
        operator: 'between',
        formulae: [conditionalFormulaLiteral(a), conditionalFormulaLiteral(b)],
      } as ExcelJS.ConditionalFormattingRule,
    };
  }
  if (rule.op === 'contains') {
    return {
      ref,
      rule: {
        ...base,
        type: 'containsText',
        operator: 'containsText',
        text: rule.value,
      } as ExcelJS.ConditionalFormattingRule,
    };
  }
  if (rule.op === 'empty' || rule.op === 'nonempty') {
    const topLeft = topLeftFromRange(rule.range);
    return {
      ref,
      rule: {
        ...base,
        type: 'expression',
        formulae: [rule.op === 'empty' ? `LEN(TRIM(${topLeft}))=0` : `LEN(TRIM(${topLeft}))>0`],
      },
    };
  }
  return undefined;
}

function applyConditionalFormatting(ws: ExcelJS.Worksheet, rules: CondRule[] | undefined): void {
  (rules ?? []).forEach((rule, idx) => {
    const converted = conditionalRuleToExcel(rule, idx + 1);
    if (!converted) return;
    try {
      ws.addConditionalFormatting({ ref: converted.ref, rules: [converted.rule] });
    } catch {
      // Conditional formatting is compatibility metadata; invalid rules should not block export.
    }
  });
}

function parseContainsTextFormula(formula: string): string | undefined {
  const match = formula.match(/SEARCH\("((?:[^"]|"")*)"\s*,/i);
  return match ? match[1].replace(/""/g, '"') : undefined;
}

function expressionToCondOp(formula: unknown, topLeft: string): { op: CondOp; value: string } | undefined {
  const raw = String(formula ?? '').replace(/^=/, '');
  const normalized = raw.replace(/\$/g, '').replace(/\s+/g, '').toUpperCase();
  const tl = topLeft.toUpperCase();
  if (normalized === `LEN(TRIM(${tl}))=0` || normalized === `LEN(${tl})=0`) {
    return { op: 'empty', value: '' };
  }
  if (normalized === `LEN(TRIM(${tl}))>0` || normalized === `LEN(${tl})>0`) {
    return { op: 'nonempty', value: '' };
  }
  const contains = parseContainsTextFormula(raw);
  return contains === undefined ? undefined : { op: 'contains', value: contains };
}

function importConditionalRule(
  refRange: CondRule['range'],
  refText: string,
  rule: ExcelJS.ConditionalFormattingRule,
  id: string,
): CondRule | undefined {
  const format = conditionalFormatFromStyle(rule.style);
  if (!format) return undefined;
  if (rule.type === 'cellIs') {
    const operatorMap: Record<string, CondOp> = {
      greaterThan: '>',
      lessThan: '<',
      greaterThanOrEqual: '>=',
      lessThanOrEqual: '<=',
      equal: '==',
      notEqual: '!=',
      between: 'between',
    };
    const op = operatorMap[String(rule.operator ?? '')];
    if (!op) return undefined;
    const values = rule.formulae ?? [];
    return {
      id,
      range: refRange,
      op,
      value: op === 'between'
        ? `${formulaLiteralValue(values[0])},${formulaLiteralValue(values[1])}`
        : formulaLiteralValue(values[0]),
      format,
    };
  }
  if (rule.type === 'containsText') {
    if (rule.operator === 'containsBlanks') return { id, range: refRange, op: 'empty', value: '', format };
    if (rule.operator === 'notContainsBlanks') return { id, range: refRange, op: 'nonempty', value: '', format };
    if (rule.operator === 'containsText') {
      const text = (rule as { text?: unknown }).text;
      const value = text == null ? parseContainsTextFormula(String(rule.formulae?.[0] ?? '')) : String(text);
      return value == null ? undefined : { id, range: refRange, op: 'contains', value, format };
    }
  }
  if (rule.type === 'expression') {
    const parsedRef = parseRangeReference(refText);
    const topLeft = parsedRef ? `${parsedRef.startCol}${parsedRef.startRow}` : topLeftFromRange(refRange);
    const parsed = expressionToCondOp(rule.formulae?.[0], topLeft);
    return parsed ? { id, range: refRange, ...parsed, format } : undefined;
  }
  return undefined;
}

function extractConditionalFormatting(ws: ExcelJS.Worksheet): CondRule[] {
  const model = (ws as unknown as {
    conditionalFormattings?: ExcelJS.ConditionalFormattingOptions[];
  }).conditionalFormattings ?? (ws.model as {
    conditionalFormattings?: ExcelJS.ConditionalFormattingOptions[];
  }).conditionalFormattings ?? [];
  const out: CondRule[] = [];
  for (const cf of model) {
    const refs = String(cf.ref ?? '').split(/\s+/).filter(Boolean);
    for (const ref of refs) {
      const range = rangeFromAddress(ref);
      if (!range) continue;
      for (const rule of cf.rules ?? []) {
        const imported = importConditionalRule(range, ref, rule, `xlsx_cf_${out.length}`);
        if (imported) out.push(imported);
      }
    }
  }
  return out;
}

function validationId(index: number): string {
  return `xlsx_vd_${index}`;
}

function validationFormulaText(value: unknown): string {
  if (value instanceof Date) return formatDateLiteral(value);
  return String(value).replace(/^=/, '');
}

function importDataValidation(
  address: string,
  dv: ExcelJS.DataValidation,
  index: number,
  wb: ExcelJS.Workbook,
  currentSheetName: string,
  xmlMeta?: ValidationMeta,
): Validation | undefined {
  const range = rangeFromAddress(address);
  if (!range) return undefined;
  const meta = { ...importValidationMeta(dv), ...(xmlMeta ?? {}) };
  if (dv.type === 'list') {
    const items = parseInlineListFormula(dv.formulae?.[0])
      ?? resolveListSourceItems(wb, dv.formulae?.[0], currentSheetName)
      ?? resolveNamedListSourceItems(wb, dv.formulae?.[0]);
    if (!items) return undefined;
    const upper = items.map((item) => item.toUpperCase());
    const isCheckbox = items.length === 2 && upper.includes('TRUE') && upper.includes('FALSE');
    return {
      id: validationId(index),
      range,
      kind: isCheckbox ? 'checkbox' : 'list',
      items: isCheckbox ? ['TRUE', 'FALSE'] : items,
      ...meta,
    };
  }
  if (dv.type === 'whole' || dv.type === 'decimal' || dv.type === 'date' || dv.type === 'textLength') {
    const operator = dv.operator ?? 'between';
    const supported = [
      'between',
      'notBetween',
      'equal',
      'notEqual',
      'greaterThan',
      'lessThan',
      'greaterThanOrEqual',
      'lessThanOrEqual',
    ] as const;
    if (!supported.includes(operator as (typeof supported)[number])) return undefined;
    const formula1 = dv.formulae?.[0];
    if (formula1 === undefined || formula1 === null || String(formula1).trim() === '') return undefined;
    const formula2 = dv.formulae?.[1];
    const kind = dv.type === 'whole'
      ? 'integer'
      : dv.type === 'decimal'
        ? 'number'
        : dv.type;
    return {
      id: validationId(index),
      range,
      kind,
      operator: operator as NumericValidationOperator,
      formula1: validationFormulaText(formula1),
      formula2: formula2 === undefined || formula2 === null ? undefined : validationFormulaText(formula2),
      ...meta,
    };
  }
  if (dv.type === 'custom') {
    const formula1 = dv.formulae?.[0];
    if (formula1 === undefined || formula1 === null || String(formula1).trim() === '') return undefined;
    return {
      id: validationId(index),
      range,
      kind: 'custom',
      formula1: validationFormulaText(formula1),
      ...meta,
    };
  }
  return undefined;
}

function extractDataValidations(ws: ExcelJS.Worksheet, validationMeta: Record<string, ValidationMeta> = {}): Validation[] {
  const model = (ws as unknown as {
    dataValidations?: { model?: Record<string, ExcelJS.DataValidation | undefined> };
  }).dataValidations?.model ?? {};
  const out: Validation[] = [];
  for (const [address, dv] of Object.entries(model)) {
    if (!dv) continue;
    const imported = importDataValidation(address, dv, out.length, ws.workbook, ws.name, validationMeta[address]);
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
  if (rule.kind === 'list' || rule.kind === 'checkbox') {
    const items = rule.kind === 'checkbox' ? ['TRUE', 'FALSE'] : rule.items;
    if (items.length === 0) return undefined;
    const inlineFormula = inlineListFormula(items);
    const formula = inlineFormula.length <= INLINE_VALIDATION_FORMULA_LIMIT
      ? inlineFormula
      : rangeFormulaForLongList?.(items);
    if (!formula) return undefined;
    return {
      type: 'list',
      ...exportValidationMeta(rule),
      formulae: [formula],
    };
  }
  if (rule.kind === 'number' || rule.kind === 'integer' || rule.kind === 'date' || rule.kind === 'textLength') {
    if (!rule.formula1 || ((rule.operator === 'between' || rule.operator === 'notBetween') && !rule.formula2)) return undefined;
    const type = rule.kind === 'integer'
      ? 'whole'
      : rule.kind === 'number'
        ? 'decimal'
        : rule.kind;
    return {
      type,
      operator: rule.operator,
      ...exportValidationMeta(rule),
      formulae: rule.formula2 ? [rule.formula1, rule.formula2] : [rule.formula1],
    };
  }
  if (rule.kind === 'custom') {
    if (!rule.formula1) return undefined;
    return {
      type: 'custom',
      ...exportValidationMeta(rule),
      formulae: [rule.formula1],
    };
  }
  return undefined;
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

function normalizeExcelErrorLiteral(raw: unknown): ExcelJS.CellErrorValue['error'] | undefined {
  if (typeof raw !== 'string') return undefined;
  const upper = raw.trim().toUpperCase();
  return EXCEL_ERROR_LITERALS.has(upper as ExcelJS.CellErrorValue['error'])
    ? upper as ExcelJS.CellErrorValue['error']
    : undefined;
}

function coerceErrorCellValue(raw: unknown): ExcelJS.CellErrorValue | undefined {
  const error = normalizeExcelErrorLiteral(raw);
  return error ? { error } : undefined;
}

function coerceCellValue(raw: string, fmt?: CellFormat): ExcelJS.CellValue {
  const error = coerceErrorCellValue(raw);
  if (error) return error;
  if (fmt?.numberFmt === 'date' || fmt?.numberFmt === 'datetime') {
    const date = parseDateLiteral(raw);
    if (date) return date;
  }
  if (raw === 'TRUE' || raw === 'FALSE') return raw === 'TRUE';
  if (isSafeNumericLiteral(raw)) return Number(raw);
  return raw;
}

function coerceFormulaResult(raw: string, fmt?: CellFormat): ExcelJS.CellValue {
  const error = coerceErrorCellValue(raw);
  if (error) return error;

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

export async function importXlsxFile(file: File, options?: XlsxImportOptions): Promise<ImportedSheet[]> {
  if (/\.(csv|tsv)$/i.test(file.name)) {
    const delimiter = /\.tsv$/i.test(file.name) ? '\t' : ',';
    const name = file.name.replace(/\.[^.]+$/, '') || 'CSV';
    return [importCsvText(await readFileText(file), name, delimiter)];
  }
  const limits = resolveImportLimits(options);
  if (file.size > limits.maxFileBytes) {
    throw new Error(`XLSX import is too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${(limits.maxFileBytes / 1024 / 1024).toFixed(0)}MB.`);
  }
  const data = await readFileArrayBuffer(file);
  return importXlsxBuffer(data, options);
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

function resolveImportLimits(options?: XlsxImportOptions): XlsxImportLimits {
  return { ...DEFAULT_XLSX_IMPORT_LIMITS, ...(options?.limits ?? {}) };
}

function countWorksheetCells(ws: XLSX.WorkSheet | undefined): number {
  if (!ws) return 0;
  let count = 0;
  for (const key of Object.keys(ws)) {
    if (!key.startsWith('!')) count += 1;
  }
  return count;
}

function isZipLikeBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const bytes = new Uint8Array(data, 0, 4);
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function zipEntryUncompressedSize(file: JSZip.JSZipObject): number | undefined {
  const data = (file as unknown as { _data?: { uncompressedSize?: unknown } })._data;
  const size = data?.uncompressedSize;
  return typeof size === 'number' && Number.isFinite(size) ? size : undefined;
}

async function assertXlsxZipWithinLimits(data: ArrayBuffer, limits: XlsxImportLimits): Promise<void> {
  if (!isZipLikeBuffer(data)) return;
  const zip = await JSZip.loadAsync(data);
  const files = Object.values(zip.files).filter((file) => !file.dir);
  if (files.length > limits.maxZipEntries) {
    throw new Error(`XLSX import has too many ZIP entries: ${files.length} exceeds ${limits.maxZipEntries}.`);
  }
  let totalUncompressed = 0;
  for (const file of files) {
    const size = zipEntryUncompressedSize(file);
    if (size === undefined) continue;
    if (size > limits.maxZipEntryBytes) {
      throw new Error(`XLSX import has an oversized ZIP entry: ${file.name} is ${(size / 1024 / 1024).toFixed(1)}MB and exceeds ${(limits.maxZipEntryBytes / 1024 / 1024).toFixed(0)}MB.`);
    }
    totalUncompressed += size;
    if (totalUncompressed > limits.maxZipUncompressedBytes) {
      throw new Error(`XLSX import expands too large: ${(totalUncompressed / 1024 / 1024).toFixed(1)}MB exceeds ${(limits.maxZipUncompressedBytes / 1024 / 1024).toFixed(0)}MB.`);
    }
  }
}

function assertXlsxImportWithinLimits(data: ArrayBuffer, wb: XLSX.WorkBook, sheetNames: string[], limits: XlsxImportLimits): void {
  if (data.byteLength > limits.maxFileBytes) {
    throw new Error(`XLSX import is too large: ${(data.byteLength / 1024 / 1024).toFixed(1)}MB exceeds ${(limits.maxFileBytes / 1024 / 1024).toFixed(0)}MB.`);
  }
  if (sheetNames.length > limits.maxSheets) {
    throw new Error(`XLSX import has too many sheets: ${sheetNames.length} exceeds ${limits.maxSheets}.`);
  }
  let totalCells = 0;
  for (const name of sheetNames) {
    totalCells += countWorksheetCells(wb.Sheets[name]);
    if (totalCells > limits.maxCells) {
      throw new Error(`XLSX import has too many populated cells: ${totalCells} exceeds ${limits.maxCells}.`);
    }
  }
}

/**
 * Buffer 기반 import — 테스트·서버사이드용. importXlsxFile 의 내부 구현.
 * SheetJS 로 값/수식/병합, ExcelJS 로 서식/열·행 크기/freeze 추출.
 */
export async function importXlsxBuffer(data: ArrayBuffer, options?: XlsxImportOptions): Promise<ImportedSheet[]> {
  const limits = resolveImportLimits(options);
  await assertXlsxZipWithinLimits(data, limits);
  // SheetJS — 값/수식/병합 추출 (안정적).
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const importSheetNames = wb.SheetNames.filter((name) => (
    !isInternalValidationListSheet(wb, name) && !isInternalChartMetadataSheet(wb, name)
  ));
  assertXlsxImportWithinLimits(data, wb, importSheetNames, limits);
  const chartMetadata = extractEmbeddedChartMetadata(wb);
  const nativeChartMetadata = await extractNativeEmbeddedCharts(data);
  const base = importSheetNames.map((name) => extractSheet(wb.Sheets[name], name));
  base.forEach((sheet) => {
    const charts = mergeEmbeddedCharts(chartMetadata[sheet.name], nativeChartMetadata[sheet.name]);
    if (charts.length) sheet.embeddedCharts = charts;
  });
  const namedRanges = extractNamedRanges(wb);
  const tableFilters = await extractTableFilterMetadata(data);
  const worksheetFilters = await extractWorksheetAutoFilterMetadata(data);
  const validationMetadata = await extractDataValidationMetadata(data);
  if (base.length > 0 && Object.keys(namedRanges).length > 0) {
    base[0].namedRanges = namedRanges;
  }

  // ExcelJS — 서식/열너비/행높이/freeze 추가 추출. 실패해도 base 반환.
  try {
    const ewb = new ExcelJS.Workbook();
    await ewb.xlsx.load(data);
    for (const sheet of base) {
      const ews = ewb.getWorksheet(sheet.name);
      if (ews) enrichWithStyles(sheet, ews, tableFilters, worksheetFilters, validationMetadata);
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
    } else if (cell.t === 'e') {
      const error = normalizeExcelErrorLiteral(cell.w ?? cell.v);
      cells[key] = error ?? String(cell.w ?? cell.v ?? '');
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
function enrichWithStyles(
  sheet: ImportedSheet,
  ews: ExcelJS.Worksheet,
  tableFilters: TableFiltersByName = {},
  worksheetFilters: WorksheetFiltersByName = {},
  validationMetadata: DataValidationMetaBySheet = {},
): void {
  const cellFormats: CellFormats = {};
  const colWidths: Record<number, number> = {};
  const rowHeights: Record<number, number> = {};
  const hiddenCols: HiddenDimensionMap = {};
  const hiddenRows: HiddenDimensionMap = {};
  const outlineColLevels: OutlineLevelMap = {};
  const outlineRowLevels: OutlineLevelMap = {};
  const comments: Comments = {};

  const state = normalizeSheetVisibility(ews.state);
  if (state) sheet.sheetState = state;
  const tabColor = argbToHex((ews.properties as { tabColor?: { argb?: string } }).tabColor?.argb);
  if (tabColor) sheet.tabColor = tabColor;
  const importedView = normalizeSheetView(ews.views?.[0]);
  if (importedView) sheet.sheetView = importedView;
  const pageSetup = normalizeSheetPageSetup(ews.pageSetup);
  if (pageSetup) sheet.pageSetup = pageSetup;
  const headerFooter = normalizeSheetHeaderFooter(ews.headerFooter);
  if (headerFooter) sheet.headerFooter = headerFooter;
  const outlineProperties = (ews.properties as {
    outlineProperties?: { summaryBelow?: boolean; summaryRight?: boolean };
  }).outlineProperties;
  const autoFilterRef = autoFilterToRef((ews as unknown as { autoFilter?: unknown }).autoFilter);
  if (autoFilterRef) sheet.autoFilterRef = autoFilterRef;
  const worksheetFilter = worksheetFilters[sheet.name];
  if (worksheetFilter?.ref && !sheet.autoFilterRef) sheet.autoFilterRef = worksheetFilter.ref;
  if (worksheetFilter?.columns.some(hasTableColumnFilter)) sheet.autoFilterColumns = worksheetFilter.columns;
  if (worksheetFilter?.sortState) sheet.sortState = worksheetFilter.sortState;
  const sheetProtection = normalizeSheetProtection(
    (ews as unknown as { sheetProtection?: unknown }).sheetProtection,
  );
  if (sheetProtection) sheet.sheetProtection = sheetProtection;
  const tables = extractTableModels(ews, tableFilters);
  if (tables.length > 0) sheet.tables = tables;

  // 열 너비 — character units → px (대략 width * 7 + 5)
  ews.columns?.forEach((col, idx) => {
    if (col?.hidden) hiddenCols[idx] = true;
    if (typeof col?.outlineLevel === 'number' && col.outlineLevel > 0) outlineColLevels[idx] = Math.min(7, Math.floor(col.outlineLevel));
    if (typeof col?.width === 'number' && Number.isFinite(col.width)) {
      colWidths[idx] = Math.round(col.width * 7 + 5);
    }
  });

  // 행 높이 + 셀 서식
  ews.eachRow({ includeEmpty: true }, (row, rowNum) => {
    if (row.hidden) hiddenRows[rowNum - 1] = true;
    if (typeof row.outlineLevel === 'number' && row.outlineLevel > 0) outlineRowLevels[rowNum - 1] = Math.min(7, Math.floor(row.outlineLevel));
    if (typeof row.height === 'number' && Number.isFinite(row.height)) {
      // pt → px (1pt ≈ 1.333px)
      rowHeights[rowNum - 1] = Math.round(row.height * 1.333);
    }
    row.eachCell({ includeEmpty: true }, (cell) => {
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
  for (const rowModel of ((ews.model as { rows?: Array<{ number?: number; outlineLevel?: number; hidden?: boolean; height?: number }> }).rows ?? [])) {
    if (!Number.isInteger(rowModel.number) || rowModel.number! < 1) continue;
    const idx = rowModel.number! - 1;
    if (rowModel.hidden) hiddenRows[idx] = true;
    if (typeof rowModel.outlineLevel === 'number' && rowModel.outlineLevel > 0) {
      outlineRowLevels[idx] = Math.min(7, Math.floor(rowModel.outlineLevel));
    }
    if (typeof rowModel.height === 'number' && Number.isFinite(rowModel.height)) {
      rowHeights[idx] = Math.round(rowModel.height * 1.333);
    }
  }

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
  if (Object.keys(hiddenCols).length > 0) sheet.hiddenCols = hiddenCols;
  if (Object.keys(hiddenRows).length > 0) sheet.hiddenRows = hiddenRows;
  const sheetOutline = normalizeSheetOutline({
    rowLevels: outlineRowLevels,
    colLevels: outlineColLevels,
    ...(typeof outlineProperties?.summaryBelow === 'boolean' ? { summaryBelow: outlineProperties.summaryBelow } : {}),
    ...(typeof outlineProperties?.summaryRight === 'boolean' ? { summaryRight: outlineProperties.summaryRight } : {}),
  });
  if (sheetOutline) sheet.sheetOutline = sheetOutline;
  if (Object.keys(comments).length > 0) sheet.comments = comments;
  if (freezeRows > 0) sheet.freezeRows = freezeRows;
  if (freezeCols > 0) sheet.freezeCols = freezeCols;
  const validations = extractDataValidations(ews, validationMetadata[sheet.name]);
  if (validations.length > 0) sheet.validations = validations;
  const condRules = extractConditionalFormatting(ews);
  if (condRules.length > 0) sheet.condRules = condRules;
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

  const protection = cell.protection;
  if (protection?.locked === false || protection?.hidden === true) {
    out.protection = {};
    if (protection.locked === false) out.protection.locked = false;
    if (protection.hidden === true) out.protection.hidden = true;
  }

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
  return f
    .replace(/\b_xlfn\./gi, '')
    .replace(/\b_xlws\./gi, '')
    .replace(/\bAVERAGE\b/gi, 'AVG');
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
  wb.calcProperties.fullCalcOnLoad = true;
  const usedSheetNames = new Set<string>();
  const allSheetsByName = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.cells]));
  const allTablesByName = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.tables ?? []]));
  const formulaCache = new Map<string, string>();
  const exportNames = sheets.map((sheet) => uniqueSheetName(sheet.name, usedSheetNames));
  const exportNameByOriginal = new Map<string, string>();
  sheets.forEach((sheet, idx) => {
    if (!exportNameByOriginal.has(sheet.name)) exportNameByOriginal.set(sheet.name, exportNames[idx]);
  });
  const usedTableNames = new Set<string>();
  const tableFiltersByExportName: Record<string, SheetTable> = {};
  const worksheetFiltersByExportName: WorksheetFiltersByName = {};
  const validationPatchesByExportName: DataValidationXmlPatchesBySheet = {};
  const pageSetupPatchesByExportName: PageSetupXmlPatchesBySheet = {};
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
    const state = normalizeSheetVisibility(sheet.sheetState);
    if (state) ws.state = state;
    const tabColor = normalizeHexColor(sheet.tabColor);
    if (tabColor) {
      ws.properties.tabColor = { argb: `FF${tabColor.slice(1)}` };
    }
    const pageSetup = normalizeSheetPageSetup(sheet.pageSetup);
    if (pageSetup) {
      ws.pageSetup = pageSetup as Partial<ExcelJS.PageSetup>;
      if (pageSetup.cellComments) pageSetupPatchesByExportName[safeName] = { cellComments: pageSetup.cellComments };
    }
    const headerFooter = normalizeSheetHeaderFooter(sheet.headerFooter);
    if (headerFooter) ws.headerFooter = headerFooter as Partial<ExcelJS.HeaderFooter>;
    const sheetOutline = normalizeSheetOutline(sheet.sheetOutline);
    if (sheetOutline) {
      const properties = ws.properties as ExcelJS.Worksheet['properties'];
      if (sheetOutline.rowLevels && Object.keys(sheetOutline.rowLevels).length > 0) {
        properties.outlineLevelRow = Math.max(...Object.values(sheetOutline.rowLevels));
      }
      if (sheetOutline.colLevels && Object.keys(sheetOutline.colLevels).length > 0) {
        properties.outlineLevelCol = Math.max(...Object.values(sheetOutline.colLevels));
      }
      if (sheetOutline.summaryBelow !== undefined || sheetOutline.summaryRight !== undefined) {
        properties.outlineProperties = {
          ...(properties.outlineProperties ?? {}),
          ...(sheetOutline.summaryBelow !== undefined ? { summaryBelow: sheetOutline.summaryBelow } : {}),
          ...(sheetOutline.summaryRight !== undefined ? { summaryRight: sheetOutline.summaryRight } : {}),
        };
      }
    }
    if (sheet.autoFilterRef) {
      ws.autoFilter = sheet.autoFilterRef;
      if (sheet.autoFilterColumns?.some(hasTableColumnFilter) || normalizeSortState(sheet.sortState)) {
        worksheetFiltersByExportName[safeName] = {
          ref: sheet.autoFilterRef,
          columns: sheet.autoFilterColumns ?? [],
          sortState: normalizeSortState(sheet.sortState),
        };
      }
    } else if (normalizeSortState(sheet.sortState)) {
      worksheetFiltersByExportName[safeName] = {
        ref: sheet.sortState?.ref,
        columns: [],
        sortState: normalizeSortState(sheet.sortState),
      };
    }
    const sheetProtection = normalizeSheetProtection(sheet.sheetProtection);
    if (sheetProtection) {
      (ws as unknown as { sheetProtection?: SheetProtection }).sheetProtection = sheetProtection;
    }
    applyTables(ws, sheet, usedTableNames, tableFiltersByExportName);

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
              tables: allTablesByName,
              formulaCache,
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
    for (const [ref, fmt] of Object.entries(sheet.cellFormats ?? {})) {
      if (Object.prototype.hasOwnProperty.call(sheet.cells, ref)) continue;
      const match = ref.match(/^([A-Z]+)(\d+)$/);
      if (!match) continue;
      const col = colToIdx(match[1]) + 1;
      const row = Number(match[2]);
      maxColIdx = Math.max(maxColIdx, col - 1);
      applyFormat(ws.getCell(row, col), fmt);
    }

    for (const key of Object.keys(sheet.colWidths ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx)) maxColIdx = Math.max(maxColIdx, idx);
    }
    for (const key of Object.keys(sheet.hiddenCols ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx)) maxColIdx = Math.max(maxColIdx, idx);
    }
    for (const key of Object.keys(sheetOutline?.colLevels ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx)) maxColIdx = Math.max(maxColIdx, idx);
    }
    for (let idx = 0; idx <= maxColIdx; idx++) {
      const px = sheet.colWidths?.[idx];
      const column = ws.getColumn(idx + 1);
      column.width = typeof px === 'number' && Number.isFinite(px)
        ? Math.max(1, Math.round(((px - 5) / 7) * 100) / 100)
        : 15;
      const outlineLevel = sheetOutline?.colLevels?.[idx];
      if (typeof outlineLevel === 'number' && outlineLevel > 0) {
        column.outlineLevel = Math.min(7, Math.floor(outlineLevel));
      }
      if (sheet.hiddenCols?.[idx]) {
        column.hidden = true;
      }
    }
    for (const [key, px] of Object.entries(sheet.rowHeights ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx) && typeof px === 'number' && Number.isFinite(px)) {
        ws.getRow(idx + 1).height = Math.max(1, Math.round((px / 1.333) * 100) / 100);
      }
    }
    for (const [key, hidden] of Object.entries(sheet.hiddenRows ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx) && hidden) {
        const row = ws.getRow(idx + 1);
        row.hidden = true;
        if (typeof row.height !== 'number') row.height = 15;
      }
    }
    for (const [key, outlineLevel] of Object.entries(sheetOutline?.rowLevels ?? {})) {
      const idx = Number(key);
      if (Number.isFinite(idx) && typeof outlineLevel === 'number' && outlineLevel > 0) {
        const row = ws.getRow(idx + 1);
        row.outlineLevel = Math.min(7, Math.floor(outlineLevel));
        if (typeof row.height !== 'number') row.height = 15;
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
    const sheetView = normalizeSheetView(sheet.sheetView);
    const viewOptions = {
      ...(sheetView?.showGridLines !== undefined ? { showGridLines: sheetView.showGridLines } : {}),
      ...(sheetView?.showRowColHeaders !== undefined ? { showRowColHeaders: sheetView.showRowColHeaders } : {}),
      ...(sheetView?.rightToLeft !== undefined ? { rightToLeft: sheetView.rightToLeft } : {}),
      ...(sheetView?.zoomScale !== undefined ? { zoomScale: sheetView.zoomScale } : {}),
    };
    if ((sheet.freezeRows ?? 0) > 0 || (sheet.freezeCols ?? 0) > 0) {
      ws.views = [{
        ...viewOptions,
        state: 'frozen',
        xSplit: Math.max(0, sheet.freezeCols ?? 0),
        ySplit: Math.max(0, sheet.freezeRows ?? 0),
      }];
    } else if (Object.keys(viewOptions).length > 0) {
      ws.views = [{
        ...viewOptions,
        state: 'normal',
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
    for (const rule of sheet.validations ?? []) {
      const meta = exportValidationXmlPatch(rule);
      if (!meta) continue;
      validationPatchesByExportName[safeName] ??= [];
      validationPatchesByExportName[safeName].push({ range: rule.range, meta });
    }
    applyConditionalFormatting(ws, sheet.condRules);
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

  addEmbeddedChartMetadataSheet(wb, sheets, exportNames, usedSheetNames);
  const buffer = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buffer as ArrayBufferLike);
  const out = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const withNativeCharts = await patchWorkbookEmbeddedNativeCharts(out, sheets, exportNames);
  const withTableFilters = await patchWorkbookTableFilters(withNativeCharts, tableFiltersByExportName);
  const withWorksheetFilters = await patchWorkbookWorksheetFilters(withTableFilters, worksheetFiltersByExportName);
  const withPageSetup = await patchWorkbookPageSetupMetadata(withWorksheetFilters, pageSetupPatchesByExportName);
  return patchWorkbookDataValidationMetadata(withPageSetup, validationPatchesByExportName);
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
  if (fmt.protection) {
    cell.protection = {
      locked: fmt.protection.locked,
      hidden: fmt.protection.hidden,
    };
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

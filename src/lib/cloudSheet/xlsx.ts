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
import { colToIdx, idxToCol } from './formula';
import { excelNumFmtToToken } from './numFmtMap';

type Cells = Record<string, string>;

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
  numberFmt?: 'currency-krw' | 'percent' | 'integer' | 'decimal1' | 'decimal2' | 'decimal3' | 'decimal4' | 'date';
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
}

// ─────────────────────────────────────────────
// Import (.xlsx → 우리 형식)  ← SheetJS 그대로 (안정성 검증)
// ─────────────────────────────────────────────

export async function importXlsxFile(file: File): Promise<ImportedSheet[]> {
  const data = await file.arrayBuffer();
  return importXlsxBuffer(data);
}

/**
 * Buffer 기반 import — 테스트·서버사이드용. importXlsxFile 의 내부 구현.
 * SheetJS 로 값/수식/병합, ExcelJS 로 서식/열·행 크기/freeze 추출.
 */
export async function importXlsxBuffer(data: ArrayBuffer): Promise<ImportedSheet[]> {
  // SheetJS — 값/수식/병합 추출 (안정적).
  const wb = XLSX.read(data, { type: 'array' });
  const base = wb.SheetNames.map((name) => extractSheet(wb.Sheets[name], name));

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

function extractSheet(ws: XLSX.WorkSheet | undefined, name: string): ImportedSheet {
  const cells: Cells = {};
  if (!ws) return { name, cells, merges: [] };
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue;
    const cell = ws[key] as XLSX.CellObject;
    if (cell.f) {
      cells[key] = '=' + normalizeFormula(cell.f);
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
      rowHeights[rowNum] = Math.round(row.height * 1.333);
    }
    row.eachCell({ includeEmpty: false }, (cell) => {
      const ref = cell.address; // 'A1' 형식
      const fmt = extractCellFormat(cell);
      if (fmt) cellFormats[ref] = fmt;
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
  if (freezeRows > 0) sheet.freezeRows = freezeRows;
  if (freezeCols > 0) sheet.freezeCols = freezeCols;
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

export async function exportXlsxFile(sheets: ExportSheetInput[], fileName: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ancano cloud';
  wb.created = new Date();

  for (const sheet of sheets) {
    const safeName = sheet.name.replace(/[\\/?*[\]]/g, '_').slice(0, 31) || 'Sheet';
    const ws = wb.addWorksheet(safeName);

    for (const [ref, raw] of Object.entries(sheet.cells)) {
      const match = ref.match(/^([A-Z]+)(\d+)$/);
      if (!match) continue;
      const col = colToIdx(match[1]) + 1;  // exceljs는 1-based
      const row = Number(match[2]);
      const cell = ws.getCell(row, col);

      // 값/수식
      if (raw.startsWith('=')) {
        // IMAGE(url) 특별 처리 — Microsoft 365 의 IMAGE 가 호환되지만 이전 버전엔 #NAME?
        // → result 에 URL 텍스트 + hyperlink 도 함께 저장하여 클릭 가능한 fallback 보장.
        const imgMatch = raw.match(/^=\s*IMAGE\(\s*"([^"]+)"/i);
        if (imgMatch) {
          const url = imgMatch[1];
          cell.value = {
            formula: raw.slice(1),
            result: url,
          };
          try { cell.hyperlink = url; } catch { /* exceljs 가 거부하면 skip */ }
        } else {
          cell.value = {
            formula: raw.slice(1).replace(/\bAVG\b/gi, 'AVERAGE'),
            // result는 비워두면 excel이 열 때 자동 계산
          };
        }
      } else {
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) {
          cell.value = n;
        } else if (raw === 'TRUE' || raw === 'FALSE') {
          cell.value = raw === 'TRUE';
        } else {
          cell.value = raw;
        }
      }

      // 서식
      const fmt = sheet.cellFormats?.[ref];
      if (fmt) applyFormat(cell, fmt);
    }

    // 열 자동 너비 (대략)
    ws.columns.forEach((col) => { col.width = 15; });

    // 셀 병합 — ExcelJS 는 1-based, (top, left, bottom, right)
    for (const m of sheet.merges ?? []) {
      try {
        ws.mergeCells(m.minR + 1, m.minC + 1, m.maxR + 1, m.maxC + 1);
      } catch {
        // 영역이 겹치면 던짐 — 무시하고 진행
      }
    }
  }

  if (wb.worksheets.length === 0) {
    wb.addWorksheet('Sheet1');
  }

  const buffer = await wb.xlsx.writeBuffer();
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

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

type Cells = Record<string, string>;

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  numberFmt?: 'currency-krw' | 'percent' | 'integer' | 'decimal2' | 'date';
  border?: 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right';
}
type CellFormats = Record<string, CellFormat>;

export interface Merge { minR: number; maxR: number; minC: number; maxC: number }

export interface ImportedSheet {
  name: string;
  cells: Cells;
  merges?: Merge[];
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
  const wb = XLSX.read(data, { type: 'array' });
  return wb.SheetNames.map((name) => extractSheet(wb.Sheets[name], name));
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
        cell.value = {
          formula: raw.slice(1).replace(/\bAVG\b/gi, 'AVERAGE'),
          // result는 비워두면 excel이 열 때 자동 계산
        };
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
  // 글꼴 (B/I/색)
  if (fmt.bold || fmt.italic || fmt.textColor) {
    cell.font = {
      bold: fmt.bold || undefined,
      italic: fmt.italic || undefined,
      color: fmt.textColor ? { argb: 'FF' + fmt.textColor.replace('#', '').toUpperCase() } : undefined,
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
  // 정렬
  if (fmt.align) {
    cell.alignment = { horizontal: fmt.align, vertical: 'middle' };
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
    case 'decimal2':      return '0.00';
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

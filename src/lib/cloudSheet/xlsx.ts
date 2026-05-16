/**
 * 시트 ↔ .xlsx 호환 (SheetJS 활용).
 *
 * v1: 값·수식 양방향. 서식(색·테두리·숫자형식)은 import만 보존 시도, export는 값/수식 우선.
 *     수식 함수명 변환: 우리 AVG ↔ 엑셀 AVERAGE
 * 한계:
 *   - 차트, 매크로, 피벗, 데이터 검증 등은 무시
 *   - 셀 병합·이미지·코멘트 v1에선 미반영
 */

import * as XLSX from 'xlsx';
import { colToIdx, idxToCol } from './formula';

type Cells = Record<string, string>;

export interface ImportedSheet {
  name: string;
  cells: Cells;
}

// ─────────────────────────────────────────────
// Import (.xlsx → 우리 형식)
// ─────────────────────────────────────────────

export async function importXlsxFile(file: File): Promise<ImportedSheet[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  return wb.SheetNames.map((name) => extractSheet(wb.Sheets[name], name));
}

function extractSheet(ws: XLSX.WorkSheet | undefined, name: string): ImportedSheet {
  const cells: Cells = {};
  if (!ws) return { name, cells };
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue; // !ref, !cols, !merges 등 메타
    const cell = ws[key] as XLSX.CellObject;
    if (cell.f) {
      // 수식: 엑셀 함수 → 우리 함수명 (간단 매핑)
      cells[key] = '=' + normalizeFormula(cell.f);
    } else if (cell.v !== undefined && cell.v !== null) {
      cells[key] = String(cell.v);
    }
  }
  return { name, cells };
}

function normalizeFormula(f: string): string {
  // 엑셀 AVERAGE → 우리 AVG (단축형 지원). 우리는 둘 다 받지만 일관성 위해 변환.
  // 다른 함수는 그대로 (SUM/MIN/MAX/COUNT/IF/ABS/ROUND 다 동일 이름)
  return f.replace(/\bAVERAGE\b/gi, 'AVG');
}

// ─────────────────────────────────────────────
// Export (우리 형식 → .xlsx 다운로드)
// ─────────────────────────────────────────────

export interface ExportSheetInput {
  name: string;
  cells: Cells;
}

export function exportXlsxFile(sheets: ExportSheetInput[], fileName: string): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = cellsToWorksheet(sheet.cells);
    // 엑셀 시트 이름 제한: 31자, 일부 문자 금지 (\\ / ? * [ ])
    const safeName = sheet.name.replace(/[\\/?*[\]]/g, '_').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  // 빈 workbook 방지
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['']]), 'Sheet1');
  }
  const safeFile = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, safeFile);
}

function cellsToWorksheet(cells: Cells): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  let maxRow = -1;
  let maxCol = -1;
  for (const [ref, raw] of Object.entries(cells)) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const col = colToIdx(match[1]);
    const row = Number(match[2]) - 1;
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;

    if (raw.startsWith('=')) {
      // 수식: 우리 AVG → 엑셀 AVERAGE
      const f = raw.slice(1).replace(/\bAVG\b/gi, 'AVERAGE');
      ws[ref] = { t: 'n', f };
    } else {
      const n = Number(raw);
      if (raw.trim() !== '' && Number.isFinite(n)) {
        ws[ref] = { t: 'n', v: n };
      } else if (raw === 'TRUE' || raw === 'FALSE') {
        ws[ref] = { t: 'b', v: raw === 'TRUE' };
      } else {
        ws[ref] = { t: 's', v: raw };
      }
    }
  }
  if (maxRow >= 0 && maxCol >= 0) {
    ws['!ref'] = `A1:${idxToCol(maxCol)}${maxRow + 1}`;
  } else {
    ws['!ref'] = 'A1:A1';
  }
  return ws;
}

/** TSV (Tab-Separated Values) 직렬화·파싱 — 엑셀/Sheets 클립보드 호환. */

import { cellRef } from './sheetUtils';
import type { Cells, SelBounds } from './cellTypes';

/** 범위 → TSV 문자열. 값 안 탭/줄바꿈/" 는 "" 로 감싸기 (엑셀 호환). */
export function rangeToTsv(cells: Cells, bounds: SelBounds): string {
  const lines: string[] = [];
  for (let r = bounds.minR; r <= bounds.maxR; r++) {
    const row: string[] = [];
    for (let c = bounds.minC; c <= bounds.maxC; c++) {
      const ref = cellRef(r, c);
      const raw = cells[ref] ?? '';
      // 수식은 raw 그대로 (붙여넣기 시 다시 수식으로 복원)
      const needQuote = raw.includes('\t') || raw.includes('\n') || raw.includes('"');
      row.push(needQuote ? `"${raw.replace(/"/g, '""')}"` : raw);
    }
    lines.push(row.join('\t'));
  }
  return lines.join('\n');
}

/** TSV 텍스트 → 2D 배열 (엑셀 호환: "" 로 감싼 셀 안 \t 보존) */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === '\t') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        row.push(cell); cell = '';
        rows.push(row); row = [];
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else { cell += ch; }
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

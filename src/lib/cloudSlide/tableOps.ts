import type { SlideTableEl } from './types';

export interface TableCellAddress {
  row: number;
  col: number;
}

export function updateSlideTableCellText(
  table: SlideTableEl,
  rowIdx: number,
  colIdx: number,
  text: string,
): SlideTableEl {
  const row = table.rows[rowIdx];
  const cell = row?.[colIdx];
  if (!row || !cell) return table;

  const normalizedText = text.replace(/\r\n?/g, '\n');
  if (cell.text === normalizedText) return table;

  const nextRows = table.rows.map((r, rIdx) => (
    rIdx === rowIdx
      ? r.map((c, cIdx) => (cIdx === colIdx ? { ...c, text: normalizedText } : c))
      : r
  ));
  return { ...table, rows: nextRows };
}

export function tableColumnCount(table: SlideTableEl): number {
  return Math.max(
    1,
    ...table.rows.map((row) => row.reduce((sum, cell) => sum + tableCellSpan(cell.colspan), 0)),
  );
}

export function tableCellSpan(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 1 ? Math.floor(value) : 1;
}

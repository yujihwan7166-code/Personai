import type { WBTable, WBTableCellStyle } from '@/types/whiteboard';

export const WB_TABLE_LIMITS = {
  minRows: 1,
  maxRows: 24,
  minCols: 1,
  maxCols: 12,
  minPadding: 4,
  maxPadding: 18,
} as const;

export function clampTableNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function createTableCells(rows: number, cols: number, headerRow = true): string[] {
  const safeRows = clampTableNumber(rows, WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const safeCols = clampTableNumber(cols, WB_TABLE_LIMITS.minCols, WB_TABLE_LIMITS.maxCols);
  return Array.from({ length: safeRows * safeCols }, (_, index) => {
    if (headerRow && index < safeCols) return `Header ${index + 1}`;
    return '';
  });
}

export function normalizeTableCells(table: WBTable): string[] {
  return Array.from({ length: table.rows * table.cols }, (_, index) => table.cells[index] ?? '');
}

export function normalizeTableCellStyles(table: WBTable): WBTableCellStyle[] {
  return Array.from({ length: table.rows * table.cols }, (_, index) => ({ ...(table.cellStyles?.[index] ?? {}) }));
}

export function resizeTableCells(table: WBTable, rows: number, cols: number): string[] {
  const safeRows = clampTableNumber(rows, WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const safeCols = clampTableNumber(cols, WB_TABLE_LIMITS.minCols, WB_TABLE_LIMITS.maxCols);
  return Array.from({ length: safeRows * safeCols }, (_, index) => {
    const r = Math.floor(index / safeCols);
    const c = index % safeCols;
    return table.cells[r * table.cols + c] ?? (r === 0 && table.headerRow ? `Header ${c + 1}` : '');
  });
}

export function resizeTableCellStyles(table: WBTable, rows: number, cols: number): WBTableCellStyle[] {
  const safeRows = clampTableNumber(rows, WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const safeCols = clampTableNumber(cols, WB_TABLE_LIMITS.minCols, WB_TABLE_LIMITS.maxCols);
  return Array.from({ length: safeRows * safeCols }, (_, index) => {
    const r = Math.floor(index / safeCols);
    const c = index % safeCols;
    return { ...(table.cellStyles?.[r * table.cols + c] ?? {}) };
  });
}

export function updateTableCellStyle(table: WBTable, index: number, patch: WBTableCellStyle): WBTableCellStyle[] {
  const styles = normalizeTableCellStyles(table);
  if (index < 0 || index >= styles.length) return styles;
  styles[index] = { ...styles[index], ...patch };
  return styles;
}

export function clearTableCellStyle(table: WBTable, index: number): WBTableCellStyle[] {
  const styles = normalizeTableCellStyles(table);
  if (index < 0 || index >= styles.length) return styles;
  styles[index] = {};
  return styles;
}

export function insertTableRow(table: WBTable, row: number): { rows: number; cells: string[]; cellStyles: WBTableCellStyle[] } {
  const nextRows = clampTableNumber(table.rows + 1, WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const insertAt = clampTableNumber(row, 0, table.rows);
  const cells = normalizeTableCells(table);
  const styles = normalizeTableCellStyles(table);
  const nextCells: string[] = [];
  const nextStyles: WBTableCellStyle[] = [];
  for (let r = 0; r < nextRows; r++) {
    const sourceRow = r < insertAt ? r : r - 1;
    for (let c = 0; c < table.cols; c++) {
      if (r === insertAt) {
        nextCells.push('');
        nextStyles.push({});
      } else {
        const sourceIndex = sourceRow * table.cols + c;
        nextCells.push(cells[sourceIndex] ?? '');
        nextStyles.push({ ...(styles[sourceIndex] ?? {}) });
      }
    }
  }
  return { rows: nextRows, cells: nextCells, cellStyles: nextStyles };
}

export function deleteTableRow(table: WBTable, row: number): { rows: number; cells: string[]; cellStyles: WBTableCellStyle[] } {
  const nextRows = clampTableNumber(table.rows - 1, WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const removeAt = clampTableNumber(row, 0, table.rows - 1);
  const cells = normalizeTableCells(table);
  const styles = normalizeTableCellStyles(table);
  const nextCells: string[] = [];
  const nextStyles: WBTableCellStyle[] = [];
  for (let r = 0; r < table.rows; r++) {
    if (r === removeAt && table.rows > 1) continue;
    for (let c = 0; c < table.cols; c++) {
      const index = r * table.cols + c;
      nextCells.push(cells[index] ?? '');
      nextStyles.push({ ...(styles[index] ?? {}) });
    }
  }
  return { rows: nextRows, cells: nextCells.slice(0, nextRows * table.cols), cellStyles: nextStyles.slice(0, nextRows * table.cols) };
}

export function insertTableCol(table: WBTable, col: number): { cols: number; cells: string[]; cellStyles: WBTableCellStyle[] } {
  const nextCols = clampTableNumber(table.cols + 1, WB_TABLE_LIMITS.minCols, WB_TABLE_LIMITS.maxCols);
  const insertAt = clampTableNumber(col, 0, table.cols);
  const cells = normalizeTableCells(table);
  const styles = normalizeTableCellStyles(table);
  const nextCells: string[] = [];
  const nextStyles: WBTableCellStyle[] = [];
  for (let r = 0; r < table.rows; r++) {
    for (let c = 0; c < nextCols; c++) {
      if (c === insertAt) {
        nextCells.push(r === 0 && table.headerRow ? `Header ${c + 1}` : '');
        nextStyles.push({});
      } else {
        const sourceCol = c < insertAt ? c : c - 1;
        const sourceIndex = r * table.cols + sourceCol;
        nextCells.push(cells[sourceIndex] ?? '');
        nextStyles.push({ ...(styles[sourceIndex] ?? {}) });
      }
    }
  }
  return { cols: nextCols, cells: nextCells, cellStyles: nextStyles };
}

export function deleteTableCol(table: WBTable, col: number): { cols: number; cells: string[]; cellStyles: WBTableCellStyle[] } {
  const nextCols = clampTableNumber(table.cols - 1, WB_TABLE_LIMITS.minCols, WB_TABLE_LIMITS.maxCols);
  const removeAt = clampTableNumber(col, 0, table.cols - 1);
  const cells = normalizeTableCells(table);
  const styles = normalizeTableCellStyles(table);
  const nextCells: string[] = [];
  const nextStyles: WBTableCellStyle[] = [];
  for (let r = 0; r < table.rows; r++) {
    for (let c = 0; c < table.cols; c++) {
      if (c === removeAt && table.cols > 1) continue;
      const index = r * table.cols + c;
      nextCells.push(cells[index] ?? '');
      nextStyles.push({ ...(styles[index] ?? {}) });
    }
  }
  return { cols: nextCols, cells: nextCells.slice(0, table.rows * nextCols), cellStyles: nextStyles.slice(0, table.rows * nextCols) };
}

export function tableToText(table: WBTable): string {
  return Array.from({ length: table.rows }, (_, r) =>
    Array.from({ length: table.cols }, (_, c) => table.cells[r * table.cols + c] ?? '').join('\t'),
  ).join('\n');
}

export function parseTableText(value: string, rows?: number, cols?: number): { rows: number; cols: number; cells: string[] } {
  const lines = normalizeClipboardRows(value);
  const parsedRows = lines.map((line) => line.split('\t'));
  const nextRows = clampTableNumber(rows ?? Math.max(1, parsedRows.length), WB_TABLE_LIMITS.minRows, WB_TABLE_LIMITS.maxRows);
  const nextCols = clampTableNumber(
    cols ?? Math.max(1, ...parsedRows.map((line) => line.length)),
    WB_TABLE_LIMITS.minCols,
    WB_TABLE_LIMITS.maxCols,
  );
  const cells = Array.from({ length: nextRows * nextCols }, (_, index) => {
    const r = Math.floor(index / nextCols);
    const c = index % nextCols;
    return parsedRows[r]?.[c] ?? '';
  });
  return { rows: nextRows, cols: nextCols, cells };
}

function normalizeClipboardRows(value: string): string[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.length === 0 ? [''] : lines;
}

export function pasteTableTextAt(
  table: WBTable,
  startIndex: number,
  value: string,
): { rows: number; cols: number; cells: string[]; cellStyles: WBTableCellStyle[] } {
  const startRow = clampTableNumber(Math.floor(startIndex / table.cols), 0, table.rows - 1);
  const startCol = clampTableNumber(startIndex % table.cols, 0, table.cols - 1);
  const matrix = normalizeClipboardRows(value).map((line) => line.split('\t'));
  const pasteRows = Math.max(1, matrix.length);
  const pasteCols = Math.max(1, ...matrix.map((row) => row.length));
  const nextRows = clampTableNumber(
    Math.max(table.rows, startRow + pasteRows),
    WB_TABLE_LIMITS.minRows,
    WB_TABLE_LIMITS.maxRows,
  );
  const nextCols = clampTableNumber(
    Math.max(table.cols, startCol + pasteCols),
    WB_TABLE_LIMITS.minCols,
    WB_TABLE_LIMITS.maxCols,
  );
  const cells = resizeTableCells(table, nextRows, nextCols);
  const cellStyles = resizeTableCellStyles(table, nextRows, nextCols);

  for (let r = 0; r < pasteRows; r++) {
    for (let c = 0; c < pasteCols; c++) {
      const targetRow = startRow + r;
      const targetCol = startCol + c;
      if (targetRow >= nextRows || targetCol >= nextCols) continue;
      cells[targetRow * nextCols + targetCol] = matrix[r]?.[c] ?? '';
    }
  }

  return { rows: nextRows, cols: nextCols, cells, cellStyles };
}

export function updateTableCell(table: WBTable, index: number, value: string): string[] {
  const cells = normalizeTableCells(table);
  if (index < 0 || index >= cells.length) return cells;
  cells[index] = value;
  return cells;
}

export function getTableCellIndex(table: WBTable, row: number, col: number): number | null {
  const safeRow = clampTableNumber(row, 0, table.rows - 1);
  const safeCol = clampTableNumber(col, 0, table.cols - 1);
  if (safeRow < 0 || safeRow >= table.rows || safeCol < 0 || safeCol >= table.cols) return null;
  return safeRow * table.cols + safeCol;
}

export function moveTableCellIndex(
  table: WBTable,
  index: number,
  rowDelta: number,
  colDelta: number,
  wrap = false,
): number | null {
  if (index < 0 || index >= table.rows * table.cols) return null;
  const row = Math.floor(index / table.cols);
  const col = index % table.cols;
  if (wrap && rowDelta === 0 && Math.abs(colDelta) === 1) {
    const total = table.rows * table.cols;
    const next = (index + colDelta + total) % total;
    return next;
  }
  return getTableCellIndex(table, row + rowDelta, col + colDelta);
}

export function getTableCellRect(table: WBTable, index: number): { x: number; y: number; w: number; h: number; row: number; col: number } | null {
  if (index < 0 || index >= table.rows * table.cols) return null;
  const row = Math.floor(index / table.cols);
  const col = index % table.cols;
  const cellW = table.w / Math.max(1, table.cols);
  const cellH = table.h / Math.max(1, table.rows);
  return {
    x: table.x + col * cellW,
    y: table.y + row * cellH,
    w: cellW,
    h: cellH,
    row,
    col,
  };
}

export function hitTableCell(table: WBTable, point: { x: number; y: number }): number | null {
  if (point.x < table.x || point.x > table.x + table.w || point.y < table.y || point.y > table.y + table.h) return null;
  const col = clampTableNumber(Math.floor((point.x - table.x) / (table.w / table.cols)), 0, table.cols - 1);
  const row = clampTableNumber(Math.floor((point.y - table.y) / (table.h / table.rows)), 0, table.rows - 1);
  return row * table.cols + col;
}

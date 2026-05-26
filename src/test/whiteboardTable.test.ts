import { describe, expect, it } from 'vitest';
import type { WBTable } from '@/types/whiteboard';
import {
  clearTableCellStyle,
  createTableCells,
  deleteTableCol,
  deleteTableRow,
  getTableCellRect,
  getTableCellIndex,
  hitTableCell,
  insertTableCol,
  insertTableRow,
  moveTableCellIndex,
  parseTableText,
  pasteTableTextAt,
  resizeTableCells,
  resizeTableCellStyles,
  tableToText,
  updateTableCell,
  updateTableCellStyle,
} from '@/lib/whiteboard/table';

const baseTable = (overrides: Partial<WBTable> = {}): WBTable => ({
  id: 'table_1',
  type: 'table',
  x: 10,
  y: 20,
  w: 300,
  h: 120,
  angle: 0,
  zIndex: 1,
  opacity: 1,
  locked: false,
  groupIds: [],
  createdAt: 1,
  updatedAt: 1,
  rows: 2,
  cols: 3,
  cells: ['A', 'B', 'C', 'D', 'E', 'F'],
  headerRow: true,
  borderColor: 'slate',
  headerFill: 'green',
  textColor: 'ink',
  fontSize: 14,
  ...overrides,
});

describe('whiteboard table utilities', () => {
  it('creates header cells for new tables', () => {
    expect(createTableCells(2, 3, true)).toEqual(['Header 1', 'Header 2', 'Header 3', '', '', '']);
  });

  it('preserves cells when resizing the table grid', () => {
    const table = baseTable();
    expect(resizeTableCells(table, 3, 2)).toEqual(['A', 'B', 'D', 'E', '', '']);
  });

  it('preserves cell styles when resizing the table grid', () => {
    const table = baseTable({ cellStyles: [{}, { fillColor: 'amber', bold: true }, {}, {}, { textAlign: 'right' }, {}] });
    expect(resizeTableCellStyles(table, 3, 2)).toMatchObject([
      {},
      { fillColor: 'amber', bold: true },
      {},
      { textAlign: 'right' },
      {},
      {},
    ]);
  });

  it('round-trips tab-separated table text', () => {
    const table = baseTable();
    const text = tableToText(table);
    expect(text).toBe('A\tB\tC\nD\tE\tF');
    expect(parseTableText(text)).toEqual({ rows: 2, cols: 3, cells: table.cells });
  });

  it('updates a single cell without mutating the source table', () => {
    const table = baseTable();
    const next = updateTableCell(table, 4, 'Edited');
    expect(next[4]).toBe('Edited');
    expect(table.cells[4]).toBe('E');
  });

  it('updates and clears a single cell style without mutating the source table', () => {
    const table = baseTable();
    const styled = updateTableCellStyle(table, 4, { fillColor: 'blue', italic: true });
    expect(styled[4]).toEqual({ fillColor: 'blue', italic: true });
    expect(table.cellStyles).toBeUndefined();
    expect(clearTableCellStyle({ ...table, cellStyles: styled }, 4)[4]).toEqual({});
  });

  it('inserts and deletes rows and columns with matching styles', () => {
    const table = baseTable({ cellStyles: [{}, { fillColor: 'amber' }, {}, {}, { bold: true }, {}] });
    const rowAdded = insertTableRow(table, 1);
    expect(rowAdded.rows).toBe(3);
    expect(rowAdded.cells).toEqual(['A', 'B', 'C', '', '', '', 'D', 'E', 'F']);
    expect(rowAdded.cellStyles[1]).toEqual({ fillColor: 'amber' });
    expect(rowAdded.cellStyles[7]).toEqual({ bold: true });

    const colAdded = insertTableCol(table, 1);
    expect(colAdded.cols).toBe(4);
    expect(colAdded.cells).toEqual(['A', 'Header 2', 'B', 'C', 'D', '', 'E', 'F']);

    expect(deleteTableRow(table, 0).cells).toEqual(['D', 'E', 'F']);
    expect(deleteTableCol(table, 1).cells).toEqual(['A', 'C', 'D', 'F']);
  });

  it('pastes tabular text from the selected cell while preserving surrounding data', () => {
    const table = baseTable({
      cellStyles: [{}, {}, {}, {}, { bold: true }, {}],
    });

    const pasted = pasteTableTextAt(table, 4, 'X\tY\nZ\tW');

    expect(pasted.rows).toBe(3);
    expect(pasted.cols).toBe(3);
    expect(pasted.cells).toEqual(['A', 'B', 'C', 'D', 'X', 'Y', '', 'Z', 'W']);
    expect(pasted.cellStyles[4]).toEqual({ bold: true });
  });

  it('maps points and indices to table cells', () => {
    const table = baseTable();
    expect(hitTableCell(table, { x: 120, y: 90 })).toBe(4);
    expect(getTableCellRect(table, 4)).toMatchObject({ x: 110, y: 80, w: 100, h: 60, row: 1, col: 1 });
  });

  it('moves selected cells with clamped arrows and wrapped tab order', () => {
    const table = baseTable();

    expect(getTableCellIndex(table, 9, 9)).toBe(5);
    expect(moveTableCellIndex(table, 1, 0, 1)).toBe(2);
    expect(moveTableCellIndex(table, 2, 0, 1)).toBe(2);
    expect(moveTableCellIndex(table, 2, 0, 1, true)).toBe(3);
    expect(moveTableCellIndex(table, 0, 0, -1, true)).toBe(5);
    expect(moveTableCellIndex(table, 4, -1, 0)).toBe(1);
  });
});

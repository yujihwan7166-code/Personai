import { describe, expect, it } from 'vitest';
import {
  tableCellSpan,
  tableColumnCount,
  updateSlideTableCellText,
} from '@/lib/cloudSlide/tableOps';
import type { SlideTableEl } from '@/lib/cloudSlide/types';

const table: SlideTableEl = {
  id: 'tbl1',
  type: 'table',
  xPct: 0,
  yPct: 0,
  wPct: 50,
  hPct: 30,
  rows: [
    [{ text: 'Owner', rowspan: 2 }, { text: 'Header', colspan: 2 }],
    [{ text: 'Done' }, { text: 'Next' }],
  ],
};

describe('cloudSlide table ops', () => {
  it('updates one cell without dropping merge metadata', () => {
    const next = updateSlideTableCellText(table, 0, 1, 'Merged header');

    expect(next).not.toBe(table);
    expect(next.rows[0][1]).toMatchObject({ text: 'Merged header', colspan: 2 });
    expect(next.rows[0][0]).toMatchObject({ text: 'Owner', rowspan: 2 });
    expect(next.rows[1][0]).toBe(table.rows[1][0]);
  });

  it('normalizes CRLF cell input to LF', () => {
    const next = updateSlideTableCellText(table, 1, 0, 'A\r\nB');

    expect(next.rows[1][0].text).toBe('A\nB');
  });

  it('keeps the same table when the target cell is missing', () => {
    expect(updateSlideTableCellText(table, 9, 9, 'Nope')).toBe(table);
  });

  it('counts columns with colspans', () => {
    expect(tableColumnCount(table)).toBe(3);
    expect(tableCellSpan(2.9)).toBe(2);
    expect(tableCellSpan(undefined)).toBe(1);
  });
});

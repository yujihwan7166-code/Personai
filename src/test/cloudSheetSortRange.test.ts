import { describe, expect, it } from 'vitest';
import { sortSheetRange } from '@/lib/cloudSheet/sortRange';

describe('sortSheetRange', () => {
  it('sorts by display values and moves row formats and comments with cells', () => {
    const result = sortSheetRange({
      cells: {
        A1: 'Name', B1: 'Score',
        A2: 'Lin', B2: '=A10',
        A3: 'Ada', B3: '=A20',
        A4: 'Max', B4: '=A30',
      },
      formats: {
        A2: { bold: true },
        A3: { italic: true },
        A4: { underline: true },
      },
      comments: {
        A2: 'Lin note',
        A3: 'Ada note',
        A4: 'Max note',
      },
      displayValues: {
        B2: '20',
        B3: '10',
        B4: '30',
      },
      range: { minR: 0, maxR: 3, minC: 0, maxC: 1 },
      keyCol: 1,
      startRow: 1,
      dir: 'asc',
    });

    expect(result.sortedRows).toBe(3);
    expect(result.cells).toMatchObject({
      A2: 'Ada', B2: '=A20',
      A3: 'Lin', B3: '=A10',
      A4: 'Max', B4: '=A30',
    });
    expect(result.formats.A2).toEqual({ italic: true });
    expect(result.formats.A3).toEqual({ bold: true });
    expect(result.comments?.A2).toBe('Ada note');
    expect(result.comments?.A3).toBe('Lin note');
  });

  it('keeps equal sort keys stable', () => {
    const result = sortSheetRange({
      cells: { A1: 'B', B1: '1', A2: 'A', B2: '1', A3: 'C', B3: '2' },
      formats: {},
      range: { minR: 0, maxR: 2, minC: 0, maxC: 1 },
      keyCol: 1,
      startRow: 0,
      dir: 'asc',
    });

    expect([result.cells.A1, result.cells.A2, result.cells.A3]).toEqual(['B', 'A', 'C']);
  });
});

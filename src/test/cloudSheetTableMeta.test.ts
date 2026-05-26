import { describe, expect, it } from 'vitest';
import { buildSheetTableFromRange } from '@/lib/cloudSheet/tableMeta';

describe('cloud sheet table metadata', () => {
  it('builds Excel-compatible table metadata from a selected range', () => {
    const result = buildSheetTableFromRange(
      {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
        B2: '10',
      },
      { minR: 0, maxR: 1, minC: 0, maxC: 1 },
      [],
      'Table1',
    );

    expect(result?.table).toMatchObject({
      name: 'Table1',
      displayName: 'Table1',
      ref: 'A1:B2',
      headerRow: true,
      totalsRow: false,
      columns: [
        { name: 'Name', filterButton: true },
        { name: 'Score', filterButton: true },
      ],
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
    });
    expect(result?.patchedCells).toEqual({});
  });

  it('repairs empty or formula header cells and makes names unique', () => {
    const result = buildSheetTableFromRange(
      {
        A1: '',
        B1: '=A2',
        C1: 'Column1',
        A2: '1',
        B2: '2',
        C2: '3',
      },
      { minR: 0, maxR: 1, minC: 0, maxC: 2 },
      [{ name: 'Table1', ref: 'E1:F2' }],
      'Table1',
    );

    expect(result?.table.name).toBe('Table12');
    expect(result?.table.columns?.map((col) => col.name)).toEqual(['Column1', 'Column2', 'Column1_2']);
    expect(result?.patchedCells).toEqual({
      A1: 'Column1',
      B1: 'Column2',
    });
  });

  it('rejects one-row selections because Excel tables need a header and data row', () => {
    expect(buildSheetTableFromRange(
      { A1: 'Only header' },
      { minR: 0, maxR: 0, minC: 0, maxC: 0 },
      [],
    )).toBeUndefined();
  });
});

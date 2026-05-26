import { compareCellValues } from './cellCompare';
import { cellRef } from './sheetUtils';

export interface SortRangeBounds {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

export interface SortSheetRangeInput<TFormat = unknown> {
  cells: Record<string, string>;
  formats: Record<string, TFormat | undefined>;
  comments?: Record<string, string | undefined>;
  displayValues?: Record<string, string | undefined>;
  range: SortRangeBounds;
  keyCol: number;
  startRow: number;
  dir: 'asc' | 'desc';
}

export interface SortSheetRangeResult<TFormat = unknown> {
  cells: Record<string, string>;
  formats: Record<string, TFormat | undefined>;
  comments?: Record<string, string | undefined>;
  sortedRows: number;
}

export function sortSheetRange<TFormat = unknown>({
  cells,
  formats,
  comments,
  displayValues,
  range,
  keyCol,
  startRow,
  dir,
}: SortSheetRangeInput<TFormat>): SortSheetRangeResult<TFormat> {
  const rows: Array<{
    values: string[];
    formats: Array<TFormat | undefined>;
    comments: Array<string | undefined>;
    sortValue: string;
    originalIndex: number;
  }> = [];

  for (let r = startRow; r <= range.maxR; r++) {
    const values: string[] = [];
    const rowFormats: Array<TFormat | undefined> = [];
    const rowComments: Array<string | undefined> = [];
    for (let c = range.minC; c <= range.maxC; c++) {
      const ref = cellRef(r, c);
      values.push(cells[ref] ?? '');
      rowFormats.push(formats[ref]);
      rowComments.push(comments?.[ref]);
    }
    const keyRef = cellRef(r, keyCol);
    rows.push({
      values,
      formats: rowFormats,
      comments: rowComments,
      sortValue: displayValues?.[keyRef] ?? cells[keyRef] ?? '',
      originalIndex: rows.length,
    });
  }

  rows.sort((a, b) => {
    const cmp = compareCellValues(a.sortValue, b.sortValue, dir);
    return cmp === 0 ? a.originalIndex - b.originalIndex : cmp;
  });

  const nextCells: Record<string, string> = { ...cells };
  const nextFormats: Record<string, TFormat | undefined> = { ...formats };
  const nextComments: Record<string, string | undefined> | undefined = comments ? { ...comments } : undefined;

  let i = 0;
  for (let r = startRow; r <= range.maxR; r++) {
    const row = rows[i++];
    for (let c = range.minC; c <= range.maxC; c++) {
      const ref = cellRef(r, c);
      const offset = c - range.minC;
      const value = row.values[offset];
      const format = row.formats[offset];
      const comment = row.comments[offset];
      if (value === '') delete nextCells[ref];
      else nextCells[ref] = value;
      if (!format) delete nextFormats[ref];
      else nextFormats[ref] = format;
      if (nextComments) {
        if (!comment) delete nextComments[ref];
        else nextComments[ref] = comment;
      }
    }
  }

  return {
    cells: nextCells,
    formats: nextFormats,
    ...(nextComments ? { comments: nextComments } : {}),
    sortedRows: rows.length,
  };
}

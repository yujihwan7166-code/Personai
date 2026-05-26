import { colToIdx, idxToCol } from './formula';

export type ShiftAxis = 'row' | 'col';

export interface A1RangeReference {
  sheetName?: string;
  sheetPrefix?: string;
  startCol: string;
  startRow: number;
  endCol: string;
  endRow: number;
  startColAbs: boolean;
  startRowAbs: boolean;
  endColAbs: boolean;
  endRowAbs: boolean;
}

function parseSheetName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

export function parseA1RangeReference(raw: string | undefined): A1RangeReference | undefined {
  const source = raw?.trim();
  if (!source) return undefined;
  const sheet = String.raw`(?:('(?:[^']|'')+'|[^!:]+)!)?`;
  const cell = String.raw`(\$?)([A-Z]+)(\$?)(\d+)`;
  const re = new RegExp(`^${sheet}${cell}(?::${sheet}${cell})?$`, 'i');
  const match = source.match(re);
  if (!match) return undefined;

  const firstSheetPrefix = match[1];
  const secondSheetPrefix = match[6];
  const firstSheet = parseSheetName(firstSheetPrefix);
  const secondSheet = parseSheetName(secondSheetPrefix);
  if (firstSheet && secondSheet && firstSheet !== secondSheet) return undefined;

  const startRow = Number(match[5]);
  const endRow = Number(match[10] ?? match[5]);
  if (!Number.isInteger(startRow) || !Number.isInteger(endRow) || startRow < 1 || endRow < 1) {
    return undefined;
  }

  return {
    sheetName: firstSheet ?? secondSheet,
    sheetPrefix: firstSheetPrefix ?? secondSheetPrefix,
    startColAbs: match[2] === '$',
    startCol: match[3].toUpperCase(),
    startRowAbs: match[4] === '$',
    startRow,
    endColAbs: (match[7] ?? match[2]) === '$',
    endCol: (match[8] ?? match[3]).toUpperCase(),
    endRowAbs: (match[9] ?? match[4]) === '$',
    endRow,
  };
}

function shiftIndexRange(min: number, max: number, at: number, delta: number): [number, number] | undefined {
  let nextMin = min;
  let nextMax = max;
  if (delta > 0) {
    if (at <= min) {
      nextMin += delta;
      nextMax += delta;
    } else if (at <= max) {
      nextMax += delta;
    }
  } else if (delta < 0) {
    if (at < min) {
      nextMin += delta;
      nextMax += delta;
    } else if (at <= max) {
      if (min === max) return undefined;
      nextMax += delta;
    }
  }
  if (nextMin < 0 || nextMax < nextMin) return undefined;
  return [nextMin, nextMax];
}

function formatCell(col: string, row: number, colAbs: boolean, rowAbs: boolean): string {
  return `${colAbs ? '$' : ''}${col}${rowAbs ? '$' : ''}${row + 1}`;
}

export function shiftA1RangeReference(
  raw: string | undefined,
  axis: ShiftAxis,
  at: number,
  delta: number,
  currentSheetName?: string,
): string | undefined {
  const parsed = parseA1RangeReference(raw);
  if (!parsed) return raw;
  if (parsed.sheetName && currentSheetName && parsed.sheetName !== currentSheetName) return raw;

  let startCol = colToIdx(parsed.startCol);
  let endCol = colToIdx(parsed.endCol);
  let startRow = parsed.startRow - 1;
  let endRow = parsed.endRow - 1;

  if (axis === 'row') {
    const shifted = shiftIndexRange(startRow, endRow, at, delta);
    if (!shifted) return undefined;
    [startRow, endRow] = shifted;
  } else {
    const shifted = shiftIndexRange(startCol, endCol, at, delta);
    if (!shifted) return undefined;
    [startCol, endCol] = shifted;
  }

  const prefix = parsed.sheetPrefix ? `${parsed.sheetPrefix}!` : '';
  const start = formatCell(idxToCol(startCol), startRow, parsed.startColAbs, parsed.startRowAbs);
  const end = formatCell(idxToCol(endCol), endRow, parsed.endColAbs, parsed.endRowAbs);
  return `${prefix}${start === end ? start : `${start}:${end}`}`;
}

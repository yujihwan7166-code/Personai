import type { SheetTable } from './xlsx';
import { colToIdx, idxToCol } from './formula';
import type { SelRange } from './chart';

type Cells = Record<string, string>;

export interface BuildSheetTableResult {
  table: SheetTable;
  patchedCells: Cells;
}

function cellRef(row: number, col: number): string {
  return `${idxToCol(col)}${row + 1}`;
}

function normalizeRange(range: SelRange): SelRange {
  return {
    minR: Math.min(range.minR, range.maxR),
    maxR: Math.max(range.minR, range.maxR),
    minC: Math.min(range.minC, range.maxC),
    maxC: Math.max(range.minC, range.maxC),
  };
}

function sanitizeName(name: string): string {
  let out = name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '');
  if (!out) out = 'Table';
  if (isValidCellReference(out)) out = `${out}_Table`;
  return out.slice(0, 240);
}

function isValidCellReference(name: string): boolean {
  const match = name.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return false;
  const col = colToIdx(match[1]);
  const row = Number(match[2]);
  return col >= 0 && col < 16_384 && Number.isInteger(row) && row >= 1 && row <= 1_048_576;
}

function uniqueTableName(baseName: string, existingTables: SheetTable[]): string {
  const used = new Set(existingTables.map((table) => table.name.toLowerCase()));
  const base = sanitizeName(baseName);
  let candidate = base;
  let n = 1;
  while (used.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

function uniqueColumnName(raw: string, index: number, used: Set<string>): string {
  const base = raw.trim() || `Column${index + 1}`;
  let candidate = base;
  let n = 1;
  while (used.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function buildSheetTableFromRange(
  cells: Cells,
  range: SelRange,
  existingTables: SheetTable[],
  nameBase = 'Table',
): BuildSheetTableResult | undefined {
  const r = normalizeRange(range);
  const rowCount = r.maxR - r.minR + 1;
  const colCount = r.maxC - r.minC + 1;
  if (rowCount < 2 || colCount < 1) return undefined;

  const ref = `${cellRef(r.minR, r.minC)}:${cellRef(r.maxR, r.maxC)}`;
  const name = uniqueTableName(nameBase, existingTables);
  const patchedCells: Cells = {};
  const usedColumnNames = new Set<string>();
  const columns = Array.from({ length: colCount }, (_, idx) => {
    const ref = cellRef(r.minR, r.minC + idx);
    const raw = cells[ref] ?? '';
    const name = uniqueColumnName(raw.startsWith('=') ? '' : raw, idx, usedColumnNames);
    if (raw.trim() === '' || raw.startsWith('=')) patchedCells[ref] = name;
    return { name, filterButton: true };
  });

  return {
    table: {
      name,
      displayName: name,
      ref,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns,
    },
    patchedCells,
  };
}

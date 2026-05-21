import { describe, expect, it } from 'vitest';
import { parseTsv, rangeToTsv } from '@/lib/cloudSheet/tsv';

describe('cloud sheet TSV clipboard compatibility', () => {
  it('round-trips tabs, newlines, and quotes in copied cells', () => {
    const tsv = rangeToTsv(
      {
        A1: 'plain',
        B1: 'has\ttab',
        A2: 'line1\nline2',
        B2: 'He said "hi"',
      },
      { minR: 0, maxR: 1, minC: 0, maxC: 1 },
    );

    expect(parseTsv(tsv)).toEqual([
      ['plain', 'has\ttab'],
      ['line1\nline2', 'He said "hi"'],
    ]);
  });

  it('keeps literal quotes in unquoted Excel/Sheets clipboard text', () => {
    expect(parseTsv('SKU"42\tplain')).toEqual([['SKU"42', 'plain']]);
  });

  it('handles BOM and empty quoted cells from external TSV sources', () => {
    expect(parseTsv('\uFEFF""\tvalue\r\nnext\t""')).toEqual([
      ['', 'value'],
      ['next', ''],
    ]);
  });
});

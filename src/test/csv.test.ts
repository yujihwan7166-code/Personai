import { describe, it, expect } from 'vitest';
import { parseCsvLine, parseCsv, escapeCsvCell, toCsv } from '@/lib/csv';
import { cellsToCsv } from '@/lib/cloudSheet/ai';
import { IMAGE_SENTINEL } from '@/lib/cloudSheet/formula';

describe('parseCsvLine', () => {
  it('단순 콤마 분리', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('따옴표 셀 — 안에 콤마/줄바꿈', () => {
    expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });
  it('이스케이프 따옴표 ""', () => {
    expect(parseCsvLine('"He said ""hi""",ok')).toEqual(['He said "hi"', 'ok']);
  });
  it('탭 구분자', () => {
    expect(parseCsvLine('a\tb', '\t')).toEqual(['a', 'b']);
  });
});

describe('parseCsv', () => {
  it('여러 행 + 빈 행 제거', () => {
    const out = parseCsv('a,b\n\nc,d\n');
    expect(out).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('UTF-8 BOM and quoted multi-line cells', () => {
    const out = parseCsv('\uFEFFid,note\n001,"line1\nline2"\n002,"He said ""hi"""');
    expect(out).toEqual([
      ['id', 'note'],
      ['001', 'line1\nline2'],
      ['002', 'He said "hi"'],
    ]);
  });
});

describe('escapeCsvCell', () => {
  it('일반 셀 그대로', () => {
    expect(escapeCsvCell('hello')).toBe('hello');
  });
  it('콤마/따옴표/줄바꿈 → 감싸기', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('hi "you"')).toBe('"hi ""you"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('round-trip', () => {
    const grid = [['a', 'b,b', 'c'], ['1', '2', '3']];
    const csv = toCsv(grid);
    expect(parseCsv(csv)).toEqual(grid);
  });
});

describe('cellsToCsv spreadsheet-safe export', () => {
  it('keeps the default AI/context export unchanged', () => {
    const csv = cellsToCsv({ A1: '00123', B1: '=SUM(1,2)', C1: 'normal' });

    expect(csv).toBe('00123,"=SUM(1,2)",normal');
  });

  it('protects formula-like values and text identifiers for Excel/Sheets downloads', () => {
    const csv = cellsToCsv(
      {
        A1: '00123',
        B1: '1234567890123456',
        C1: '=SUM(1,2)',
        D1: '+cmd',
        E1: '-10',
        F1: 'normal',
      },
      { safeForSpreadsheet: true },
    );

    expect(csv).toBe("'00123,'1234567890123456,\"'=SUM(1,2)\",'+cmd,-10,normal");
  });

  it('applies spreadsheet safety after display value selection and IMAGE unwrapping', () => {
    const csv = cellsToCsv(
      { A1: '=RAW()', B1: `${IMAGE_SENTINEL}https://example.test/image.png` },
      { displayValues: { A1: '00045' }, safeForSpreadsheet: true },
    );

    expect(csv).toBe("'00045,https://example.test/image.png");
  });
});

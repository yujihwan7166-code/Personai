import { describe, expect, it } from 'vitest';
import { evalCell } from '@/lib/cloudSheet/formula';

const evaluate = (formula: string, ctx: Record<string, string> = {}): string =>
  evalCell('Z99', { ...ctx, Z99: '=' + formula });

describe('cloud sheet formula Excel comparison compatibility', () => {
  it('supports single equals and not-equals operators used by Excel and Google Sheets', () => {
    expect(evaluate('IF(A1=10, "yes", "no")', { A1: '10' })).toBe('yes');
    expect(evaluate('IF(A1<>10, "yes", "no")', { A1: '12' })).toBe('yes');
    expect(evaluate('IF(A1<>10, "yes", "no")', { A1: '10' })).toBe('no');
  });

  it('does not rewrite comparison-looking text inside string literals', () => {
    expect(evaluate('IF("a=b"="a=b", "same", "diff")')).toBe('same');
    expect(evaluate('COUNTIF(A1:A2, "<>x")', { A1: 'x', A2: 'y' })).toBe('1');
  });
});

describe('cloud sheet formula Excel text concatenation compatibility', () => {
  it('supports ampersand concatenation used by Excel and Google Sheets', () => {
    expect(evaluate('"Hello"&" "&"World"')).toBe('Hello World');
    expect(evaluate('A1&"-"&B1', { A1: 'INV', B1: 'A001' })).toBe('INV-A001');
    expect(evaluate('"Total: "&SUM(A1:A2)', { A1: '2', A2: '3' })).toBe('Total: 5');
  });

  it('does not rewrite ampersands inside string literals', () => {
    expect(evaluate('"R&D"&" team"')).toBe('R&D team');
  });
});

describe('cloud sheet formula Excel percent literal compatibility', () => {
  it('treats postfix percent as a spreadsheet percentage literal', () => {
    expect(evaluate('50%')).toBe('0.5');
    expect(evaluate('A1*10%', { A1: '200' })).toBe('20');
    expect(evaluate('1+25%')).toBe('1.25');
  });

  it('does not rewrite percent signs inside string literals', () => {
    expect(evaluate('"50%"&" done"')).toBe('50% done');
  });
});

describe('cloud sheet formula quoted sheet name compatibility', () => {
  it('resolves quoted sheet names with escaped apostrophes', () => {
    const allSheets = {
      Summary: {
        A1: "='Bob''s Data'!A1+1",
        A2: "=SUM('Bob''s Data'!A1:'Bob''s Data'!A2)",
      },
      "Bob's Data": {
        A1: '41',
        A2: '1',
      },
    };

    expect(evalCell('A1', allSheets.Summary, { currentName: 'Summary', allSheets })).toBe('42');
    expect(evalCell('A2', allSheets.Summary, { currentName: 'Summary', allSheets })).toBe('42');
  });
});

describe('cloud sheet formula conditional aggregation compatibility', () => {
  it('matches COUNTIF/SUMIF criteria with Excel-style case-insensitive wildcards', () => {
    const ctx = {
      A1: 'Apple', B1: '10',
      A2: 'apricot', B2: '20',
      A3: 'Banana', B3: '30',
      A4: 'A*literal', B4: '40',
    };
    expect(evaluate('COUNTIF(A1:A4, "ap*")', ctx)).toBe('2');
    expect(evaluate('COUNTIF(A1:A4, "<>ap*")', ctx)).toBe('2');
    expect(evaluate('COUNTIF(A1:A4, "A~*literal")', ctx)).toBe('1');
    expect(evaluate('SUMIF(A1:A4, "=AP*", B1:B4)', ctx)).toBe('30');
  });

  it('applies Excel-style wildcard criteria across COUNTIFS and AVERAGEIFS', () => {
    const ctx = {
      A1: 'West', B1: 'Open', C1: '10',
      A2: 'west', B2: 'Closed', C2: '20',
      A3: 'East', B3: 'Open', C3: '30',
      A4: 'West', B4: 'Open', C4: '50',
    };
    expect(evaluate('COUNTIFS(A1:A4, "WEST", B1:B4, "O*")', ctx)).toBe('2');
    expect(evaluate('AVERAGEIFS(C1:C4, A1:A4, "w*", B1:B4, "<>Closed")', ctx)).toBe('30');
  });

  it('matches blank and nonblank criteria without treating zero as blank', () => {
    const ctx = {
      A1: '', B1: '10',
      A2: '0', B2: '20',
      A3: 'Text', B3: '30',
      A4: '', B4: '40',
    };
    expect(evaluate('COUNTIF(A1:A4, "=")', ctx)).toBe('2');
    expect(evaluate('COUNTIF(A1:A4, "<>")', ctx)).toBe('2');
    expect(evaluate('SUMIF(A1:A4, "<>", B1:B4)', ctx)).toBe('50');
    expect(evaluate('COUNTIFS(A1:A4, "<>", B1:B4, ">=20")', ctx)).toBe('2');
  });

  it('supports AVERAGEIF with same-range and separate average-range forms', () => {
    expect(evaluate('AVERAGEIF(A1:A4, ">=20")', {
      A1: '10', A2: '20', A3: '30', A4: 'text',
    })).toBe('25');
    expect(evaluate('AVERAGEIF(A1:A4, "West", B1:B4)', {
      A1: 'West', B1: '10',
      A2: 'East', B2: '20',
      A3: 'West', B3: '30',
      A4: 'North', B4: '40',
    })).toBe('20');
  });

  it('supports AVERAGEIFS, MINIFS, and MAXIFS for imported Excel summaries', () => {
    const ctx = {
      A1: 'West', B1: 'Open', C1: '10',
      A2: 'West', B2: 'Closed', C2: '20',
      A3: 'East', B3: 'Open', C3: '30',
      A4: 'West', B4: 'Open', C4: '50',
    };
    expect(evaluate('AVERAGEIFS(C1:C4, A1:A4, "West", B1:B4, "Open")', ctx)).toBe('30');
    expect(evaluate('MINIFS(C1:C4, A1:A4, "West", B1:B4, "Open")', ctx)).toBe('10');
    expect(evaluate('MAXIFS(C1:C4, A1:A4, "West", B1:B4, "Open")', ctx)).toBe('50');
  });

  it('returns spreadsheet-style division errors for empty conditional averages', () => {
    expect(evaluate('AVERAGEIF(A1:A2, "Missing", B1:B2)', {
      A1: 'West', B1: '10',
      A2: 'East', B2: '20',
    })).toBe('#DIV/0!');
    expect(evaluate('IFERROR(AVERAGEIFS(B1:B2, A1:A2, "Missing"), "none")', {
      A1: 'West', B1: '10',
      A2: 'East', B2: '20',
    })).toBe('none');
  });
});

describe('cloud sheet formula numeric aggregation compatibility', () => {
  it('ignores blanks and text in range aggregations like Excel', () => {
    const ctx = {
      A1: '10',
      A2: '',
      A3: 'text',
      A4: '20',
    };
    expect(evaluate('AVERAGE(A1:A4)', ctx)).toBe('15');
    expect(evaluate('MIN(A1:A4)', ctx)).toBe('10');
    expect(evaluate('MAX(A1:A4)', ctx)).toBe('20');
    expect(evaluate('PRODUCT(A1:A4)', ctx)).toBe('200');
  });

  it('keeps SUMPRODUCT text-compatible by treating non-numeric paired cells as zero', () => {
    expect(evaluate('SUMPRODUCT(A1:A3, B1:B3)', {
      A1: '2', B1: '10',
      A2: 'x', B2: '10',
      A3: '4', B3: '',
    })).toBe('20');
  });
});

describe('cloud sheet formula statistical compatibility', () => {
  it('supports common Excel statistical functions and dotted aliases', () => {
    const ctx = { A1: '1', A2: '2', A3: '3', A4: '4' };
    expect(evaluate('LARGE(A1:A4, 2)', ctx)).toBe('3');
    expect(evaluate('SMALL(A1:A4, 2)', ctx)).toBe('2');
    expect(evaluate('PERCENTILE.INC(A1:A4, 0.75)', ctx)).toBe('3.25');
    expect(evaluate('PERCENTILE.EXC(A1:A4, 0.5)', ctx)).toBe('2.5');
    expect(evaluate('QUARTILE.INC(A1:A4, 1)', ctx)).toBe('1.75');
    expect(evaluate('QUARTILE.EXC(A1:A4, 2)', ctx)).toBe('2.5');
    expect(evaluate('STDEV.S(A1:A4)', ctx)).toBe('1.290994');
    expect(evaluate('STDEV.P(A1:A4)', ctx)).toBe('1.118034');
    expect(evaluate('VAR.S(A1:A4)', ctx)).toBe('1.666667');
    expect(evaluate('VAR.P(A1:A4)', ctx)).toBe('1.25');
  });
});

describe('cloud sheet formula value and date conversion compatibility', () => {
  it('supports VALUE for formatted numeric text copied from spreadsheets', () => {
    expect(evaluate('VALUE("1,234.50")')).toBe('1234.5');
    expect(evaluate('VALUE("$1,234")')).toBe('1234');
    expect(evaluate('VALUE("12%")')).toBe('0.12');
    expect(evaluate('VALUE("(1,234)")')).toBe('-1234');
  });

  it('supports DATEVALUE and DAYS with Excel serial dates', () => {
    expect(evaluate('DATEVALUE("2026-05-11")')).toBe('46153');
    expect(evaluate('TEXT(DATEVALUE("2026-05-11"), "yyyy-mm-dd")')).toBe('2026-05-11');
    expect(evaluate('DAYS("2026-05-11", "2026-05-01")')).toBe('10');
    expect(evaluate('DAYS(DATEVALUE("2026-05-11"), DATEVALUE("2026-05-01"))')).toBe('10');
  });

  it('returns spreadsheet-style value errors for invalid conversions', () => {
    expect(evaluate('VALUE("not a number")')).toBe('#VALUE!');
    expect(evaluate('DATEVALUE("not a date")')).toBe('#VALUE!');
    expect(evaluate('DAYS("2026-05-11", "not a date")')).toBe('#VALUE!');
  });
});

describe('cloud sheet formula string literal compatibility', () => {
  it('does not evaluate cell-looking text inside string literals', () => {
    expect(evalCell('A2', { A1: '99', A2: '="A1"' })).toBe('A1');
    expect(evalCell('A2', { A1: 'B1', B1: '99', A2: '=A1' })).toBe('B1');
  });

  it('does not rewrite function names, booleans, or operators inside string literals', () => {
    expect(evaluate('"SUM"&" TRUE"&" ^ "')).toBe('SUM TRUE ^ ');
    expect(evaluate('IF("TRUE"="TRUE","SUM","no")')).toBe('SUM');
  });
});

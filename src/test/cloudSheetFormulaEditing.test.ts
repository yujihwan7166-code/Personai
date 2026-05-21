import { describe, expect, it } from 'vitest';
import { buildFormulaRefHighlights } from '@/lib/cloudSheet/formulaRefHighlights';
import { shiftFormula } from '@/lib/cloudSheet/formulaShift';

describe('cloud sheet formula editing compatibility', () => {
  it('does not shift cell-looking text inside formula string literals', () => {
    expect(shiftFormula('=IF("A1:B2"="A1:B2",A1,B1)', 'row', 0, 1, 'Sheet1'))
      .toBe('=IF("A1:B2"="A1:B2",A2,B2)');
    expect(shiftFormula('="A1 "" B2"&A1', 'col', 0, 1, 'Sheet1'))
      .toBe('="A1 "" B2"&B1');
  });

  it('shifts same-sheet references with escaped apostrophes in sheet names', () => {
    expect(shiftFormula("='Bob''s Data'!A1+SUM('Bob''s Data'!A1:'Bob''s Data'!A2)", 'row', 0, 1, "Bob's Data"))
      .toBe("='Bob''s Data'!A2+SUM('Bob''s Data'!A2:A3)");
  });

  it('does not shift references to a different sheet', () => {
    expect(shiftFormula("='Bob''s Data'!A1+A1", 'row', 0, 1, 'Summary'))
      .toBe("='Bob''s Data'!A1+A2");
  });

  it('does not highlight cell-looking text inside formula string literals', () => {
    const highlights = buildFormulaRefHighlights('"C3"&B2', 'Sheet1', ['red', 'blue']);
    expect(highlights.has('C3')).toBe(false);
    expect(highlights.get('B2')).toBe('red');
  });

  it('highlights current-sheet ranges with escaped apostrophes in sheet names', () => {
    const highlights = buildFormulaRefHighlights("'Bob''s Data'!A1:'Bob''s Data'!A2", "Bob's Data", ['red']);
    expect(highlights.get('A1')).toBe('red');
    expect(highlights.get('A2')).toBe('red');
  });
});

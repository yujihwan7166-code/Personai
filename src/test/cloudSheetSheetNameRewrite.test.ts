import { describe, expect, it } from 'vitest';
import {
  remapNamedRangeSheet,
  rewriteCellsFormulaSheetNames,
  rewriteFormulaSheetNames,
} from '@/lib/cloudSheet/sheetNameRewrite';

describe('cloud sheet imported sheet name rewrite', () => {
  it('rewrites imported cross-sheet formulas after duplicate sheet names are renamed', () => {
    const names = new Map([
      ['Data', 'Data (2)'],
      ["Bob's Data", "Bob's Data (2)"],
    ]);

    expect(rewriteFormulaSheetNames("Data!A1+'Bob''s Data'!B2", names))
      .toBe("'Data (2)'!A1+'Bob''s Data (2)'!B2");
  });

  it('does not rewrite sheet-looking text inside string literals', () => {
    const names = new Map([['Data', 'Data (2)']]);

    expect(rewriteFormulaSheetNames('IF("Data!A1"="Data!A1",Data!A1,0)', names))
      .toBe('IF("Data!A1"="Data!A1",\'Data (2)\'!A1,0)');
  });

  it('rewrites every imported formula cell but leaves values unchanged', () => {
    const names = new Map([['Data', 'Data (2)']]);
    const cells = rewriteCellsFormulaSheetNames({
      A1: '=Data!A1+1',
      A2: 'Data!A1',
    }, names);

    expect(cells.A1).toBe("='Data (2)'!A1+1");
    expect(cells.A2).toBe('Data!A1');
  });

  it('remaps named ranges to renamed imported sheets', () => {
    const names = new Map([['Data', 'Data (2)']]);

    expect(remapNamedRangeSheet('Data!A1:A2', names)).toBe("'Data (2)'!A1:A2");
  });
});

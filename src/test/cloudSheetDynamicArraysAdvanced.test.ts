import { describe, expect, it } from 'vitest';
import { evalCell, SPILL_SENTINEL } from '@/lib/cloudSheet/formula';

type Cells = Record<string, string>;

const evaluate = (formula: string, ctx: Cells = {}): string =>
  evalCell('Z99', { ...ctx, Z99: `=${formula}` });

const parseSpill = (value: string): unknown[][] => {
  expect(value.startsWith(SPILL_SENTINEL)).toBe(true);
  return JSON.parse(value.slice(SPILL_SENTINEL.length));
};

const tableCtx: Cells = {
  A1: 'Name', B1: 'Score', C1: 'Team',
  A2: 'Ada', B2: '90', C2: 'Blue',
  A3: 'Lin', B3: '75', C3: 'Red',
  A4: 'Bea', B4: '90', C4: 'Blue',
};

describe('dynamic array 2D compatibility', () => {
  it('filters whole rows from a rectangular range', () => {
    expect(parseSpill(evaluate('FILTER(A2:C4, B2:B4>=90)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
    ]);
  });

  it('returns FILTER if_empty when no rows match', () => {
    expect(evaluate('FILTER(A2:C4, B2:B4>100, "No matches")', tableCtx)).toBe('No matches');
  });

  it('supports Excel-style FILTER AND/OR condition arrays', () => {
    expect(parseSpill(evaluate('FILTER(A2:C4, (B2:B4>=90)*(C2:C4="Blue"))', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
    ]);
    expect(parseSpill(evaluate('FILTER(A2:C4, (A2:A4="Lin")+(C2:C4="Blue"))', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Lin', '75', 'Red'],
      ['Bea', '90', 'Blue'],
    ]);
  });

  it('sorts a rectangular range by a selected column and order', () => {
    expect(parseSpill(evaluate('SORT(A2:C4, 2, -1)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
      ['Lin', '75', 'Red'],
    ]);
  });

  it('supports Excel SORTBY for row and column criteria', () => {
    expect(parseSpill(evaluate('SORTBY(A2:C4, B2:B4, -1, A2:A4, 1)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
      ['Lin', '75', 'Red'],
    ]);
    expect(parseSpill(evaluate('SORTBY(A1:C2, A2:C2, -1)', {
      A1: 'Name', B1: 'Score', C1: 'Team',
      A2: '3', B2: '1', C2: '2',
    }))).toEqual([
      ['Name', 'Team', 'Score'],
      ['3', '2', '1'],
    ]);
  });

  it('deduplicates repeated rows in rectangular ranges', () => {
    const ctx = {
      A1: 'Ada', B1: 'Blue',
      A2: 'Lin', B2: 'Red',
      A3: 'Ada', B3: 'Blue',
    };
    expect(parseSpill(evaluate('UNIQUE(A1:B3)', ctx))).toEqual([
      ['Ada', 'Blue'],
      ['Lin', 'Red'],
    ]);
  });

  it('supports TRANSPOSE, TAKE, and DROP for rectangular ranges', () => {
    expect(parseSpill(evaluate('TRANSPOSE(A1:C2)', tableCtx))).toEqual([
      ['Name', 'Ada'],
      ['Score', '90'],
      ['Team', 'Blue'],
    ]);
    expect(parseSpill(evaluate('TAKE(A1:C4, 2, 2)', tableCtx))).toEqual([
      ['Name', 'Score'],
      ['Ada', '90'],
    ]);
    expect(parseSpill(evaluate('DROP(A1:C4, 1, -1)', tableCtx))).toEqual([
      ['Ada', '90'],
      ['Lin', '75'],
      ['Bea', '90'],
    ]);
    expect(parseSpill(evaluate('TAKE(A1:C4,,2)', tableCtx))).toEqual([
      ['Name', 'Score'],
      ['Ada', '90'],
      ['Lin', '75'],
      ['Bea', '90'],
    ]);
    expect(parseSpill(evaluate('TAKE(A1:C4,-2,-2)', tableCtx))).toEqual([
      ['75', 'Red'],
      ['90', 'Blue'],
    ]);
    expect(parseSpill(evaluate('DROP(A1:C4,,-1)', tableCtx))).toEqual([
      ['Name', 'Score'],
      ['Ada', '90'],
      ['Lin', '75'],
      ['Bea', '90'],
    ]);
  });

  it('supports Excel 365 stacking functions with uneven array padding', () => {
    expect(parseSpill(evaluate('HSTACK(A2:A3, B2:C4)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Lin', '75', 'Red'],
      ['#N/A', '90', 'Blue'],
    ]);

    expect(parseSpill(evaluate('VSTACK(A2:B2, A3:C4)', tableCtx))).toEqual([
      ['Ada', '90', '#N/A'],
      ['Lin', '75', 'Red'],
      ['Bea', '90', 'Blue'],
    ]);
  });

  it('supports Excel 365 TOCOL and TOROW scan options', () => {
    const ctx = {
      A1: 'A', B1: '', C1: 'C',
      A2: 'D', B2: '#N/A', C2: 'F',
    };

    expect(parseSpill(evaluate('TOCOL(A1:C2, 1)', ctx))).toEqual([
      ['A'],
      ['C'],
      ['D'],
      ['#N/A'],
      ['F'],
    ]);
    expect(parseSpill(evaluate('TOROW(A1:C2, 3, TRUE)', ctx))).toEqual([
      ['A', 'D', 'C', 'F'],
    ]);
  });

  it('spills ranges returned from CHOOSE', () => {
    expect(parseSpill(evaluate('CHOOSE(2, A2:A4, B2:B4)', tableCtx))).toEqual([
      ['90'],
      ['75'],
      ['90'],
    ]);
  });

  it('spills full rows and columns from INDEX zero arguments', () => {
    expect(parseSpill(evaluate('INDEX(A2:C4, 0, 2)', tableCtx))).toEqual([
      ['90'],
      ['75'],
      ['90'],
    ]);
    expect(parseSpill(evaluate('INDEX(A2:C4, 2, 0)', tableCtx))).toEqual([
      ['Lin', '75', 'Red'],
    ]);
    expect(parseSpill(evaluate('FILTER(A2:C4, INDEX(B2:B4, 0, 1)>=90)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
    ]);
  });

  it('supports Excel 365 WRAPROWS and WRAPCOLS vector reshaping', () => {
    const ctx = {
      A1: 'A', B1: 'B', C1: 'C', D1: 'D', E1: 'E',
    };

    expect(parseSpill(evaluate('WRAPROWS(A1:E1, 2, "")', ctx))).toEqual([
      ['A', 'B'],
      ['C', 'D'],
      ['E', ''],
    ]);
    expect(parseSpill(evaluate('WRAPCOLS(A1:E1, 2, "")', ctx))).toEqual([
      ['A', 'C', 'E'],
      ['B', 'D', ''],
    ]);
  });

  it('supports Excel 365 TEXTSPLIT with row delimiters and padding', () => {
    expect(parseSpill(evaluate('TEXTSPLIT("name,score|Ada,90|Lin", ",", "|", FALSE, 0, "")'))).toEqual([
      ['name', 'score'],
      ['Ada', '90'],
      ['Lin', ''],
    ]);

    expect(parseSpill(evaluate('TEXTSPLIT("A--b--C", "--", "", TRUE, 1)'))).toEqual([
      ['A', 'b', 'C'],
    ]);

    expect(parseSpill(evaluate('TEXTSPLIT("Ada|90|Blue",,"|")'))).toEqual([
      ['Ada'],
      ['90'],
      ['Blue'],
    ]);
  });

  it('supports Excel 365 row and column selection helpers', () => {
    expect(parseSpill(evaluate('CHOOSECOLS(A1:C4, 1, -1)', tableCtx))).toEqual([
      ['Name', 'Team'],
      ['Ada', 'Blue'],
      ['Lin', 'Red'],
      ['Bea', 'Blue'],
    ]);

    expect(parseSpill(evaluate('CHOOSEROWS(A1:C4, 1, -1)', tableCtx))).toEqual([
      ['Name', 'Score', 'Team'],
      ['Bea', '90', 'Blue'],
    ]);
  });

  it('supports Excel 365 EXPAND padding', () => {
    expect(parseSpill(evaluate('EXPAND(A1:B2, 3, 4, "")', tableCtx))).toEqual([
      ['Name', 'Score', '', ''],
      ['Ada', '90', '', ''],
      ['', '', '', ''],
    ]);

    expect(evaluate('EXPAND(A1:B2, 1, 2)', tableCtx)).toBe('#VALUE!');
  });
});

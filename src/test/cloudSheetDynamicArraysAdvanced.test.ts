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

  it('sorts a rectangular range by a selected column and order', () => {
    expect(parseSpill(evaluate('SORT(A2:C4, 2, -1)', tableCtx))).toEqual([
      ['Ada', '90', 'Blue'],
      ['Bea', '90', 'Blue'],
      ['Lin', '75', 'Red'],
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
  });
});

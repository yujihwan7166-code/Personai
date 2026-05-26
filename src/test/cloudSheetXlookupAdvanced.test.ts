import { describe, expect, it } from 'vitest';
import { evalCell, SPILL_SENTINEL } from '@/lib/cloudSheet/formula';

type Cells = Record<string, string>;

const evaluate = (formula: string, ctx: Cells = {}): string =>
  evalCell('Z99', { ...ctx, Z99: `=${formula}` });

const parseSpill = (value: string): unknown[][] => {
  expect(value.startsWith(SPILL_SENTINEL)).toBe(true);
  return JSON.parse(value.slice(SPILL_SENTINEL.length));
};

describe('formula XLOOKUP advanced compatibility', () => {
  it('supports nearest match modes and wildcard match mode', () => {
    const ctx = {
      A1: '10', B1: 'low',
      A2: '20', B2: 'mid',
      A3: '30', B3: 'high',
      C1: 'alpha', D1: 'A',
      C2: 'beta', D2: 'B',
      C3: 'gamma', D3: 'G',
      C4: 'b*literal', D4: 'L',
    };

    expect(evaluate('XLOOKUP(25, A1:A3, B1:B3, "missing", -1)', ctx)).toBe('mid');
    expect(evaluate('XLOOKUP(25, A1:A3, B1:B3, "missing", 1)', ctx)).toBe('high');
    expect(evaluate('XLOOKUP("b*", C1:C3, D1:D3, "missing", 2)', ctx)).toBe('B');
    expect(evaluate('XLOOKUP("b~*literal", C1:C4, D1:D4, "missing", 2)', ctx)).toBe('L');
  });

  it('supports reverse search mode and multi-column row returns', () => {
    const ctx = {
      A1: 'id', B1: 'first', C1: 'second',
      A2: 'b', B2: 'old', C2: 'older',
      A3: 'a', B3: 'one', C3: 'two',
      A4: 'b', B4: 'new', C4: 'newer',
    };

    expect(evaluate('XLOOKUP("b", A2:A4, B2:B4, "missing", 0, -1)', ctx)).toBe('new');
    expect(parseSpill(evaluate('XLOOKUP("a", A2:A4, B2:C4)', ctx))).toEqual([['one', 'two']]);
  });
});

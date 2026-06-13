import { describe, expect, it } from 'vitest';
import { evalCell } from '@/lib/cloudSheet/formula';

type Cells = Record<string, string>;

const evaluate = (formula: string, ctx: Cells = {}): string =>
  evalCell('Z99', { ...ctx, Z99: `=${formula}` });

describe('formula LET compatibility', () => {
  it('evaluates scalar names and dependent names', () => {
    expect(evaluate('LET(x, 2, x + 3)')).toBe('5');
    expect(evaluate('LET(price, 100, tax, price * 0.1, price + tax)')).toBe('110');
  });

  it('can bind cell and range references', () => {
    expect(evaluate('LET(x, A1, x * 2)', { A1: '7' })).toBe('14');
    expect(evaluate('LET(values, A1:A3, SUM(values))', { A1: '1', A2: '2', A3: '3' })).toBe('6');
  });

  it('returns strings and rejects invalid local names with a value error', () => {
    expect(evaluate('LET(label, "Revenue", label & " total")')).toBe('Revenue total');
    expect(evaluate('LET(A1, 2, A1 + 1)')).toBe('#VALUE!');
  });
});

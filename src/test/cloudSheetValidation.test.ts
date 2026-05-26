import { describe, expect, it } from 'vitest';
import { buildInvalidRefSet, buildValidationItemsMap } from '@/lib/cloudSheet/validationMaps';
import type { Validation } from '@/lib/cloudSheet/validation';

describe('cloud sheet validation maps', () => {
  it('marks invalid list and numeric validation cells', () => {
    const validations: Validation[] = [
      {
        id: 'status',
        range: { minR: 0, maxR: 0, minC: 0, maxC: 0 },
        kind: 'list',
        items: ['Open', 'Closed'],
      },
      {
        id: 'score',
        range: { minR: 0, maxR: 1, minC: 1, maxC: 1 },
        kind: 'integer',
        operator: 'between',
        formula1: '1',
        formula2: '10',
      },
      {
        id: 'ratio',
        range: { minR: 0, maxR: 0, minC: 2, maxC: 2 },
        kind: 'number',
        operator: 'lessThanOrEqual',
        formula1: '1',
      },
      {
        id: 'date',
        range: { minR: 0, maxR: 1, minC: 3, maxC: 3 },
        kind: 'date',
        operator: 'between',
        formula1: '2026-01-01',
        formula2: '2026-12-31',
      },
      {
        id: 'length',
        range: { minR: 0, maxR: 0, minC: 4, maxC: 4 },
        kind: 'textLength',
        operator: 'lessThanOrEqual',
        formula1: '3',
      },
    ];
    const cells = { A1: 'Pending', B1: '5', B2: '11', C1: '1.5', D1: '2026-05-22', D2: '2027-01-01', E1: 'abcd' };
    const invalid = buildInvalidRefSet(buildValidationItemsMap(validations), cells, {}, validations);

    expect(invalid.has('A1')).toBe(true);
    expect(invalid.has('B1')).toBe(false);
    expect(invalid.has('B2')).toBe(true);
    expect(invalid.has('C1')).toBe(true);
    expect(invalid.has('D1')).toBe(false);
    expect(invalid.has('D2')).toBe(true);
    expect(invalid.has('E1')).toBe(true);
  });
});

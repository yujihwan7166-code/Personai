import { describe, expect, it } from 'vitest';
import { parseA1RangeReference, shiftA1RangeReference } from '@/lib/cloudSheet/rangeShift';

describe('A1 range structural shifts', () => {
  it('expands metadata ranges when inserting inside the range', () => {
    expect(shiftA1RangeReference('A1:C10', 'col', 1, 1, 'Sheet1')).toBe('A1:D10');
    expect(shiftA1RangeReference('Sheet1!A1:C10', 'row', 4, 1, 'Sheet1')).toBe('Sheet1!A1:C11');
  });

  it('moves ranges when inserting before the range', () => {
    expect(shiftA1RangeReference("'Sales Data'!$B$2:$D$8", 'col', 1, 1, 'Sales Data')).toBe("'Sales Data'!$C$2:$E$8");
    expect(shiftA1RangeReference('Sheet1!B2:D8', 'row', 1, 1, 'Sheet1')).toBe('Sheet1!B3:D9');
  });

  it('shrinks or removes ranges when deleting inside the range', () => {
    expect(shiftA1RangeReference('A1:C10', 'col', 1, -1, 'Sheet1')).toBe('A1:B10');
    expect(shiftA1RangeReference('A1:A10', 'col', 0, -1, 'Sheet1')).toBeUndefined();
  });

  it('leaves references on other sheets unchanged', () => {
    expect(shiftA1RangeReference('Sheet2!A1:C10', 'row', 0, 1, 'Sheet1')).toBe('Sheet2!A1:C10');
  });

  it('parses app-created unquoted sheet prefixes with spaces', () => {
    expect(parseA1RangeReference('Sales Data!A1:B2')?.sheetName).toBe('Sales Data');
    expect(shiftA1RangeReference('Sales Data!A1:B2', 'row', 1, 1, 'Sales Data')).toBe('Sales Data!A1:B3');
  });
});

import { describe, expect, it } from 'vitest';
import { computePdfPageSlices } from '@/lib/pdfExport';

describe('computePdfPageSlices', () => {
  it('splits by page height and skips configured page gaps', () => {
    expect(computePdfPageSlices(2500, 1000, 50)).toEqual([
      { sourceY: 0, height: 1000 },
      { sourceY: 1050, height: 1000 },
      { sourceY: 2100, height: 400 },
    ]);
  });

  it('moves a cut before a table-like avoid range when there is enough content before it', () => {
    expect(computePdfPageSlices(2200, 1000, 0, [{ start: 850, end: 1200 }])).toEqual([
      { sourceY: 0, height: 850 },
      { sourceY: 850, height: 1000 },
      { sourceY: 1850, height: 350 },
    ]);
  });

  it('keeps a whole avoid range on the current page when it starts too close to the top', () => {
    expect(computePdfPageSlices(1400, 1000, 0, [{ start: 80, end: 700 }])).toEqual([
      { sourceY: 0, height: 1000 },
      { sourceY: 1000, height: 400 },
    ]);
  });

  it('does not adjust for avoid ranges taller than a practical page portion', () => {
    expect(computePdfPageSlices(2200, 1000, 0, [{ start: 100, end: 1050 }])).toEqual([
      { sourceY: 0, height: 1000 },
      { sourceY: 1000, height: 1000 },
      { sourceY: 2000, height: 200 },
    ]);
  });

  it('does not skip a page gap when it would cut into a table-like avoid range', () => {
    expect(computePdfPageSlices(2300, 1000, 50, [{ start: 1020, end: 1180 }])).toEqual([
      { sourceY: 0, height: 1000 },
      { sourceY: 1000, height: 1000 },
      { sourceY: 2050, height: 250 },
    ]);
  });

  it('still skips a page gap when avoid ranges are clear of the gap', () => {
    expect(computePdfPageSlices(2300, 1000, 50, [{ start: 1150, end: 1300 }])).toEqual([
      { sourceY: 0, height: 1000 },
      { sourceY: 1050, height: 1000 },
      { sourceY: 2100, height: 200 },
    ]);
  });

  it('moves a cut before paragraph-like content near the page edge', () => {
    expect(computePdfPageSlices(2600, 1000, 50, [{ start: 920, end: 1080 }])).toEqual([
      { sourceY: 0, height: 920 },
      { sourceY: 920, height: 1000 },
      { sourceY: 1970, height: 630 },
    ]);
  });
});

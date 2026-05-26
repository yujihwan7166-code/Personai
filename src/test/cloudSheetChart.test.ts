import { describe, expect, it } from 'vitest';
import { buildChartData } from '@/lib/cloudSheet/chart';

describe('cloud sheet charts', () => {
  it('uses formula evaluation context when building chart data', () => {
    const cells = {
      A1: 'Month',
      B1: 'Total',
      A2: 'Jan',
      B2: '=SUM(Scores[Score])',
      A5: 'Name',
      B5: 'Score',
      A6: 'Ada',
      B6: '10',
      A7: 'Lin',
      B7: '20',
    };

    const data = buildChartData(cells, { minR: 0, maxR: 1, minC: 0, maxC: 1 }, 'columns', {
      currentName: 'Sheet1',
      allSheets: { Sheet1: cells },
      tables: {
        Sheet1: [{
          name: 'Scores',
          ref: 'A5:B7',
          headerRow: true,
          totalsRow: false,
          columns: [{ name: 'Name' }, { name: 'Score' }],
        }],
      },
    });

    expect(data.seriesKeys).toEqual(['Total']);
    expect(data.rows).toEqual([{ name: 'Jan', Total: 30 }]);
  });

  it('uses cross-sheet formulas in embedded chart data', () => {
    const sheet = {
      A1: 'Quarter',
      B1: 'Revenue',
      A2: 'Q1',
      B2: '=Data!A1+Data!A2',
    };

    const data = buildChartData(sheet, { minR: 0, maxR: 1, minC: 0, maxC: 1 }, 'columns', {
      currentName: 'Summary',
      allSheets: {
        Summary: sheet,
        Data: { A1: '10', A2: '15' },
      },
    });

    expect(data.rows).toEqual([{ name: 'Q1', Revenue: 25 }]);
  });
});

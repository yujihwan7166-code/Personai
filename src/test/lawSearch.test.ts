import { describe, expect, it } from 'vitest';
import { buildCitationContext } from '../../api/_lib/api-enrichment';
import { buildLawArticleLabel, parseArticleHint } from '../../api/_lib/legal-provider-direct';

describe('law search helpers', () => {
  it('parses article hints with branch numbers', () => {
    expect(parseArticleHint('민법 750조의2')).toEqual({
      articleNumber: '750',
      branchNumber: '2',
      label: '제750조의2',
      joCode: '075002',
    });
  });

  it('builds law article labels without branch numbers', () => {
    expect(buildLawArticleLabel('750')).toBe('제750조');
    expect(buildLawArticleLabel('750', '2')).toBe('제750조의2');
  });

  it('includes law metadata inside citation context', () => {
    const context = buildCitationContext([
      {
        id: 'law-1',
        type: 'law_article',
        label: '민법 제750조',
        source: '국가법령정보센터',
        rawData: '고의 또는 과실로 인한 손해배상 책임',
        lawName: '민법',
        articleNumber: '제750조',
        effectiveDate: '2025-01-01',
        fetchedAt: '2026-04-10T00:00:00.000Z',
      },
    ]);

    expect(context).toContain('민법');
    expect(context).toContain('제750조');
    expect(context).toContain('2025-01-01');
    expect(context).toContain('고의 또는 과실');
  });
});

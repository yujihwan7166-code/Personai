import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiEnrichmentResult } from './_lib/api-enrichment.js';
import { createLegalResearchProvider } from './_lib/legal-provider.js';
import type { LegalResearchInput } from './_lib/legal-provider-types.js';
export { buildLawArticleLabel, parseArticleHint } from './_lib/legal-provider-direct.js';

function normalizeLawSearchBody(body: unknown): LegalResearchInput {
  const payload = (body || {}) as Partial<LegalResearchInput>;

  return {
    keywords: Array.isArray(payload.keywords) ? payload.keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [],
    searchType: payload.searchType === 'statute' || payload.searchType === 'precedent' || payload.searchType === 'both'
      ? payload.searchType
      : 'both',
    limit: typeof payload.limit === 'number' && Number.isFinite(payload.limit) ? payload.limit : 5,
    question: typeof payload.question === 'string' ? payload.question : undefined,
    articleHint: typeof payload.articleHint === 'string' || typeof payload.articleHint === 'number' ? payload.articleHint : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const input = normalizeLawSearchBody(req.body);
  if (input.keywords.length === 0) {
    return res.status(400).json({ error: 'keywords required' });
  }

  const provider = createLegalResearchProvider();
  const result = await provider.search(input);

  return res.json({
    domain: 'law',
    query: input.keywords.join(', '),
    citations: result.citations,
    rawContext: result.rawContext,
    error: result.error,
    provider: result.provider,
  } satisfies ApiEnrichmentResult & { provider: string });
}

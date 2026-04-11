import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSearchContext, formatSearchContext } from './_lib/search/searchOrchestrator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as { question?: string };
  const question = typeof body.question === 'string' ? body.question.trim() : '';

  if (!question) {
    return res.status(400).json({ error: '질문이 비어 있어요.' });
  }

  try {
    const context = await getSearchContext(question);
    if (!context) {
      return res.json({ searchContext: null });
    }

    const sources = context.results.map(r => ({ title: r.title, link: r.link }));
    const formatted = formatSearchContext(context);

    return res.json({
      searchContext: {
        query: context.query,
        sources,
        formatted,
      },
    });
  } catch {
    return res.json({ searchContext: null });
  }
}

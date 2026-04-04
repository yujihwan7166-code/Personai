import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseXmlResponse, sanitizeApiResponse, fetchWithTimeout } from './_lib/api-enrichment.js';
import type { ApiSourceCitation, ApiEnrichmentResult } from './_lib/api-enrichment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keywords, searchType = 'both', limit = 5 } = req.body as {
    keywords: string[];
    searchType?: 'statute' | 'precedent' | 'both';
    limit?: number;
  };

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords required' });
  }

  const apiKey = process.env.LAW_API_KEY;
  if (!apiKey) {
    return res.json({
      domain: 'law',
      query: keywords.join(', '),
      citations: [],
      rawContext: '',
      error: 'LAW_API_KEY가 설정되지 않았습니다. AI 지식 기반으로 답변합니다.',
    } satisfies ApiEnrichmentResult);
  }

  const citations: ApiSourceCitation[] = [];

  try {
    for (const keyword of keywords.slice(0, 3)) {
      const query = encodeURIComponent(keyword);

      // Search statutes
      if (searchType === 'statute' || searchType === 'both') {
        try {
          const url = `http://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=law&type=XML&query=${query}&display=${limit}`;
          const resp = await fetchWithTimeout(url);
          const xml = await resp.text();
          const parsed = parseXmlResponse(xml);
          const items = parsed?.LawSearch?.law;
          const lawList = Array.isArray(items) ? items : items ? [items] : [];
          for (const law of lawList.slice(0, limit)) {
            citations.push({
              id: `law-${law['법령일련번호'] || Date.now()}`,
              type: 'law_article',
              label: law['법령명한글'] || keyword,
              source: '국가법령정보센터',
              url: law['법령상세링크'] ? `https://law.go.kr${law['법령상세링크']}` : undefined,
              rawData: sanitizeApiResponse(law['법령명한글'] || '', 1000),
              fetchedAt: new Date().toISOString(),
            });
          }
        } catch { /* timeout or parse error - skip */ }
      }

      // Search precedents
      if (searchType === 'precedent' || searchType === 'both') {
        try {
          const url = `http://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=prec&type=XML&query=${query}&display=${limit}`;
          const resp = await fetchWithTimeout(url);
          const xml = await resp.text();
          const parsed = parseXmlResponse(xml);
          const items = parsed?.PrecSearch?.prec;
          const precList = Array.isArray(items) ? items : items ? [items] : [];
          for (const prec of precList.slice(0, 3)) {
            citations.push({
              id: `prec-${prec['판례일련번호'] || Date.now()}`,
              type: 'precedent',
              label: prec['사건명'] || prec['사건번호'] || keyword,
              source: '국가법령정보센터',
              url: prec['판례상세링크'] ? `https://law.go.kr${prec['판례상세링크']}` : undefined,
              rawData: sanitizeApiResponse(prec['판례내용'] || prec['사건명'] || '', 1500),
              fetchedAt: new Date().toISOString(),
            });
          }
        } catch { /* skip */ }
      }
    }
  } catch (e) {
    return res.json({
      domain: 'law',
      query: keywords.join(', '),
      citations: [],
      rawContext: '',
      error: `법령 검색 실패: ${e instanceof Error ? e.message : 'unknown'}`,
    } satisfies ApiEnrichmentResult);
  }

  // Deduplicate by label
  const seen = new Set<string>();
  const unique = citations.filter(c => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });

  return res.json({
    domain: 'law',
    query: keywords.join(', '),
    citations: unique,
    rawContext: unique.map(c => `[${c.label}] ${c.rawData || ''}`).join('\n\n'),
  } satisfies ApiEnrichmentResult);
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sanitizeApiResponse, fetchWithTimeout } from './_lib/api-enrichment.js';
import type { ApiSourceCitation, ApiEnrichmentResult } from './_lib/api-enrichment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { drugName, ingredient, searchType = 'info' } = req.body as {
    drugName?: string;
    ingredient?: string;
    searchType?: 'info' | 'interaction' | 'sideEffect';
  };

  const searchTerm = drugName || ingredient;
  if (!searchTerm) {
    return res.status(400).json({ error: 'drugName or ingredient required' });
  }

  const apiKey = process.env.DRUG_API_KEY;
  if (!apiKey) {
    return res.json({
      domain: 'drug',
      query: searchTerm,
      citations: [],
      rawContext: '',
      error: 'DRUG_API_KEY가 설정되지 않았습니다. AI 지식 기반으로 답변합니다.',
    } satisfies ApiEnrichmentResult);
  }

  const citations: ApiSourceCitation[] = [];

  try {
    const query = encodeURIComponent(searchTerm);
    const url = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${apiKey}&itemName=${query}&type=json&numOfRows=5`;
    const resp = await fetchWithTimeout(url);
    const data = await resp.json();
    const items = data?.body?.items || [];

    for (const item of items.slice(0, 5)) {
      const efcy = item.efcyQesitm ? sanitizeApiResponse(item.efcyQesitm, 500) : '';
      const useMethod = item.useMethodQesitm ? sanitizeApiResponse(item.useMethodQesitm, 500) : '';
      const warning = item.atpnWarnQesitm ? sanitizeApiResponse(item.atpnWarnQesitm, 500) : '';
      const sideEffect = item.seQesitm ? sanitizeApiResponse(item.seQesitm, 500) : '';
      const interaction = item.intrcQesitm ? sanitizeApiResponse(item.intrcQesitm, 500) : '';

      const parts = [
        efcy && `효능: ${efcy}`,
        useMethod && `용법: ${useMethod}`,
        warning && `주의사항: ${warning}`,
        sideEffect && `부작용: ${sideEffect}`,
        interaction && `상호작용: ${interaction}`,
      ].filter(Boolean).join('\n');

      citations.push({
        id: `drug-${item.itemSeq || Date.now()}-${citations.length}`,
        type: searchType === 'interaction' ? 'drug_interaction' : 'drug_info',
        label: item.itemName || searchTerm,
        source: '식약처 의약품안전나라',
        rawData: sanitizeApiResponse(parts, 1500),
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    return res.json({
      domain: 'drug',
      query: searchTerm,
      citations: [],
      rawContext: '',
      error: '의약품 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    } satisfies ApiEnrichmentResult);
  }

  return res.json({
    domain: 'drug',
    query: searchTerm,
    citations,
    rawContext: citations.map(c => `[${c.label}] ${c.rawData || ''}`).join('\n\n'),
  } satisfies ApiEnrichmentResult);
}

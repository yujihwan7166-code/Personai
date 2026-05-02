import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sanitizeApiResponse, fetchWithTimeout } from './_lib/api-enrichment.js';
import type { ApiSourceCitation, ApiEnrichmentResult } from './_lib/api-enrichment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dataType = 'indicator', keyword } = req.body as {
    dataType?: 'indicator' | 'deposit' | 'loan' | 'exchange';
    keyword?: string;
  };

  const citations: ApiSourceCitation[] = [];
  const bokKey = process.env.BOK_API_KEY;
  const fssKey = process.env.FSS_API_KEY;

  if (!bokKey && !fssKey) {
    return res.json({
      domain: 'finance',
      query: keyword || dataType,
      citations: [],
      rawContext: '',
      error: 'BOK_API_KEY/FSS_API_KEY가 설정되지 않았습니다. AI 지식 기반으로 답변합니다.',
    } satisfies ApiEnrichmentResult);
  }

  try {
    // Bank of Korea ECOS - key economic indicators
    if (bokKey && (dataType === 'indicator' || dataType === 'exchange')) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      // Base rate (한국은행 기준금리)
      try {
        const url = `https://ecos.bok.or.kr/api/StatisticSearch/${bokKey}/json/kr/1/5/722Y001/M/${year - 1}01/${year}${month}/0101000`;
        const resp = await fetchWithTimeout(url);
        const data = await resp.json();
        const rows = data?.StatisticSearch?.row || [];
        if (rows.length > 0) {
          const latest = rows[rows.length - 1];
          citations.push({
            id: `bok-rate-${Date.now()}`,
            type: 'economic_indicator',
            label: `한국은행 기준금리: ${latest.DATA_VALUE}%`,
            source: '한국은행 ECOS',
            rawData: `기준금리 ${latest.DATA_VALUE}% (${latest.TIME} 기준)`,
            fetchedAt: new Date().toISOString(),
          });
        }
      } catch { /* skip */ }
    }

    // FSS Financial Product Comparison
    if (fssKey && (dataType === 'deposit' || dataType === 'loan')) {
      try {
        const endpoint = dataType === 'deposit'
          ? `http://finlife.fss.or.kr/finlifeapi/depositProductsSearch.json?auth=${fssKey}&topFinGrpNo=020000&pageNo=1`
          : `http://finlife.fss.or.kr/finlifeapi/creditLoanProductsSearch.json?auth=${fssKey}&topFinGrpNo=020000&pageNo=1`;
        const resp = await fetchWithTimeout(endpoint);
        const data = await resp.json();
        const products = data?.result?.baseList || [];
        for (const product of products.slice(0, 5)) {
          citations.push({
            id: `fss-${product.fin_prdt_cd || Date.now()}-${citations.length}`,
            type: 'financial_product',
            label: `${product.kor_co_nm} - ${product.fin_prdt_nm}`,
            source: '금융감독원',
            rawData: sanitizeApiResponse(
              `상품명: ${product.fin_prdt_nm}\n금융사: ${product.kor_co_nm}\n가입방법: ${product.join_way || '-'}`,
              800
            ),
            fetchedAt: new Date().toISOString(),
          });
        }
      } catch { /* skip */ }
    }
  } catch {
    return res.json({
      domain: 'finance',
      query: keyword || dataType,
      citations: [],
      rawContext: '',
      error: '금융 데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    } satisfies ApiEnrichmentResult);
  }

  return res.json({
    domain: 'finance',
    query: keyword || dataType,
    citations,
    rawContext: citations.map(c => `[${c.label}] ${c.rawData || ''}`).join('\n\n'),
  } satisfies ApiEnrichmentResult);
}

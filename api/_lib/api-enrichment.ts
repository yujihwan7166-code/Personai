import { XMLParser } from 'fast-xml-parser';

export interface ApiSourceCitation {
  id: string;
  type: 'law_article' | 'precedent' | 'drug_info' | 'drug_interaction' | 'economic_indicator' | 'financial_product';
  label: string;
  source: string;
  url?: string;
  rawData?: string;
  fetchedAt: string;
}

export interface ApiEnrichmentResult {
  domain: 'law' | 'drug' | 'finance';
  query: string;
  citations: ApiSourceCitation[];
  rawContext: string;
  error?: string;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

export function parseXmlResponse(xml: string): Record<string, unknown> | null {
  try {
    return xmlParser.parse(xml);
  } catch {
    return null;
  }
}

export function sanitizeApiResponse(text: string, maxChars = 6000): string {
  // Strip HTML tags, normalize whitespace, truncate
  const clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > maxChars ? clean.slice(0, maxChars) + '...' : clean;
}

export function buildCitationContext(citations: ApiSourceCitation[]): string {
  if (citations.length === 0) return '';
  const lines = citations.map((c, i) => {
    const data = c.rawData ? `\n내용: ${c.rawData}` : '';
    return `[${i + 1}] ${c.label} (출처: ${c.source})${data}`;
  });
  return `\n\n=== 실제 데이터 참조 (아래 데이터를 근거로 답변하세요) ===\n${lines.join('\n\n')}\n\n위 데이터를 인용할 때는 반드시 {{cite:출처명}} 형식으로 마킹하세요.`;
}

export function buildTrustHeader(domain: 'law' | 'drug' | 'finance', citations: ApiSourceCitation[]): string {
  const sourceMap = { law: '국가법령정보센터', drug: '식약처 의약품안전나라', finance: '한국은행 ECOS · 금감원' };
  const now = new Date().toISOString().split('T')[0];
  if (citations.length === 0) return `⚠️ API 미연동 · AI 지식 기반 답변 · ${now} 기준`;
  return `✅ ${sourceMap[domain]} 데이터 기반 · ${now} 기준 · ${citations.length}건 참조`;
}

export async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

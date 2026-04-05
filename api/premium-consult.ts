import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildGeminiUrl, parseGeminiStreamBuffer, extractJsonObject } from './_lib/gemini.js';
import { buildCitationContext, buildTrustHeader } from './_lib/api-enrichment.js';
import type { ApiSourceCitation } from './_lib/api-enrichment.js';

type PremiumDomainId = 'law' | 'drug' | 'finance';

interface PremiumConsultBody {
  question: string;
  domain: PremiumDomainId;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  systemPrompt?: string;
}

const KEYWORD_EXTRACTION_PROMPTS: Record<PremiumDomainId, string> = {
  law: `사용자의 법률 질문에서 검색에 사용할 핵심 법률 키워드를 추출하세요.
법령명, 법조문 번호, 법률 개념(예: 전세보증금, 임대차, 계약해지)을 추출합니다.
JSON으로만 응답: {"keywords": ["키워드1", "키워드2", ...], "searchType": "statute" | "precedent" | "both"}`,

  drug: `사용자의 의약품/건강 질문에서 검색에 사용할 핵심 키워드를 추출하세요.
약품명(한글/영문), 성분명, 증상명을 추출합니다.
JSON으로만 응답: {"drugName": "약품명", "ingredient": "성분명", "searchType": "info" | "interaction" | "sideEffect"}`,

  finance: `사용자의 금융/투자 질문에서 검색에 사용할 핵심 키워드를 추출하세요.
금융상품 유형, 경제지표, 관련 키워드를 추출합니다.
JSON으로만 응답: {"dataType": "indicator" | "deposit" | "loan" | "exchange", "keyword": "검색어"}`,
};

const FOLLOWUP_INSTRUCTION = `\n- 답변 마지막에 반드시 {{followup:후속질문1||후속질문2||후속질문3}} 형식으로 맥락에 맞는 후속 질문 3개를 제안하세요. 이 태그는 답변 본문과 별도로, 맨 마지막 줄에 넣으세요.`;

const DOMAIN_SYSTEM_PROMPTS: Record<PremiumDomainId, string> = {
  law: `당신은 한국 법률 전문 AI 자문관입니다.
- 반드시 제공된 실제 법령/판례 데이터를 근거로 답변하세요
- 법령을 인용할 때는 {{cite:법령명 제X조}} 형식으로 마킹하세요
- 판례를 인용할 때는 {{cite:사건번호}} 형식으로 마킹하세요
- 법적 면책: "이 답변은 AI 참고 자문이며, 정확한 법률 조언은 변호사와 상담하세요"를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,

  drug: `당신은 한국 의약품·건강 전문 AI 자문관입니다.
- 반드시 제공된 식약처 의약품 데이터를 근거로 답변하세요
- 약품을 인용할 때는 {{cite:약품명}} 형식으로 마킹하세요
- 의료 면책: "이 답변은 AI 참고 자문이며, 정확한 의료 조언은 의사/약사와 상담하세요"를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,

  finance: `당신은 한국 재무·투자 전문 AI 자문관입니다.
- 반드시 제공된 한국은행/금감원 실시간 데이터를 근거로 답변하세요
- 금융 데이터를 인용할 때는 {{cite:지표명 또는 상품명}} 형식으로 마킹하세요
- 투자 면책: "이 답변은 AI 참고 자문이며, 투자 결정은 본인 책임입니다"를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,

  realestate: `당신은 한국 부동산 전문 AI 자문관입니다.
- 질문의 사실관계를 정리하고, 매매/임대차 판단 포인트, 비용 구조, 리스크, 체크리스트 순서로 답하세요
- 실거래가나 대출 조건이 없으면 단정하지 말고 필요한 확인 정보를 먼저 밝히세요
- 면책: "부동산 계약 전에는 최신 실거래가, 세금, 금융 조건을 다시 확인해야 합니다."를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,

  tax: `당신은 한국 세무 전문 AI 자문관입니다.
- 신고 대상, 준비 자료, 주의사항, 전문가 확인 포인트 순서로 구조화하세요
- 수치나 법 해석을 단정하지 말고 확인이 필요한 부분은 명확히 표시하세요
- 면책: "실제 신고 전에는 최신 세법과 세무 전문가 의견을 확인하세요."를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,

  labor: `당신은 한국 노무 전문 AI 자문관입니다.
- 사실관계 요약, 적용 가능 기준, 증거 체크, 대응 순서 순으로 구조화하세요
- 해고, 징계, 퇴직 등 분쟁 사안은 단정하지 말고 확인이 필요한 사실을 먼저 짚으세요
- 면책: "분쟁성 노무 사안은 노무사 또는 변호사 확인이 필요할 수 있습니다."를 마지막에 포함
- 한국어로 답변하고, 구조화된 마크다운을 사용하세요` + FOLLOWUP_INSTRUCTION,
};

async function extractKeywords(question: string, domain: PremiumDomainId, apiKey: string): Promise<Record<string, unknown>> {
  const url = buildGeminiUrl('gemini-2.5-flash-lite', apiKey, false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${KEYWORD_EXTRACTION_PROMPTS[domain]}\n\n사용자 질문: ${question}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
      signal: controller.signal,
    });
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return extractJsonObject(text) || {};
  } finally {
    clearTimeout(timer);
  }
}

async function callProxySearch(domain: PremiumDomainId, keywords: Record<string, unknown>, origin: string): Promise<{ citations: ApiSourceCitation[]; rawContext: string; error?: string }> {
  const endpointMap: Record<PremiumDomainId, string> = {
    law: '/api/law-search',
    drug: '/api/drug-search',
    finance: '/api/finance-data',
  };

  // Server-to-server call using the same Vercel instance
  // In production, use internal URL; in dev, use origin
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin;
  const url = `${baseUrl}${endpointMap[domain]}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywords),
    });
    const data = await resp.json();
    return { citations: data.citations || [], rawContext: data.rawContext || '', error: data.error };
  } catch (e) {
    return { citations: [], rawContext: '', error: `프록시 호출 실패: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, domain, conversationHistory = [], systemPrompt } = req.body as PremiumConsultBody;
  if (!question || !domain) return res.status(400).json({ error: 'question and domain required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

  // Set up SSE headers early so we can send step events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Step 1: Extract keywords
  res.write(`data: ${JSON.stringify({ type: 'step', step: 1, label: '키워드 분석 중...' })}\n\n`);
  let keywords: Record<string, unknown> = {};
  try {
    keywords = await extractKeywords(question, domain, apiKey);
  } catch { /* proceed without keywords */ }
  res.write(`data: ${JSON.stringify({ type: 'step', step: 1, label: '키워드 분석 완료' })}\n\n`);

  // Step 2: Search public API
  res.write(`data: ${JSON.stringify({ type: 'step', step: 2, label: '데이터 검색 중...' })}\n\n`);
  const searchResult = await callProxySearch(domain, keywords, origin);
  const citationContext = buildCitationContext(searchResult.citations);
  const trustHeader = buildTrustHeader(domain, searchResult.citations);
  res.write(`data: ${JSON.stringify({ type: 'step', step: 2, label: searchResult.citations.length > 0 ? `${searchResult.citations.length}건 발견` : '데이터 검색 완료' })}\n\n`);

  // Step 3: Build enriched system prompt
  const basePrompt = systemPrompt || DOMAIN_SYSTEM_PROMPTS[domain];
  const enrichedPrompt = basePrompt + citationContext;

  // Build conversation for Gemini
  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (enrichedPrompt) {
    contents.push({ role: 'user', parts: [{ text: `[시스템 지시]\n${enrichedPrompt}` }] });
    contents.push({ role: 'model', parts: [{ text: '네, 제공된 데이터를 근거로 답변하겠습니다.' }] });
  }
  for (const msg of conversationHistory) {
    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: question }] });

  // Step 4: Stream response — send trust header + start Gemini stream
  res.write(`data: ${JSON.stringify({ type: 'trust', trustHeader, citations: searchResult.citations, error: searchResult.error })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'step', step: 3, label: '답변 생성 중...' })}\n\n`);

  const streamUrl = buildGeminiUrl('gemini-2.5-flash-lite', apiKey, true);
  try {
    const geminiResp = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });

    if (!geminiResp.ok || !geminiResp.body) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '⚠️ AI 응답을 받아올 수 없습니다.' } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = geminiResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { texts, remainder } = parseGeminiStreamBuffer(buffer);
      buffer = remainder;
      for (const text of texts) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }
    }

    // Final flush
    if (buffer.trim()) {
      const { texts } = parseGeminiStreamBuffer(buffer + '\n');
      for (const text of texts) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }
    }
  } catch (e) {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n⚠️ 스트리밍 오류: ${e instanceof Error ? e.message : 'unknown'}` } }] })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

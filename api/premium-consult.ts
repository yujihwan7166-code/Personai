import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  type AttachmentUserPart,
  buildUserPartsFromUploadedFiles,
  normalizeAndValidateUploadedFiles,
  type ValidatedUploadedFile,
} from './_lib/attachments.js';
import { buildCitationContext, buildTrustHeader } from './_lib/api-enrichment.js';
import type { ApiSourceCitation } from './_lib/api-enrichment.js';
import { buildGeminiUrl, extractJsonObject, parseGeminiStreamBuffer } from './_lib/gemini.js';

type PremiumDomainId = 'law' | 'drug' | 'finance' | 'realestate' | 'tax' | 'labor';

interface PremiumConsultBody {
  question?: string;
  domain?: PremiumDomainId;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  systemPrompt?: string;
  files?: unknown;
}

const SEARCHABLE_DOMAIN_ENDPOINTS: Partial<Record<PremiumDomainId, string>> = {
  law: '/api/law-search',
  drug: '/api/drug-search',
  finance: '/api/finance-data',
};

const DOMAIN_LABELS: Record<PremiumDomainId, string> = {
  law: '법률',
  drug: '의약품',
  finance: '금융',
  realestate: '부동산',
  tax: '세무',
  labor: '노무',
};

const KEYWORD_EXTRACTION_PROMPTS: Record<PremiumDomainId, string> = {
  law: '사용자 질문에서 법률 검색에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"keywords":["키워드1","키워드2"],"searchType":"statute"|"precedent"|"both"} 입니다.',
  drug: '사용자 질문에서 의약품 검색에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"drugName":"약품명","ingredient":"성분명","searchType":"info"|"interaction"|"sideEffect"} 입니다.',
  finance: '사용자 질문에서 금융 데이터 검색에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"dataType":"indicator"|"deposit"|"loan"|"exchange","keyword":"검색어"} 입니다.',
  realestate: '사용자 질문에서 부동산 자문에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"keywords":["키워드1","키워드2"],"focus":"deal"|"rent"|"valuation"|"risk"} 입니다.',
  tax: '사용자 질문에서 세무 자문에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"keywords":["키워드1","키워드2"],"focus":"filing"|"deduction"|"business"|"capital"} 입니다.',
  labor: '사용자 질문에서 노무 자문에 필요한 핵심 키워드를 추출해 주세요. JSON으로만 답하고 형식은 {"keywords":["키워드1","키워드2"],"focus":"dismissal"|"wage"|"contract"|"leave"} 입니다.',
};

const FOLLOWUP_INSTRUCTION = '\n- 답변 마지막 줄에 {{followup:후속질문1||후속질문2||후속질문3}} 형식으로 후속 질문 3개를 붙여 주세요.';

const DOMAIN_SYSTEM_PROMPTS: Record<PremiumDomainId, string> = {
  law: `당신은 한국 법률 자문 AI입니다.
- 실제 법령과 판례를 근거로 설명하세요.
- 법 조문이나 판례 근거가 있으면 {{cite:출처명}} 형식으로 표시하세요.
- 확정적 결론이 어려우면 필요한 사실관계를 먼저 짚으세요.
- 마지막에 "이 답변은 일반적인 참고 정보이며, 구체적 사안은 변호사와 상담해 주세요."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
  drug: `당신은 한국 의약품 상담 AI입니다.
- 의약품 정보와 상호작용, 부작용 위험을 구조적으로 설명하세요.
- 출처가 있으면 {{cite:출처명}} 형식으로 표시하세요.
- 증상 악화, 복용 중단, 병용 금기 여부는 분명히 말하세요.
- 마지막에 "이 답변은 참고용이며, 실제 복용 판단은 의사나 약사와 상담해 주세요."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
  finance: `당신은 한국 금융 자문 AI입니다.
- 금융 데이터와 상품 조건을 바탕으로 장단점과 리스크를 설명하세요.
- 출처가 있으면 {{cite:출처명}} 형식으로 표시하세요.
- 기대수익만 말하지 말고 손실 가능성과 확인해야 할 조건을 함께 적으세요.
- 마지막에 "이 답변은 참고용이며, 투자 결정의 책임은 본인에게 있습니다."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
  realestate: `당신은 한국 부동산 자문 AI입니다.
- 매매, 전월세, 권리관계, 자금조달 리스크를 순서대로 정리하세요.
- 불확실한 사실은 단정하지 말고 추가 확인 항목을 제시하세요.
- 마지막에 "계약 전에는 최신 시세, 등기, 세금, 대출 조건을 다시 확인해 주세요."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
  tax: `당신은 한국 세무 자문 AI입니다.
- 신고, 공제, 증빙, 주의사항을 구조적으로 설명하세요.
- 계산에 필요한 정보가 부족하면 먼저 무엇을 확인해야 하는지 말하세요.
- 마지막에 "실제 신고 전에는 최신 세법과 세무 전문가 검토가 필요합니다."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
  labor: `당신은 한국 노무 자문 AI입니다.
- 사실관계, 적용 법 기준, 필요한 증빙, 대응 순서를 나눠 설명하세요.
- 부당해고나 임금체불 등은 절차와 기한을 놓치지 않게 정리하세요.
- 마지막에 "분쟁 사안은 노무사나 변호사와 함께 사실관계를 확인해 주세요."를 넣으세요.${FOLLOWUP_INSTRUCTION}`,
};

function sanitizeConversationHistory(history: unknown) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item): item is { role: 'user' | 'assistant'; content: string } => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: typeof item.content === 'string' ? item.content.slice(0, 6000) : '',
    }))
    .filter((item) => item.content.trim().length > 0)
    .slice(-20);
}

function buildPremiumTrustHeader(domain: PremiumDomainId, citations: ApiSourceCitation[]) {
  if (domain === 'law' || domain === 'drug' || domain === 'finance') {
    return buildTrustHeader(domain, citations);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (citations.length === 0) {
    return `${DOMAIN_LABELS[domain]} 자문 모드 · ${today} 기준`;
  }

  return `${DOMAIN_LABELS[domain]} 참고자료 ${citations.length}건 · ${today} 기준`;
}

async function extractKeywords(
  question: string,
  domain: PremiumDomainId,
  apiKey: string,
  files: ValidatedUploadedFile[]
): Promise<Record<string, unknown>> {
  const url = buildGeminiUrl('gemini-2.5-flash-lite', apiKey, false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), files.length > 0 ? 12000 : 8000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${KEYWORD_EXTRACTION_PROMPTS[domain]}\n\n사용자 질문: ${question}` },
              ...buildUserPartsFromUploadedFiles(files),
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return extractJsonObject(text) || {};
  } finally {
    clearTimeout(timer);
  }
}

async function callProxySearch(
  domain: PremiumDomainId,
  keywords: Record<string, unknown>,
  origin: string
): Promise<{ citations: ApiSourceCitation[]; rawContext: string; error?: string }> {
  const endpoint = SEARCHABLE_DOMAIN_ENDPOINTS[domain];
  if (!endpoint) {
    return { citations: [], rawContext: '' };
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin;
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywords),
    });
    const data = await response.json();
    return {
      citations: data.citations || [],
      rawContext: data.rawContext || '',
      error: data.error,
    };
  } catch (error) {
    return {
      citations: [],
      rawContext: '',
      error: `공공 데이터 검색에 실패했어요: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as PremiumConsultBody;
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const domain = body.domain;
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';

  if (!question) {
    return res.status(400).json({ error: '질문이 비어 있어요.' });
  }

  if (!domain) {
    return res.status(400).json({ error: '도메인 정보가 없어요.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았어요.' });
  }

  let validatedFiles: ValidatedUploadedFile[] = [];
  try {
    validatedFiles = normalizeAndValidateUploadedFiles(body.files);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : '첨부파일을 확인하지 못했어요.',
    });
  }

  const conversationHistory = sanitizeConversationHistory(body.conversationHistory);
  const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify({ type: 'step', step: 1, label: '질문 핵심 분석 중...' })}\n\n`);

  let keywords: Record<string, unknown> = {};
  try {
    keywords = await extractKeywords(question, domain, apiKey, validatedFiles);
  } catch {
    keywords = {};
  }

  res.write(`data: ${JSON.stringify({ type: 'step', step: 1, label: '질문 핵심 분석 완료' })}\n\n`);

  const willSearch = Boolean(SEARCHABLE_DOMAIN_ENDPOINTS[domain]);
  res.write(`data: ${JSON.stringify({ type: 'step', step: 2, label: willSearch ? '관련 공공 데이터 조회 중...' : '도메인 자료 조회 건너뜀' })}\n\n`);

  const searchResult = willSearch
    ? await callProxySearch(domain, keywords, origin)
    : { citations: [], rawContext: '', error: undefined as string | undefined };
  const citationContext = buildCitationContext(searchResult.citations);
  const trustHeader = buildPremiumTrustHeader(domain, searchResult.citations);

  res.write(`data: ${JSON.stringify({
    type: 'step',
    step: 2,
    label: willSearch
      ? (searchResult.citations.length > 0 ? `참고자료 ${searchResult.citations.length}건 확인` : '관련 공공 데이터 조회 완료')
      : '도메인 자료 조회 완료',
  })}\n\n`);

  const enrichedPrompt = (systemPrompt || DOMAIN_SYSTEM_PROMPTS[domain]) + citationContext;
  const contents: { role: 'user' | 'model'; parts: AttachmentUserPart[] }[] = [
    ...conversationHistory.map((message): { role: 'user' | 'model'; parts: AttachmentUserPart[] } => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    {
      role: 'user',
      parts: [{ text: question }, ...buildUserPartsFromUploadedFiles(validatedFiles)],
    },
  ];

  res.write(`data: ${JSON.stringify({ type: 'trust', trustHeader, citations: searchResult.citations, error: searchResult.error })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'step', step: 3, label: '답변 생성 중...' })}\n\n`);

  const streamUrl = buildGeminiUrl('gemini-2.5-flash-lite', apiKey, true);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), validatedFiles.length > 0 ? 70000 : 40000);

    const geminiResponse = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: enrichedPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiResponse.ok || !geminiResponse.body) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '전문 자문 응답을 받아오지 못했어요. 잠시 후 다시 시도해 주세요.' } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = geminiResponse.body.getReader();
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

    if (buffer.trim()) {
      const { texts } = parseGeminiStreamBuffer(`${buffer}\n`);
      for (const text of texts) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }
    }
  } catch (error) {
    const message =
      (error as Error).name === 'AbortError'
        ? '답변 생성 시간이 조금 길어졌어요. 파일 크기나 질문 범위를 줄여서 다시 시도해 주세요.'
        : `전문 자문 스트림 오류: ${error instanceof Error ? error.message : 'unknown'}`;
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n${message}` } }] })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

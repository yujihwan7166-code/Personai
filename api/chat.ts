import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeAndValidateUploadedFiles } from './_lib/attachments.js';
import {
  buildOpenRouterContentFromUploadedFiles,
  buildOpenRouterPluginsForUploadedFiles,
  DEFAULT_OPENROUTER_TEXT_MODEL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
  parseOpenRouterStreamBuffer,
} from './_lib/openrouter.js';
import { getSearchContext, formatSearchContext } from './_lib/search/searchOrchestrator.js';

interface PreviousResponse {
  name: string;
  content: string;
}

interface PreSearchContext {
  query: string;
  sources: { title: string; link: string }[];
  formatted: string;
}

interface ChatRequestBody {
  systemPrompt?: string;
  question?: string;
  previousResponses?: PreviousResponse[];
  files?: unknown;
  openrouterModel?: string;
  preSearchContext?: PreSearchContext | null;
}

function sanitizePreviousResponses(previousResponses: unknown): PreviousResponse[] {
  if (!Array.isArray(previousResponses)) {
    return [];
  }

  return previousResponses
    .filter((item): item is PreviousResponse => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.slice(0, 80) : '참여자',
      content: typeof item.content === 'string' ? item.content.slice(0, 6000) : '',
    }))
    .filter((item) => item.content.trim().length > 0)
    .slice(-20);
}

function buildPrompt(question: string, previousResponses: PreviousResponse[]) {
  if (previousResponses.length === 0) {
    return question;
  }

  const context = previousResponses
    .map((response) => `[${response.name}]\n${response.content}`)
    .join('\n\n');

  return `이전 대화 맥락\n${context}\n\n사용자 질문: ${question}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }

  // ── Agent Step 모드: 비스트리밍 단일 호출 ──
  if (req.query.mode === 'agent-step') {
    const { systemPrompt: agSys, userPrompt, model, maxTokens = 800, temperature = 0.5 } = req.body || {};
    if (!userPrompt || !model) {
      return res.status(400).json({ error: 'userPrompt and model are required' });
    }
    try {
      const msgs: { role: string; content: string }[] = [];
      if (agSys) msgs.push({ role: 'system', content: agSys });
      msgs.push({ role: 'user', content: userPrompt });

      const agentRes = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({ model, messages: msgs, stream: false, temperature, max_tokens: maxTokens }),
      });
      if (!agentRes.ok) {
        const errText = await agentRes.text();
        return res.status(agentRes.status).json({ error: errText });
      }
      const data = await agentRes.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      const tokensUsed = (data?.usage?.prompt_tokens ?? 0) + (data?.usage?.completion_tokens ?? 0);
      return res.status(200).json({ content, tokensUsed });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  }

  const body = (req.body || {}) as ChatRequestBody;
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
  const requestedModel = typeof body.openrouterModel === 'string' ? body.openrouterModel.trim() : '';

  if (!question) {
    return res.status(400).json({ error: '질문이 비어 있어요.' });
  }

  if (question.length > 10000) {
    return res.status(400).json({ error: '질문이 너무 길어요. 10000자 이하로 줄여 주세요.' });
  }

  const previousResponses = sanitizePreviousResponses(body.previousResponses);

  let validatedFiles = [];
  try {
    validatedFiles = normalizeAndValidateUploadedFiles(body.files);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : '첨부파일을 확인하지 못했어요.',
    });
  }

  // 현재 날짜/시간 정보를 시스템 프롬프트에 주입
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateInfo = `[현재 시각 정보] 오늘은 ${koreaTime.getFullYear()}년 ${koreaTime.getMonth() + 1}월 ${koreaTime.getDate()}일 ${weekdays[koreaTime.getDay()]}요일입니다. 현재 한국 시각은 ${koreaTime.getHours()}시 ${koreaTime.getMinutes()}분입니다. 답변 시 이 날짜를 기준으로 해주세요.\n\n`;

  // 3단계 웹 검색 필터 실행 (preSearchContext가 있으면 스킵)
  const preSearch = body.preSearchContext;
  let searchContext: Awaited<ReturnType<typeof getSearchContext>> = null;
  let searchInfo = '';
  if (preSearch && preSearch.formatted) {
    // 토론 모드: 프론트엔드에서 이미 검색 완료
    searchInfo = '\n\n' + preSearch.formatted;
  } else if (preSearch === undefined) {
    // 단일 모드: 직접 검색
    searchContext = await getSearchContext(question);
    searchInfo = searchContext ? '\n\n' + formatSearchContext(searchContext) : '';
  }
  // preSearch === null → 검색 불필요 판정 완료, 스킵

  const messages = [
    ...(systemPrompt ? [{ role: 'system' as const, content: dateInfo + systemPrompt + searchInfo }] : [{ role: 'system' as const, content: dateInfo + searchInfo }]),
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: buildPrompt(question, previousResponses) },
        ...buildOpenRouterContentFromUploadedFiles(validatedFiles),
      ],
    },
  ];
  const plugins = buildOpenRouterPluginsForUploadedFiles(validatedFiles);
  const hasFiles = validatedFiles.length > 0;

  try {
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), hasFiles ? 60000 : 30000);

    const model = requestedModel || DEFAULT_OPENROUTER_TEXT_MODEL;

    // Thinking/reasoning 모델은 reasoning effort를 꺼서 content 필드에 직접 응답받기
    const THINKING_MODELS = ['qwen/qwen3.5-9b', 'qwen/qwen3-max-thinking', 'deepseek/deepseek-r1'];
    const isThinkingModel = THINKING_MODELS.some(m => model.includes(m));

    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages,
        plugins,
        stream: true,
        temperature: 0.8,
        max_tokens: 2048,
        ...(isThinkingModel ? { reasoning: { effort: 'none' } } : {}),
      }),
      signal: abortCtrl.signal,
    });

    clearTimeout(timeoutId);

    if (!openRouterRes.ok) {
      const errorText = await openRouterRes.text();
      if (openRouterRes.status === 429) {
        return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' });
      }
      if (openRouterRes.status >= 500) {
        return res.status(openRouterRes.status).json({ error: '모델 서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.' });
      }
      return res.status(openRouterRes.status).json({ error: errorText || '응답을 받아오지 못했어요.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const allowedOrigin = req.headers.origin || '';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

    // 검색 결과가 있으면 출처 정보를 첫 이벤트로 전송
    if (searchContext) {
      const sources = searchContext.results.map(r => ({ title: r.title, link: r.link }));
      res.write(`event: search\ndata: ${JSON.stringify({ query: searchContext.query, sources })}\n\n`);
    } else if (preSearch && preSearch.sources?.length > 0) {
      res.write(`event: search\ndata: ${JSON.stringify({ query: preSearch.query, sources: preSearch.sources })}\n\n`);
    }

    const reader = openRouterRes.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: '응답 스트림을 읽지 못했어요.' });
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseOpenRouterStreamBuffer(buffer);
      buffer = parsed.remainder;

      for (const text of parsed.texts) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      }

      if (parsed.done) {
        break;
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return res.status(504).json({ error: '모델 응답 시간이 초과됐어요. 파일 크기나 질문 길이를 줄여서 다시 시도해 주세요.' });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
    });
  }
}

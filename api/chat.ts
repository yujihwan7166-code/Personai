import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  type AttachmentUserPart,
  buildUserPartsFromUploadedFiles,
  normalizeAndValidateUploadedFiles,
} from './_lib/attachments.js';
import { buildGeminiUrl, parseGeminiStreamBuffer } from './_lib/gemini.js';

interface PreviousResponse {
  name: string;
  content: string;
}

interface ChatRequestBody {
  systemPrompt?: string;
  question?: string;
  previousResponses?: PreviousResponse[];
  files?: unknown;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았어요.' });
  }

  const body = (req.body || {}) as ChatRequestBody;
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';

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

  const contents: Array<{ role: 'user'; parts: AttachmentUserPart[] }> = [
    {
      role: 'user',
      parts: [
        { text: buildPrompt(question, previousResponses) },
        ...buildUserPartsFromUploadedFiles(validatedFiles),
      ],
    },
  ];

  const model = 'gemini-2.5-flash-lite';
  const url = buildGeminiUrl(model, apiKey, true);
  const hasFiles = validatedFiles.length > 0;

  try {
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), hasFiles ? 60000 : 30000);

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
      signal: abortCtrl.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' });
      }
      if (geminiRes.status >= 500) {
        return res.status(geminiRes.status).json({ error: '모델 서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.' });
      }
      return res.status(geminiRes.status).json({ error: errorText || '응답을 받아오지 못했어요.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: '응답 스트림을 열지 못했어요.' });
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseGeminiStreamBuffer(buffer);
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
      return res.status(504).json({ error: '모델 응답 시간이 초과되었어요. 파일 크기나 질문 길이를 조금 줄여서 다시 시도해 주세요.' });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
    });
  }
}

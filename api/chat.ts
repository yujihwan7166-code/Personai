import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildGeminiUrl, parseGeminiStreamBuffer } from './_lib/gemini.js';

interface PreviousResponse {
  name: string;
  content: string;
}

interface UploadedFilePayload {
  name: string;
  mimeType?: string;
  base64?: string;
  extractedText?: string;
}

type UserPart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

interface ChatRequestBody {
  systemPrompt?: string;
  question?: string;
  previousResponses?: PreviousResponse[];
  files?: UploadedFilePayload[];
}

function buildPrompt(question: string, previousResponses?: PreviousResponse[]) {
  if (!previousResponses || previousResponses.length === 0) {
    return question;
  }

  const context = previousResponses
    .map((response) => `[${response.name}]: ${response.content}`)
    .join('\n\n');

  return `이전 대화\n${context}\n\n새 질문: ${question}`;
}

function buildFileParts(files?: UploadedFilePayload[]): UserPart[] {
  if (!files || files.length === 0) {
    return [];
  }

  const parts: UserPart[] = [
    {
      text: '\n[첨부 안내]\n질문과 관련이 있다면 아래 첨부 파일 내용을 우선 참고해서 답변하세요.',
    },
  ];

  for (const file of files) {
    if (file.extractedText) {
      parts.push({
        text: `\n[첨부 파일: ${file.name}]\n${file.extractedText}`,
      });
      continue;
    }

    if (file.base64 && file.mimeType) {
      parts.push({ text: `\n[첨부 파일: ${file.name}]` });
      parts.push({
        inline_data: {
          mime_type: file.mimeType,
          data: file.base64,
        },
      });
    }
  }

  return parts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { question, previousResponses, files } = (req.body || {}) as ChatRequestBody;
  const systemPrompt = typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt : '';

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required and must be a string' });
  }

  if (question.length > 10000) {
    return res.status(400).json({ error: 'question is too long' });
  }

  const contents: Array<{ role: 'user'; parts: UserPart[] }> = [
    {
      role: 'user',
      parts: [{ text: buildPrompt(question, previousResponses) }, ...buildFileParts(files)],
    },
  ];

  const model = 'gemini-2.5-flash-lite';
  const url = buildGeminiUrl(model, apiKey, true);

  try {
    const abortCtrl = new AbortController();
    const hasFiles = Array.isArray(files) && files.length > 0;
    const timeoutId = setTimeout(() => abortCtrl.abort(), hasFiles ? 60000 : 30000);

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
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
        return res.status(429).json({ error: 'API 요청 한도를 초과했어요. 잠시 후 다시 시도해주세요.' });
      }
      return res.status(geminiRes.status).json({ error: errorText });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'No response body' });
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
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream model request timed out' });
    }

    return res.status(500).json({ error: String(err) });
  }
}

/**
 * 클라우드 모드 AI 액션용 simple endpoint.
 * 사용: POST /api/cloud-ai
 *   body: { system: string, user: string, model?: string, maxTokens?: number, temperature?: number }
 *   res:  { text: string }  또는 { error: string }
 *
 * non-streaming. 짧은 인라인 액션 (요약·재작성·번역 등) 용.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

interface Body {
  system?: string;
  user?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenRouterChoice {
  message?: { content?: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const body = (req.body ?? {}) as Body;
  const system = typeof body.system === 'string' ? body.system : '';
  const user = typeof body.user === 'string' ? body.user : '';

  if (!system || !user) {
    res.status(400).json({ error: 'system / user 필드가 필요합니다.' });
    return;
  }
  // 입력 길이 보호
  if (user.length > 30_000) {
    res.status(400).json({ error: '입력이 너무 깁니다 (최대 30,000자).' });
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY 가 설정되지 않았어요.' });
    return;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: body.model || DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: body.maxTokens ?? 2048,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `OpenRouter ${response.status}: ${errText.slice(0, 500)}` });
      return;
    }

    const data = (await response.json()) as OpenRouterResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) {
      res.status(502).json({ error: 'AI 응답이 비어있어요. 다시 시도해주세요.' });
      return;
    }
    res.status(200).json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: `호출 실패: ${msg}` });
  }
}

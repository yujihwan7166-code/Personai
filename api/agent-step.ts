import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

/**
 * Agent Step API — 비스트리밍 단일 호출
 * Step 1 (질문 분석) 및 Step 2 (개별 태스크 실행) 에 사용
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, model, maxTokens = 800, temperature = 0.5 } = req.body || {};

  if (!userPrompt || !model) {
    return res.status(400).json({ error: 'userPrompt and model are required' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[agent-step] OpenRouter error:', response.status, errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ?? '';
    const tokensUsed =
      (data?.usage?.prompt_tokens ?? 0) + (data?.usage?.completion_tokens ?? 0);

    return res.status(200).json({ content, tokensUsed });
  } catch (err: any) {
    console.error('[agent-step] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

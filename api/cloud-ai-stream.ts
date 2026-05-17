/**
 * 클라우드 AI 사이드바 streaming endpoint.
 * 사용: POST /api/cloud-ai-stream
 *   body: { system, user, model?, maxTokens?, temperature? }
 *   res:  SSE 스트림 — 각 chunk 는 `data: {"text":"..."}\n\n`
 *         마지막에 `data: [DONE]\n\n`
 *         에러는 `data: {"error":"..."}\n\n`
 *
 * OpenRouter streaming response 를 받아 delta.content 만 추출해 forward.
 * Vercel Node runtime 에서 res.write 로 chunk 전송.
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

function writeSse(res: VercelResponse, payload: object | '[DONE]'): void {
  const data = payload === '[DONE]' ? '[DONE]' : JSON.stringify(payload);
  res.write(`data: ${data}\n\n`);
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
  if (user.length > 30_000) {
    res.status(400).json({ error: '입력이 너무 깁니다 (최대 30,000자).' });
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY 가 설정되지 않았어요.' });
    return;
  }

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx/proxy 버퍼링 off
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    const upstream = await fetch(OPENROUTER_API_URL, {
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
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      writeSse(res, { error: `OpenRouter ${upstream.status}: ${errText.slice(0, 500)}` });
      res.end();
      return;
    }

    // OpenRouter SSE stream parsing — line by line
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE 는 \n\n 으로 message 경계
      let lineEnd: number;
      while ((lineEnd = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, lineEnd).trim();
        buf = buf.slice(lineEnd + 1);
        if (!line) continue;
        if (line.startsWith(':')) continue; // SSE comment
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          writeSse(res, '[DONE]');
          res.end();
          return;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            error?: { message?: string };
          };
          if (json.error?.message) {
            writeSse(res, { error: json.error.message });
            continue;
          }
          const text = json.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text.length > 0) {
            writeSse(res, { text });
          }
        } catch {
          // malformed chunk — skip
        }
      }
    }
    writeSse(res, '[DONE]');
    res.end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeSse(res, { error: `호출 실패: ${msg}` });
    res.end();
  }
}

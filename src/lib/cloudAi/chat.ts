/**
 * 클라우드 AI 사이드바 채팅 래퍼.
 *
 * 기존 /api/cloud-ai 는 단일 system + user 만 받으므로,
 * history 를 user 메시지 안에 marker 로 인코딩해 보냄.
 *
 * 모델은 quick (Gemini Flash Lite). 비용·속도 우선.
 */

import { quickAi, QUICK_MODEL } from '@/lib/ai/quick';
import type { ChatMessage, AiContext } from './types';
import { SYSTEM_PROMPTS } from './prompts';

const CONTEXT_MAX_CHARS = 8000;

/** message[] + context → user payload 문자열 */
function buildUserPayload(history: ChatMessage[], context: AiContext, userInput: string): string {
  const truncated = context.fullText.length > CONTEXT_MAX_CHARS
    ? `${context.fullText.slice(0, CONTEXT_MAX_CHARS)}\n…(이하 ${context.fullText.length - CONTEXT_MAX_CHARS} 자 잘림)`
    : context.fullText;

  const parts: string[] = [];
  if (truncated.trim()) {
    parts.push('## 현재 컨텍스트');
    parts.push(`(${context.summary})`);
    parts.push('```');
    parts.push(truncated);
    parts.push('```');
    parts.push('');
  }

  if (history.length > 0) {
    parts.push('## 이전 대화');
    for (const m of history) {
      parts.push(m.role === 'user' ? `**사용자:** ${m.content}` : `**AI:** ${m.content}`);
    }
    parts.push('');
  }

  parts.push('## 새 요청');
  parts.push(userInput.trim());

  return parts.join('\n');
}

/**
 * AI 호출 — non-streaming.
 *  - history: 이전 메시지들 (마지막 user 메시지 제외)
 *  - context: 현재 화면 컨텍스트
 *  - userInput: 새 사용자 입력
 *  - 반환: assistant 응답 텍스트
 */
export async function runAiChat(
  context: AiContext,
  history: ChatMessage[],
  userInput: string,
): Promise<string> {
  const system = SYSTEM_PROMPTS[context.kind];
  const user = buildUserPayload(history, context, userInput);
  return await quickAi(system, user, {
    model: QUICK_MODEL,
    maxTokens: 2048,
    temperature: 0.7,
  });
}

/**
 * AI 호출 — streaming.
 *  - onChunk: 누적 텍스트 (지금까지 받은 부분 전체) — UI 가 그대로 표시
 *  - 반환: 최종 누적 텍스트
 *  - throw: 네트워크 / 서버 에러
 */
export async function runAiChatStream(
  context: AiContext,
  history: ChatMessage[],
  userInput: string,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const system = SYSTEM_PROMPTS[context.kind];
  const user = buildUserPayload(history, context, userInput);
  const res = await fetch('/api/cloud-ai-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system, user,
      model: QUICK_MODEL,
      maxTokens: 2048,
      temperature: 0.7,
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `AI 호출 실패 (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.error === 'string') msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let lineEnd: number;
    while ((lineEnd = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, lineEnd).trim();
      buf = buf.slice(lineEnd + 1);
      if (!line || line.startsWith(':')) continue;
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return full;
      try {
        const json = JSON.parse(payload) as { text?: string; error?: string };
        if (json.error) throw new Error(json.error);
        if (typeof json.text === 'string') {
          full += json.text;
          onChunk(full);
        }
      } catch (e) {
        // SSE error 메시지 → 그대로 throw
        if (e instanceof Error && e.message && e.message !== 'SyntaxError') {
          throw e;
        }
      }
    }
  }
  return full;
}

export function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

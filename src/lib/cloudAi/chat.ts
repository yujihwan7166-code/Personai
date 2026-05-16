/**
 * 클라우드 AI 사이드바 채팅 래퍼.
 *
 * 기존 /api/cloud-ai 는 단일 system + user 만 받으므로,
 * history 를 user 메시지 안에 marker 로 인코딩해 보냄.
 *
 * 모델은 quick (Gemini Flash Lite). 비용·속도 우선.
 */

import { quickAi, QUICK_MODEL } from '@/lib/cloudDoc/ai';
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
 * AI 호출.
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

export function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

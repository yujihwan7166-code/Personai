/**
 * 데일리 브리핑 — AI 내러티브 생성 (2026-07-05 재설계).
 *
 * 클라이언트가 조립한 오늘 컨텍스트(일정·할일·습관·D-day·날씨)를 받아
 * OpenRouter(Gemini Flash Lite)로 따뜻하고 간결한 3~4문장 아침 브리핑을 생성.
 * 데이터가 없으면 억지로 만들지 않음. 실패 시 클라이언트가 템플릿 폴백.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

function buildPrompt(context: string, greeting: string): string {
  return `너는 사용자의 다정하고 유능한 개인 비서다. 아래 "오늘 정보"만을 근거로 사용자에게 건네는 아침 브리핑을 작성해라.

오늘 정보:
${context}

작성 규칙:
- 한국어, 3~4문장, 따뜻하지만 담백하게. 과장·이모지 금지.
- "${greeting}" 같은 인사로 시작하지 말 것 (인사는 UI 가 이미 표시함). 바로 핵심부터.
- 있는 정보만 언급. 정보가 비어 있으면 지어내지 말고 그 부분은 생략.
- 가장 중요한 것(임박한 일정, 밀린 할일, 날씨 대비)을 앞에 둔다.
- 마지막은 짧은 응원 한마디로 마무리.
- 정보가 거의 없으면 "오늘은 특별한 일정이 없어요. 원하는 하루를 만들어보세요." 처럼 1~2문장만.

브리핑 본문만 출력 (따옴표·제목·목록 없이 평문):`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(200).json({ briefing: '' });
  }

  const { context, greeting } = (req.body || {}) as { context?: string; greeting?: string };
  if (!context || typeof context !== 'string') {
    return res.status(200).json({ briefing: '' });
  }

  try {
    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: buildPrompt(context, typeof greeting === 'string' ? greeting : '좋은 아침이에요') }],
        temperature: 0.5,
        max_tokens: 320,
      }),
    });

    if (!openRouterRes.ok) {
      return res.status(200).json({ briefing: '' });
    }

    const data = await openRouterRes.json();
    const text = (extractOpenRouterText(data) || '').trim();
    return res.status(200).json({ briefing: text });
  } catch {
    return res.status(200).json({ briefing: '' });
  }
}

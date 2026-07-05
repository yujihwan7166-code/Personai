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
  return `너는 사용자를 오래 봐 온 편한 사람이야. 아래 "오늘 정보"만 보고, 사용자에게 슥 건네는 짧은 아침 한마디를 써 줘.

오늘 정보:
${context}

톤과 규칙:
- 해요체로 편하고 자연스럽게. 친구가 알려주듯. 딱딱한 "~입니다 / ~하시기 바랍니다" 는 절대 쓰지 마.
- "힘찬 하루 보내세요", "좋은 하루 되세요", "화이팅", "오늘도 파이팅" 같은 뻔한 인사말로 끝내지 마. 억지 응원 금지.
- 정보를 항목 나열하지 말고 하나의 자연스러운 흐름으로 엮어. 2~3문장이면 충분.
- 숫자는 자연스럽게 ("08시 30분" 보다 "8시 반쯤", "24도" 보다 "쌀쌀하진 않아요" 처럼 사람이 말하듯).
- 있는 것만 말하고 없으면 그냥 넘어가. 정보가 거의 없으면 한 문장으로 짧게.
- "${greeting}" 같은 인사로 시작하지 마 (UI 가 이미 인사함). 바로 본론.
- 이모지·제목·따옴표·목록 없이 평문 본문만.

예시 느낌 (그대로 쓰지 말고 참고만):
"오늘은 일정이 딱히 없네요. 비가 온다니까 나갈 일 있으면 우산만 챙겨요."
"2시에 회의 하나 있어요. 어제 미뤄둔 것도 하나 남아있으니 그것부터 보면 좋을 것 같아요."

본문:`;
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
        temperature: 0.75,
        max_tokens: 300,
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

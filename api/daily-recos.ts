/**
 * 오늘의 추천 — 브리핑 'AI 추천' 섹션 (2026-07-06).
 *
 * 날짜·요일·날씨 맥락으로 맛집/음식·영화·드라마·넷플·활동 등 가벼운 추천 4개를
 * OpenRouter(Gemini Flash Lite)로 생성. JSON 배열만 반환. 실패 시 빈 배열 →
 * 클라가 정적 폴백 or 섹션 생략.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

interface Reco {
  category: string;
  title: string;
  reason: string;
}

function buildPrompt(context: string): string {
  return `아래 "오늘 맥락"에 맞춰, 사용자에게 가볍게 건넬 오늘의 추천 4개를 만들어 줘.
카테고리는 서로 다르게: 예) 음식/맛집 메뉴, 영화 또는 드라마, 넷플릭스/OTT 볼거리, 오늘 하기 좋은 활동/장소 중에서 골라.

오늘 맥락:
${context}

규칙:
- 실제로 있을 법한 구체적인 제목/메뉴 (가공의 브랜드·없는 작품 지어내지 마).
- reason 은 한 줄(20자 내외), 날씨·요일 맥락을 자연스럽게 반영. 해요체.
- 과장·이모지·따옴표 없이.
- 반드시 아래 JSON 배열 형식만 출력. 다른 말 붙이지 마.

[
  {"category":"음식","title":"...","reason":"..."},
  {"category":"영화","title":"...","reason":"..."},
  {"category":"넷플릭스","title":"...","reason":"..."},
  {"category":"활동","title":"...","reason":"..."}
]`;
}

function parseRecos(text: string): Reco[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.title === 'string' && typeof x.category === 'string')
      .slice(0, 4)
      .map((x) => ({ category: String(x.category), title: String(x.title), reason: String(x.reason ?? '') }));
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ items: [] });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return res.status(200).json({ items: [] });

  const { context } = (req.body || {}) as { context?: string };
  if (!context || typeof context !== 'string') return res.status(200).json({ items: [] });

  try {
    const r = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: buildPrompt(context) }],
        temperature: 0.9,
        max_tokens: 500,
      }),
    });
    if (!r.ok) return res.status(200).json({ items: [] });
    const data = await r.json();
    const items = parseRecos((extractOpenRouterText(data) || '').trim());
    return res.status(200).json({ items });
  } catch {
    return res.status(200).json({ items: [] });
  }
}

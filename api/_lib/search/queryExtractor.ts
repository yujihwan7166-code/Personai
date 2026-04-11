import { OPENROUTER_API_URL, getOpenRouterApiKey, getOpenRouterHeaders } from '../openrouter.js';

const EXTRACTOR_SYSTEM_PROMPT =
  '유저 메시지에서 웹 검색에 최적화된 검색 쿼리를 한국어로 추출해. 핵심 키워드 위주로 짧게, 검색엔진에 넣기 좋은 형태로. 쿼리만 출력해. 추가 설명 금지.';

/**
 * 유저 메시지 → 검색 최적화 쿼리 추출
 * 예: "이란이랑 미국 전쟁 날까요?" → "이란 미국 전쟁 가능성 2026"
 */
export async function extractSearchQuery(message: string): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return message; // 폴백: 원본 메시지 그대로

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: EXTRACTOR_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 30,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return message;

    const data = await response.json();
    const query = (data.choices?.[0]?.message?.content || '').trim();
    return query || message;
  } catch {
    clearTimeout(timeout);
    return message; // 에러 시 원본 메시지 사용
  }
}

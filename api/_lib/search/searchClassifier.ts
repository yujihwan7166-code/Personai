import { OPENROUTER_API_URL, getOpenRouterApiKey, getOpenRouterHeaders } from '../openrouter.js';

const CLASSIFIER_SYSTEM_PROMPT =
  '너는 메시지 분류기야. 유저 메시지가 최신 실시간 정보(뉴스, 시세, 날씨, 인물 근황, 최근 사건, 현재 상태)를 필요로 하면 YES, 아니면 NO만 답해. 한 글자만 답해.';

/**
 * 2단계: 경량 LLM으로 검색 필요 여부 판별
 * UNCERTAIN인 메시지만 들어옴
 */
export async function classifySearchNeed(message: string): Promise<boolean> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 3,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return false;

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
    return text.includes('YES');
  } catch {
    clearTimeout(timeout);
    return false; // 에러 시 안전하게 검색 불필요 처리
  }
}

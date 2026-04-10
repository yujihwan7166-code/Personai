import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractJsonObject,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { input, mode } = req.body || {};

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'input is required' });
  }

  const validModes = ['standard', 'procon', 'brainstorm', 'hearing', 'freetalk'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  const modeDescriptions: Record<string, string> = {
    standard: '여러 전문가가 3라운드로 깊이 있게 토론하는 일반 토론',
    procon: '찬성과 반대가 선명해야 하는 찬반 토론',
    brainstorm: '자유롭게 아이디어를 발산하는 브레인스토밍',
    hearing: '전문가 질문으로 아이디어를 검증하는 검증 토론',
    freetalk: '여러 AI가 자유롭게 대화를 이어가는 자유 토론',
  };

  const proconPrompt = `사용자 입력: "${input}"
모드: 찬반 토론

입력을 바탕으로 찬성과 반대로 명확히 갈릴 수 있는 토론 명제 3개를 제안하라.

규칙:
- 반드시 "~해야 하는가", "~에 찬성하는가", "~가 옳은가"처럼 찬반이 가능한 문장으로 쓴다.
- 너무 막연한 주제는 피한다.
- 사용자의 원래 입력과 가장 가까운 명제를 1번에 둔다.
- description은 "찬성: ... vs 반대: ..." 형식으로 짧게 쓴다.

반드시 JSON만 출력:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "명제 1", "description": "찬성: ... vs 반대: ..."},
    {"topic": "명제 2", "description": "찬성: ... vs 반대: ..."},
    {"topic": "명제 3", "description": "찬성: ... vs 반대: ..."}
  ]
}`;

  const freetalkPrompt = `사용자 입력: "${input}"
모드: 자유 토론

입력과 같은 범위 안에서 자유 토론용 주제 3개를 제안하라.

규칙:
- 사용자가 준 핵심 키워드를 벗어나지 않는다.
- 1번은 원래 입력에 가장 가깝게, 2번과 3번은 같은 주제의 다른 각도로 만든다.
- description은 "관점: ..." 형식으로 짧게 쓴다.

반드시 JSON만 출력:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "주제 1", "description": "관점: ..."},
    {"topic": "주제 2", "description": "관점: ..."},
    {"topic": "주제 3", "description": "관점: ..."}
  ]
}`;

  const standardPrompt = `사용자 입력: "${input}"
모드: 일반 토론

입력을 더 토론하기 좋은 형태로 구체화한 주제 3개를 제안하라.

규칙:
- 사용자의 원문과 가장 가까운 주제를 1번에 둔다.
- 나머지 2개는 같은 주제를 다른 시각으로 구체화한다.
- description은 "핵심 쟁점: ..." 형식으로 쓴다.

반드시 JSON만 출력:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "주제 1", "description": "핵심 쟁점: ..."},
    {"topic": "주제 2", "description": "핵심 쟁점: ..."},
    {"topic": "주제 3", "description": "핵심 쟁점: ..."}
  ]
}`;

  const hearingPrompt = `사용자 입력: "${input}"
모드: 아이디어 검증

검증 가능한 형태의 주제 3개를 제안하라.

규칙:
- "~가 실현 가능한가", "~에 시장성이 있는가"처럼 검증 질문이 붙는 형태로 만든다.
- description은 "검증 포인트: ..." 형식으로 쓴다.

반드시 JSON만 출력:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "검증 주제 1", "description": "검증 포인트: ..."},
    {"topic": "검증 주제 2", "description": "검증 포인트: ..."},
    {"topic": "검증 주제 3", "description": "검증 포인트: ..."}
  ]
}`;

  const defaultPrompt = `사용자 입력: "${input}"
모드 설명: ${modeDescriptions[mode] || '토론'}

토론하기 좋은 주제 3개를 제안하라.

반드시 JSON만 출력:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "구체적인 주제 1", "description": "설명"},
    {"topic": "구체적인 주제 2", "description": "설명"},
    {"topic": "구체적인 주제 3", "description": "설명"}
  ]
}`;

  const promptMap: Record<string, string> = {
    procon: proconPrompt,
    freetalk: freetalkPrompt,
    standard: standardPrompt,
    hearing: hearingPrompt,
  };
  const prompt = promptMap[mode] || defaultPrompt;

  try {
    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 512,
      }),
    });

    if (!openRouterRes.ok) {
      if (openRouterRes.status === 429) {
        return res.status(429).json({ error: 'API 요청 한도를 초과했어요.' });
      }
      console.error('[clarify-topic] upstream error:', await openRouterRes.text());
      return res.status(openRouterRes.status).json({ error: '주제 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }

    const data = await openRouterRes.json();
    const result = extractJsonObject(extractOpenRouterText(data));
    if (!result) {
      return res.status(200).json({ is_clear: true, original: input, refined: input, suggestions: [] });
    }

    return res.status(200).json(result);
  } catch {
    return res.status(200).json({ is_clear: true, original: input, refined: input, suggestions: [] });
  }
}

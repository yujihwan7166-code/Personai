import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
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
    standard: '심층 토론 — 여러 전문가가 3라운드에 걸쳐 깊이 있게 토론합니다',
    procon: '찬반 토론 — 찬성과 반대로 나뉘어 논쟁합니다. 명확한 찬반 명제가 필요합니다',
    brainstorm: '브레인스토밍 — 자유롭게 아이디어를 발산합니다. 구체적인 목표나 문제가 필요합니다',
    hearing: '아이디어 검증 — 전문가들이 날카로운 질문으로 검증합니다. 검증할 대상이 필요합니다',
    freetalk: '자유 토론 — 여러 AI가 자유롭게 의견을 교환하며 깊이 있는 대화를 나눕니다',
  };

  const proconPrompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "찬반 토론" 모드입니다.

사용자의 입력을 분석하여, 찬성과 반대로 명확히 나뉠 수 있는 토론 명제 3개를 만드세요.

## 핵심 규칙
1. 반드시 "~해야 하는가?", "~에 찬성하는가?", "~은 옳은가?" 같은 **찬반이 갈리는 명제** 형태여야 합니다.
2. 각 명제는 찬성 측과 반대 측의 논거가 명확히 존재해야 합니다.
3. 너무 뻔한 주제(예: "살인은 나쁜가?")는 피하고, 실제로 의견이 갈리는 현실적 주제로 만드세요.
4. 사용자 입력이 이미 좋은 명제면 문장만 다듬어서 1번에 거의 그대로 넣고, 관련된 다른 각도의 명제 2개를 추가하세요.
5. 사용자 입력이 모호하면 (예: "AI", "교육") 그 키워드에서 파생되는 날카로운 찬반 명제 3개를 만드세요. 입력 키워드는 반드시 포함.
6. description에는 "찬성: ~~ vs 반대: ~~" 형태로 양측 핵심 논점을 한 줄로 요약하세요.

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "명제 1", "description": "찬성: 핵심논점 vs 반대: 핵심논점"},
    {"topic": "명제 2", "description": "찬성: 핵심논점 vs 반대: 핵심논점"},
    {"topic": "명제 3", "description": "찬성: 핵심논점 vs 반대: 핵심논점"}
  ]
}

※ is_clear는 항상 false로 설정하세요. 찬반토론은 반드시 명제 선택 과정을 거칩니다.
※ 한국어로만 작성하세요.`;

  const freetalkPrompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "자유 토론" 모드입니다. 여러 AI 전문가가 자유롭게 의견을 교환합니다.

## 절대 규칙
- **사용자가 입력한 주제의 범위를 벗어나지 마세요.** 비약적 확장, 철학적 일반화, 관련 없는 주제로의 도약을 금지합니다.
- 사용자가 "유가"라고 하면 유가에 대한 토론 주제만, "AI"라고 하면 AI에 대한 토론 주제만 만드세요.
- 3개 모두 사용자 입력 키워드가 주제 안에 직접 포함되어야 합니다.

## 주제 설계 기준
1. **1번**: 사용자 입력이 이미 구체적인 질문/명제면 문장만 다듬어서 거의 그대로 넣으세요. 모호하면 가장 직접적으로 구체화.
2. **2번**: 같은 주제 안에서 살짝 다른 각도 (예: 원인 vs 결과, 단기 vs 장기, 국내 vs 해외)
3. **3번**: 같은 주제의 실생활 영향이나 실무적 측면
4. "~에 대해 토론" 같은 모호한 표현 금지. "~은 ~인가?", "~의 ~는 ~할까?" 같은 구체적 질문 형태로.
5. description에는 "쟁점: 어떤 관점들이 갈리는지"를 한 줄로.

## 나쁜 예시 (금지)
- 입력 "유가" → "자본주의 시스템의 지속가능성은?" (너무 비약)
- 입력 "AI" → "인간 존재의 의미는 무엇인가?" (주제 이탈)

## 좋은 예시
- 입력 "유가" → "국제 유가는 올해 하반기에 상승할까 하락할까?"
- 입력 "AI" → "AI가 화이트칼라 직종을 5년 내에 대체할 수 있을까?"

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "주제 1", "description": "쟁점: ~~"},
    {"topic": "주제 2", "description": "쟁점: ~~"},
    {"topic": "주제 3", "description": "쟁점: ~~"}
  ]
}

※ is_clear는 항상 false.
※ 한국어로만 작성하세요.`;

  const standardPrompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "심층 토론" 모드입니다. 여러 전문가가 3라운드에 걸쳐 깊이 있게 토론합니다.

## 규칙
1. 사용자 입력이 이미 구체적이면 문장만 다듬어서 1번에 거의 그대로 넣으세요. 나머지 2개는 같은 주제의 다른 각도.
2. 입력 키워드를 벗어나지 마세요. 3개 모두 사용자 입력 키워드가 포함되어야 합니다.
3. 각 주제는 전문가들이 서로 다른 관점에서 논쟁할 수 있어야 합니다.
4. description에는 "핵심 쟁점: ~~"을 한 줄로 요약하세요.
4. 너무 광범위한 주제는 좁혀서 구체적으로 만드세요.

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "주제 1", "description": "핵심 쟁점: ~~"},
    {"topic": "주제 2", "description": "핵심 쟁점: ~~"},
    {"topic": "주제 3", "description": "핵심 쟁점: ~~"}
  ]
}
※ 한국어로만 작성하세요.`;

  const hearingPrompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "아이디어 검증" 모드입니다. 전문가들이 날카로운 질문으로 아이디어를 검증합니다.

## 규칙
1. 사용자 입력에서 검증 가능한 구체적 아이디어/가설 3개를 추출하세요.
2. 각 제안은 "~라는 아이디어는 실현 가능한가?", "~서비스의 시장성이 있을까?" 같은 검증 가능한 형태여야 합니다.
3. description에는 "검증 포인트: ~~"를 한 줄로 요약하세요.

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "검증 주제 1", "description": "검증 포인트: ~~"},
    {"topic": "검증 주제 2", "description": "검증 포인트: ~~"},
    {"topic": "검증 주제 3", "description": "검증 포인트: ~~"}
  ]
}
※ 한국어로만 작성하세요.`;

  const defaultPrompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "${modeDescriptions[mode] || '토론'}" 모드입니다.

구체적인 주제 3개를 제안하세요.

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": false,
  "original": "${input}",
  "suggestions": [
    {"topic": "구체적 주제 1", "description": "한 줄 설명"},
    {"topic": "구체적 주제 2", "description": "한 줄 설명"},
    {"topic": "구체적 주제 3", "description": "한 줄 설명"}
  ]
}
※ 한국어로만 작성하세요.`;

  const promptMap: Record<string, string> = {
    procon: proconPrompt,
    freetalk: freetalkPrompt,
    standard: standardPrompt,
    hearing: hearingPrompt,
  };
  const prompt = promptMap[mode] || defaultPrompt;

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: 'API 요청 한도 초과' });
      }
      return res.status(geminiRes.status).json({ error: await geminiRes.text() });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ is_clear: true, original: input, refined: input, suggestions: [] });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    // 에러 시 그냥 통과 (주제 구체화 실패해도 토론은 가능)
    return res.status(200).json({ is_clear: true, original: input, refined: input, suggestions: [] });
  }
}

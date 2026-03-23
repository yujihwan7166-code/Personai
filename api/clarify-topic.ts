import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { input, mode } = req.body;

  const modeDescriptions: Record<string, string> = {
    standard: '심층 토론 — 여러 전문가가 3라운드에 걸쳐 깊이 있게 토론합니다',
    procon: '찬반 토론 — 찬성과 반대로 나뉘어 논쟁합니다. 명확한 찬반 명제가 필요합니다',
    brainstorm: '브레인스토밍 — 자유롭게 아이디어를 발산합니다. 구체적인 목표나 문제가 필요합니다',
    hearing: '아이디어 검증 — 전문가들이 날카로운 질문으로 검증합니다. 검증할 대상이 필요합니다',
  };

  const prompt = `사용자가 "${input}"이라고 입력했습니다.
이것은 "${modeDescriptions[mode] || '토론'}" 모드입니다.

이 입력이 해당 모드에서 바로 사용할 수 있을 만큼 구체적인지 판단하세요.

1. 이미 충분히 구체적이면 (예: "AI가 인간의 일자리를 대체할 것인가?") → is_clear: true
2. 너무 모호하면 (예: "유가", "AI", "경제") → is_clear: false, 구체적인 주제 3개 제안

다음 JSON 형식으로만 답변하세요:
{
  "is_clear": true 또는 false,
  "original": "원래 입력",
  "refined": "구체화된 주제 (is_clear가 true일 때)",
  "suggestions": [
    {"topic": "구체적 주제 1", "description": "한 줄 설명"},
    {"topic": "구체적 주제 2", "description": "한 줄 설명"},
    {"topic": "구체적 주제 3", "description": "한 줄 설명"}
  ]
}

규칙:
- ${mode === 'procon' ? '찬반으로 나눌 수 있는 명제 형태로 제안하세요 (예: "~해야 하는가?", "~은 ~보다 나은가?")' : ''}
- ${mode === 'brainstorm' ? '아이디어를 낼 수 있는 구체적 방향을 제안하세요 (예: "~를 개선하는 방법", "~를 위한 아이디어")' : ''}
- ${mode === 'hearing' ? '검증 가능한 구체적 주장이나 아이디어를 제안하세요' : ''}
- ${mode === 'standard' ? '다양한 관점에서 토론할 수 있는 주제를 제안하세요' : ''}
- 제안은 반드시 한국어로, 흥미롭고 현실적인 주제로 작성하세요`;

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

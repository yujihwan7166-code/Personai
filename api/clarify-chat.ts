import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { message, expertName, expertDescription, previousResponses, attempt } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(200).json({ type: 'answer' });
  }

  // 이전 대화가 있으면 (이어가기 중) 명확화 불필요
  if (previousResponses && previousResponses.length > 0) {
    return res.status(200).json({ type: 'answer' });
  }

  const isFollowUp = (attempt || 1) >= 2;

  const prompt = `당신은 사용자의 질문 의도를 정확히 파악하는 전문 분석가입니다.

사용자 질문: "${message}"
답변할 AI: "${expertName}" (${expertDescription})
${isFollowUp ? '⚠️ 이것은 2차 확인입니다. 이미 1차 선택지를 통해 범위가 좁혀진 질문입니다.' : ''}

## 판단 기준

### 반드시 명확화가 필요한 경우 (질문하세요):
1. **동음이의어/다의어**: "유가" (석유 가격 vs 儒家), "배" (과일/선박/신체), "사과" (과일/apology)
2. **범위가 너무 넓은 질문**: "경제 전망", "건강 관리" — 어떤 측면인지 특정 필요
3. **맥락 의존적 추천**: "좋은 노트북", "투자 어디에" — 용도/예산/수준 모름
4. **전문 분야 세분화**: "법률 상담" (민사/형사/가족법), "프로그래밍" (언어/분야)
5. **시간/지역 범위 모호**: "날씨", "부동산" — 언제/어디인지

### 명확화 불필요 (바로 답변하세요):
1. 이미 구체적인 질문: "파이썬으로 정렬 알고리즘 구현", "비트코인 블록체인 원리"
2. 괄호 등으로 이미 맥락 제공됨: "유가 (국제 유가, 단기)"
3. 단순 사실/정의: "GDP란?", "지구 둘레"
4. 인사/잡담: "안녕", "뭐해?"
5. 감정/의견 표현: "요즘 힘들어", "AI가 무서워"
${isFollowUp ? '6. 이미 1차에서 범위가 좁혀졌으므로, 추가 질문이 진짜 답변 품질을 크게 바꿀 때만 질문하세요. 대부분은 바로 답변해야 합니다.' : ''}

## 출력 형식 (JSON만)

명확화 필요:
{
  "type": "clarifying_questions",
  "message": "자연스러운 안내 (예: '어떤 유가를 말씀하시는 건지 확인할게요')",
  "questions": [
    {
      "id": "q1",
      "question": "핵심 질문 (구체적으로)",
      "options": [
        {"label": "선택지명 (8자 이내)", "value": "구체적 내부값"}
      ]
    }
  ]
}

불필요: {"type": "answer"}

## 규칙
- 질문은 최대 ${isFollowUp ? '1개 (2차는 정말 필요한 것만)' : '2개'}
- 선택지는 2~4개 (가장 가능성 높은 순서로)
- label은 짧고 직관적 (8자 이내)
- value는 실제 의미를 담은 구체적 값
- "기타" 선택지는 꼭 필요할 때만: {"label": "직접 입력", "value": "__custom__"}
- 한국어로 작성
- 질문이 모호하지 않다면 반드시 {"type": "answer"} 반환`;

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      return res.status(200).json({ type: 'answer' }); // 실패 시 바로 답변
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return res.status(200).json({ type: 'answer' });

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch {
    return res.status(200).json({ type: 'answer' }); // 에러 시 바로 답변
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { message, expertName, expertDescription, previousResponses } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(200).json({ type: 'answer' });
  }

  // 이전 대화가 있으면 (이어가기 중) 명확화 불필요
  if (previousResponses && previousResponses.length > 0) {
    return res.status(200).json({ type: 'answer' });
  }

  const prompt = `사용자가 AI 챗봇에게 "${message}"라고 질문했습니다.
이 챗봇은 "${expertName}" (${expertDescription})입니다.

이 질문이 바로 답변할 수 있을 만큼 명확한지 판단하세요.

명확화가 필요한 경우:
- 주제나 분야가 여러 가지로 해석될 수 있을 때
- 사용자의 수준/상황을 모르면 답변 품질이 크게 달라질 때
- 추천/비교를 요청하지만 기준이 불분명할 때
- "좋은", "저렴한", "빠른" 등 주관적 기준이 포함된 경우

명확화가 불필요한 경우 (바로 답변):
- 의도가 명확한 질문
- 단순 사실 확인
- 인사, 잡담
- 이미 충분한 맥락이 제공된 경우

다음 JSON 형식으로만 답변하세요:

명확화 필요 시:
{
  "type": "clarifying_questions",
  "message": "사용자에게 보여줄 안내 메시지 (1문장, 친근하게)",
  "questions": [
    {
      "id": "q1",
      "question": "질문 텍스트",
      "options": [
        {"label": "선택지 (10자 이내)", "value": "내부값"},
        {"label": "선택지", "value": "내부값"}
      ]
    }
  ]
}

명확화 불필요 시:
{"type": "answer"}

규칙:
- 질문은 최대 2개
- 선택지는 2~4개 + 선택적으로 {"label": "기타 (직접 설명)", "value": "__custom__"}
- label은 짧고 명확하게 (10자 이내)
- 한국어로 작성`;

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

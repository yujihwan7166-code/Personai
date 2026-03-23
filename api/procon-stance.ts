import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { question, experts } = req.body;

  const prompt = `당신은 찬반 토론의 사회자입니다. 주어진 주제와 전문가 목록을 보고, 각 전문가가 어느 쪽 입장을 대변하면 좋을지 배정해주세요.

주제: "${question}"

전문가 목록:
${experts.map((e: any) => `- ID: ${e.id}, 이름: ${e.nameKo}, 설명: ${e.description}`).join('\n')}

다음 JSON 형식으로만 답변하세요 (다른 텍스트 없이 순수 JSON만):
{
  "analysis": "주제에 대한 간단한 분석 (1-2문장)",
  "assignments": [
    {"expertId": "id값", "stance": "pro 또는 con", "reason": "이 전문가가 해당 입장인 이유 (1문장)"}
  ]
}

규칙:
- 찬성(pro)과 반대(con) 인원을 최대한 균등하게 배분하세요.
- 각 전문가의 전문성과 특성을 고려하여 자연스러운 입장을 배정하세요.
- 반드시 모든 전문가에게 입장을 배정하세요.`;

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      }
      const error = await geminiRes.text();
      return res.status(geminiRes.status).json({ error });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (handle markdown code blocks)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse stance assignments' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

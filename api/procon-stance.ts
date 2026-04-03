import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildGeminiUrl, extractGeminiText, extractJsonObject } from './_lib/gemini';

interface ExpertAssignmentCandidate {
  id: string;
  nameKo: string;
  description: string;
}

interface ProconStanceResult {
  debateTopic: string;
  analysis: string;
  assignments: Array<{
    expertId: string;
    stance: 'pro' | 'con';
    reason: string;
  }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { question, experts } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  if (!Array.isArray(experts) || experts.length === 0) {
    return res.status(400).json({ error: 'experts array is required' });
  }

  const prompt = `당신은 찬반 토론의 사회자입니다. 두 가지 역할이 있습니다:

1. 사용자의 주제를 "~해야 한다" 또는 "~에 찬성/반대한다" 형태의 찬반 명제로 변환
2. 각 전문가에게 찬성/반대 입장 배정

## 주제 변환 예시
- "국제 유가 전망" → "국제 유가는 향후 1년 내 상승할 것이다"
- "AI가 일자리를 대체할까?" → "AI가 인간의 일자리를 대체해야 한다"
- "원격근무 vs 사무실" → "원격근무를 확대해야 한다"
- "비트코인 투자" → "비트코인에 적극 투자해야 한다"
- "사형제도" → "사형제도를 유지해야 한다"
- 이미 찬반 형태면 그대로 사용

사용자 주제: "${question}"

전문가 목록:
${(experts as ExpertAssignmentCandidate[]).map((e) => `- ID: ${e.id}, 이름: ${e.nameKo}, 설명: ${e.description}`).join('\n')}

다음 JSON 형식으로만 답변하세요 (다른 텍스트 없이 순수 JSON만):
{
  "debateTopic": "변환된 찬반 명제 ("~해야 한다" 형태)",
  "analysis": "주제에 대한 간단한 분석 (1-2문장)",
  "assignments": [
    {"expertId": "id값", "stance": "pro 또는 con", "reason": "이 전문가가 해당 입장인 이유 (1문장)"}
  ]
}

규칙:
- debateTopic은 반드시 "~해야 한다" 또는 "~할 것이다" 형태로. 찬성/반대가 자연스러운 문장.
- 찬성(pro)과 반대(con) 인원을 최대한 균등하게 배분하세요.
- 각 전문가의 전문성과 특성을 고려하여 자연스러운 입장을 배정하세요.
- 반드시 모든 전문가에게 입장을 배정하세요.`;

  const model = 'gemini-2.5-flash-lite';
  const url = buildGeminiUrl(model, apiKey);

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
    const result = extractJsonObject<ProconStanceResult>(extractGeminiText(data));

    if (!result) {
      return res.status(500).json({ error: 'Failed to parse stance assignments' });
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

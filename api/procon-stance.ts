import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractJsonObject,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

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

  const apiKey = getOpenRouterApiKey();
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

  const prompt = `너는 찬반 토론 사회자다. 해야 할 일은 두 가지다.

1. 사용자 주제를 "~해야 한다" 또는 "~에 찬성/반대한다" 형태의 찬반 명제로 바꾼다.
2. 각 전문가에게 찬성(pro) 또는 반대(con) 입장을 배정한다.

사용자 주제: "${question}"

전문가 목록:
${(experts as ExpertAssignmentCandidate[]).map((e) => `- ID: ${e.id}, 이름: ${e.nameKo}, 설명: ${e.description}`).join('\n')}

다음 JSON만 출력:
{
  "debateTopic": "변환된 찬반 명제",
  "analysis": "주제에 대한 짧은 분석",
  "assignments": [
    {"expertId": "id값", "stance": "pro", "reason": "배정 이유"}
  ]
}

규칙:
- debateTopic은 반드시 찬반이 가능한 문장으로 만든다.
- 찬성과 반대 인원은 가능한 한 균등하게 나눈다.
- 모든 전문가에게 빠짐없이 입장을 배정한다.`;

  try {
    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!openRouterRes.ok) {
      if (openRouterRes.status === 429) {
        return res.status(429).json({ error: 'API 요청 시도를 초과했습니다. 잠시 후 다시 시도해 주세요.' });
      }
      console.error('[procon-stance] upstream error:', await openRouterRes.text());
      return res.status(openRouterRes.status).json({ error: '입장 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }

    const data = await openRouterRes.json();
    const result = extractJsonObject<ProconStanceResult>(extractOpenRouterText(data));

    if (!result) {
      return res.status(500).json({ error: 'Failed to parse stance assignments' });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('[procon-stance] unexpected error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}

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

  const prompt = `당신은 사용자의 의도를 정확히 파악하여 최고 품질의 답변을 제공하기 위한 분석 시스템입니다.

사용자 질문: "${message}"
답변할 AI: "${expertName}" (${expertDescription})
${isFollowUp ? '⚠️ 이것은 2차 확인입니다. 이미 1차 선택지를 통해 범위가 좁혀진 질문입니다. 대부분 바로 답변해야 합니다.' : ''}

## STEP 1: 내부 점수 분석

아래 5가지 항목을 체크하세요. 해당하면 +1점:

| 항목 | 조건 |
|------|------|
| 해석 분기 | 요청이 2가지 이상으로 해석 가능한가? |
| 핵심 정보 누락 | 대상, 목적, 조건 중 하나 이상 빠져 있는가? |
| 결과물 민감도 | 가정이 틀리면 결과물을 처음부터 다시 만들어야 하는가? |
| 고비용 작업 | 코드 생성, 긴 글 작성 등 재작업 비용이 큰 작업인가? |
| 개인화 필요 | 사용자의 상황/선호에 따라 답이 크게 달라지는가? |

## STEP 2: 점수에 따른 행동

**0점**: 바로 답변 → {"type": "answer"}
**1점**: 가정 명시 답변 → {"type": "answer_with_assumption", "assumption": "~라고 가정하고 답변합니다. 다른 조건이 있으면 말씀해주세요."}
**2점 이상**: 부분 답변 + 질문 → clarifying_questions (아래 형식)

${isFollowUp ? '※ 2차에서는 1점 이하가 대부분입니다. 2점 이상이 정말 확실할 때만 질문하세요.' : ''}

## STEP 3: 질문 원칙 (2점 이상일 때만)

1. **임팩트 기반**: "답변이 가장 크게 달라지는" 질문만. 사소한 차이만 만드는 질문 금지.
2. **가정 제시 + 확인**: 맨땅에 질문하지 말고, 내가 하려던 가정을 기본값으로 보여주세요.
   나쁜 예: "어떤 언어로 할까요?"
   좋은 예: 기본값으로 "Python"을 제시하고 다른 걸 원하면 선택하게
3. **부분 답변 포함**: 확실한 부분은 partialAnswer로 먼저 제공. 사용자가 빈손으로 기다리지 않게.
4. **질문 개수 제한**: 최대 ${isFollowUp ? '1개' : '2개'}. 1개로 충분하면 1개만.

## 출력 형식 (반드시 JSON만 출력, 다른 텍스트 금지)

### 0점 — 바로 답변:
{"type": "answer"}

### 1점 — 가정 명시 답변:
{"type": "answer_with_assumption", "assumption": "가정 내용을 한 문장으로. 예: Python 환경이라고 가정합니다."}

### 2점 이상 — 부분 답변 + 질문:
{
  "type": "clarifying_questions",
  "partialAnswer": "확실한 부분에 대한 간단한 설명 (1~2문장). 없으면 빈 문자열.",
  "message": "자연스러운 전환 문구 (예: '더 정확하게 맞추려면 하나만 확인할게요')",
  "questions": [
    {
      "id": "q1",
      "question": "핵심 질문 (가정을 포함해서. 예: 'React 기반인가요? 다른 프레임워크면 알려주세요.')",
      "options": [
        {"label": "선택지 (8자 이내)", "value": "구체적 내부값"}
      ]
    }
  ]
}

## 판단 예시

"투자 어떻게 해?" → 해석분기(주식/부동산/코인)+정보누락(금액/기간)+개인화(상황) = 3점 → clarifying_questions
"파이썬 정렬 방법" → 0점 → answer
"이메일 작성해줘" → 해석분기(퇴사/합격/요청)+정보누락(수신인)+결과물민감도 = 3점 → clarifying_questions
"경제 전망 어때?" → 정보누락(어떤 나라/지표)+개인화 = 2점 → clarifying_questions
"GPT란 뭐야?" → 0점 → answer
"코드 리뷰해줘" → 정보누락(어떤 코드?) = 1점 → answer_with_assumption ("공유해주신 코드를 기준으로 리뷰합니다")
"안녕" → 0점 → answer

한국어로 작성하세요.`;

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });

    if (!geminiRes.ok) {
      return res.status(200).json({ type: 'answer' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return res.status(200).json({ type: 'answer' });

    const result = JSON.parse(jsonMatch[0]);

    // 유효성 검증: type이 없거나 알 수 없는 타입이면 answer로 fallback
    if (!result.type || !['answer', 'answer_with_assumption', 'clarifying_questions'].includes(result.type)) {
      return res.status(200).json({ type: 'answer' });
    }

    return res.status(200).json(result);
  } catch {
    return res.status(200).json({ type: 'answer' });
  }
}

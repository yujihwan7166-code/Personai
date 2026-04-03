import type { VercelRequest, VercelResponse } from '@vercel/node';

type ClarifyOption = {
  label: string;
  value: string;
};

type ClarifyQuestion = {
  id: string;
  question: string;
  options: ClarifyOption[];
};

type ClarifyResult =
  | { type: 'answer' }
  | { type: 'answer_with_assumption'; assumption: string }
  | {
      type: 'clarifying_questions';
      partialAnswer?: string;
      message?: string;
      questions: ClarifyQuestion[];
    };

const MODEL = 'gemini-2.5-flash-lite';

function normalizeLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeQuestions(rawQuestions: unknown, maxQuestions: number): ClarifyQuestion[] {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .map((item, index) => {
      const question = normalizeLabel((item as { question?: unknown })?.question);
      const rawOptions = Array.isArray((item as { options?: unknown[] })?.options)
        ? ((item as { options?: unknown[] }).options as unknown[])
        : [];

      const options = rawOptions
        .map((opt, optionIndex) => {
          const label = normalizeLabel((opt as { label?: unknown })?.label);
          const value = normalizeLabel((opt as { value?: unknown })?.value) || label || `option_${optionIndex + 1}`;
          if (!label) return null;

          return {
            label: label.slice(0, 40),
            value: value.slice(0, 60),
          };
        })
        .filter((opt): opt is ClarifyOption => Boolean(opt))
        .slice(0, 4);

      if (!question || options.length < 2) return null;

      return {
        id: `q${index + 1}`,
        question: question.slice(0, 120),
        options,
      };
    })
    .filter((item): item is ClarifyQuestion => Boolean(item))
    .slice(0, maxQuestions);
}

function buildBrainstormPrompt(message: string, isFollowUp: boolean) {
  return `너는 브레인스토밍 세션을 준비하는 숙련된 퍼실리테이터다.

사용자 주제: "${message}"
${isFollowUp ? '이번은 2차 확인이다. 이미 한 번 좁혀졌으니 꼭 필요한 질문만 1~2개만 남겨라.' : ''}

목표:
- 사용자가 어떤 문제를 풀고 싶은지
- 아이디어를 누구에게 쓰려는지
- 어느 정도 현실성/제약을 갖고 싶은지
- 결과물을 어떤 형태로 원하고 있는지
를 빠르게 파악한다.

판단 규칙:
1. 바로 브레인스토밍을 시작해도 충분히 구체적이면 {"type":"answer"}.
2. 약간만 비어 있으면 묻지 말고 기본 가정을 세워 {"type":"answer_with_assumption"}.
3. 정말 결과 방향이 크게 달라질 때만 {"type":"clarifying_questions"}.

질문 품질 규칙:
- 질문은 최대 ${isFollowUp ? '2개' : '3개'}.
- 각 질문은 실제 아이디어 방향을 크게 바꾸는 것만 묻는다.
- 선택지는 3~4개, 짧고 구체적으로 만든다.
- "기타"는 절대 넣지 않는다.
- 추상적인 라벨 대신 바로 선택 가능한 표현을 쓴다.

반드시 JSON만 출력:
{
  "type": "answer" | "answer_with_assumption" | "clarifying_questions",
  "assumption": "필요할 때만",
  "message": "필요할 때만",
  "partialAnswer": "필요할 때만",
  "questions": [
    {
      "id": "q1",
      "question": "질문",
      "options": [
        { "label": "선택지", "value": "choice_1" }
      ]
    }
  ]
}`;
}

function buildGeneralPrompt(params: {
  message: string;
  expertName: string;
  expertDescription: string;
  isFollowUp: boolean;
}) {
  const { message, expertName, expertDescription, isFollowUp } = params;

  return `너는 사용자의 의도를 빨리 파악해서, 불필요한 되물음을 줄이고 필요한 경우에만 날카롭게 확인하는 AI 질의 분석기다.

사용자 질문: "${message}"
답변 AI: "${expertName}"
AI 설명: "${expertDescription}"
${isFollowUp ? '이번은 2차 확인이다. 이미 한 번 확인했으니, 진짜로 결과가 달라질 때만 한 개 정도만 묻는다.' : ''}

먼저 이 질문을 평가하라.

평가 기준:
- 범위가 여러 방향으로 갈릴 수 있는가
- 핵심 조건(기간, 지역, 대상, 예산, 목표, 형식)이 빠졌는가
- 빠진 조건 때문에 답이 크게 달라지는가
- 일단 답하면 엉뚱한 답이 될 가능성이 높은가

행동 규칙:
1. 바로 답해도 충분히 괜찮으면 {"type":"answer"}.
2. 작은 모호함만 있으면 되묻지 말고 기본 가정을 한 줄로 붙여 {"type":"answer_with_assumption"}.
3. 답이 크게 달라질 때만 {"type":"clarifying_questions"}.

명확화 질문 규칙:
- 질문은 최대 ${isFollowUp ? '1개' : '2개'}.
- 질문은 "결과를 가장 크게 바꾸는 축"부터 묻는다.
- 질문 문장에는 기본 가정이나 선택 축이 드러나야 한다.
- 선택지는 3~4개, 서로 겹치지 않게 만든다.
- 추상적인 라벨 금지. 예: "기술", "경제", "사회" 같은 넓은 말은 금지.
- 질문 예시는 구체적이어야 한다. 예: 유가 전망이면 "기간", "지역", "기준유종" 같은 축을 묻는다.
- 필요하면 "partialAnswer"에 지금 당장 말해줄 수 있는 핵심 한두 문장을 넣는다.

좋은 질문 예시:
- "어느 기간의 유가 전망을 원하시나요?" + 단기/중기/장기
- "한국 주식 기준으로 볼까요, 미국 주식 기준으로 볼까요?" + 한국/미국/글로벌
- "실행용 코드가 필요하신가요, 개념 설명이 필요하신가요?" + 실행 코드/설명/비교

나쁜 질문 예시:
- "좀 더 자세히 말해주세요"
- "무슨 뜻인가요?"
- "어떤 걸 원하시나요?"

반드시 JSON만 출력:
{
  "type": "answer" | "answer_with_assumption" | "clarifying_questions",
  "assumption": "필요할 때만",
  "partialAnswer": "필요할 때만",
  "message": "필요할 때만",
  "questions": [
    {
      "id": "q1",
      "question": "질문",
      "options": [
        { "label": "선택지", "value": "choice_1" }
      ]
    }
  ]
}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { message, expertName, expertDescription, previousResponses, attempt, mode } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(200).json({ type: 'answer' });
  }

  if (Array.isArray(previousResponses) && previousResponses.length > 0) {
    return res.status(200).json({ type: 'answer' });
  }

  if (mode === 'stakeholder-context') {
    return res.status(200).json({ type: 'answer' });
  }

  const isFollowUp = Number(attempt || 1) >= 2;
  const isBrainstorm = mode === 'brainstorm';
  const prompt = isBrainstorm
    ? buildBrainstormPrompt(message, isFollowUp)
    : buildGeneralPrompt({
        message,
        expertName: typeof expertName === 'string' ? expertName : 'AI',
        expertDescription: typeof expertDescription === 'string' ? expertDescription : '',
        isFollowUp,
      });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 700 },
      }),
    });

    if (!geminiRes.ok) {
      return res.status(200).json({ type: 'answer' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(200).json({ type: 'answer' });
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClarifyResult> & {
      questions?: unknown;
      assumption?: unknown;
      partialAnswer?: unknown;
      message?: unknown;
    };

    if (!parsed.type || !['answer', 'answer_with_assumption', 'clarifying_questions'].includes(parsed.type)) {
      return res.status(200).json({ type: 'answer' });
    }

    if (parsed.type === 'answer') {
      return res.status(200).json({ type: 'answer' });
    }

    if (parsed.type === 'answer_with_assumption') {
      const assumption = normalizeLabel(parsed.assumption);
      if (!assumption) {
        return res.status(200).json({ type: 'answer' });
      }

      return res.status(200).json({
        type: 'answer_with_assumption',
        assumption: assumption.slice(0, 180),
      });
    }

    const maxQuestions = isBrainstorm ? (isFollowUp ? 2 : 3) : (isFollowUp ? 1 : 2);
    const questions = normalizeQuestions(parsed.questions, maxQuestions);

    if (questions.length === 0) {
      return res.status(200).json({ type: 'answer' });
    }

    return res.status(200).json({
      type: 'clarifying_questions',
      partialAnswer: normalizeLabel(parsed.partialAnswer).slice(0, 280),
      message:
        normalizeLabel(parsed.message).slice(0, 100) ||
        (isBrainstorm ? '세션 방향을 더 잘 맞추기 위해 몇 가지만 확인할게요.' : '더 정확한 답변을 위해 핵심 조건만 짧게 확인할게요.'),
      questions,
    });
  } catch {
    return res.status(200).json({ type: 'answer' });
  }
}

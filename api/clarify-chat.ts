import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractJsonObject,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

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
  return `너는 브레인스토밍 세션 전에 필요한 정보를 빠르게 정리하는 조율자다.

사용자 주제: "${message}"
${isFollowUp ? '이번은 2차 확인이다. 이미 한 번 물었으니 진짜로 결과를 바꿀 질문만 1~2개만 해라.' : ''}

판단 규칙:
1. 바로 브레인스토밍을 시작해도 충분히 구체적이면 {"type":"answer"}.
2. 조금 모호하지만 기본 가정을 두고 진행 가능하면 {"type":"answer_with_assumption"}.
3. 답의 방향이 크게 바뀌는 핵심 정보가 빠졌을 때만 {"type":"clarifying_questions"}.

질문 규칙:
- 질문은 최대 ${isFollowUp ? '2개' : '3개'}.
- 각 질문은 결과를 실제로 바꿀 정보만 묻는다.
- 선택지는 2~4개, 서로 겹치지 않게 만든다.
- "기타"는 넣지 않는다.

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

  return `너는 사용자의 의도를 먼저 판별해서, 불필요한 되물음을 줄이고 정말 필요한 경우에만 짧고 날카롭게 확인하는 질문 분석기다.

사용자 질문: "${message}"
대답할 AI: "${expertName}"
AI 설명: "${expertDescription}"
${isFollowUp ? '이번은 2차 확인이다. 이미 한 번 물었으니 결과를 크게 바꾸는 질문만 최대 1개로 제한해라.' : ''}

판단 규칙:
1. 바로 답해도 충분하면 {"type":"answer"}.
2. 조금 모호하지만 안전한 기본 가정을 둘 수 있으면 {"type":"answer_with_assumption"}.
3. 답이 크게 달라질 핵심 조건이 비어 있을 때만 {"type":"clarifying_questions"}.

질문 규칙:
- 질문은 최대 ${isFollowUp ? '1개' : '2개'}.
- 결과를 바꾸는 정보만 묻는다.
- 선택지는 2~4개.
- 추상적인 표현 대신 기간, 예산, 지역, 목적, 결과 형식처럼 구체적인 축으로 묻는다.

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

  const apiKey = getOpenRouterApiKey();
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

  try {
    const openRouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.15,
        max_tokens: 700,
      }),
    });

    if (!openRouterRes.ok) {
      return res.status(200).json({ type: 'answer' });
    }

    const data = await openRouterRes.json();
    const parsed = extractJsonObject<Partial<ClarifyResult> & {
      questions?: unknown;
      assumption?: unknown;
      partialAnswer?: unknown;
      message?: unknown;
    }>(extractOpenRouterText(data));

    if (!parsed?.type || !['answer', 'answer_with_assumption', 'clarifying_questions'].includes(parsed.type)) {
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
        (isBrainstorm ? '방향을 더 잘 맞추기 위해 몇 가지만 확인할게요.' : '더 정확한 답변을 위해 핵심 조건만 확인할게요.'),
      questions,
    });
  } catch {
    return res.status(200).json({ type: 'answer' });
  }
}

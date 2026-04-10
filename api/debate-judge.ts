import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractJsonObject,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

interface DebateArgument {
  name: string;
  argument: string;
}

interface DebateJudgeResult {
  user_score?: { logic?: number; evidence?: number; persuasion?: number; rebuttal?: number; expression?: number; total?: number };
  ai_score?: { logic?: number; evidence?: number; persuasion?: number; rebuttal?: number; expression?: number; total?: number };
  round_winner?: 'user' | 'ai' | 'draw';
  comment?: string;
  user_feedback?: string;
  final_winner?: 'user' | 'ai' | 'draw';
  final_score?: { user: number; ai: number };
  overall_comment?: string;
  user_strengths?: string[];
  user_improvements?: string[];
  mvp_moment?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { topic, round, totalRounds, userStance, userArgument, aiArguments, previousJudgments, isFinal } = req.body || {};

  if (!topic || !userArgument) {
    return res.status(400).json({ error: 'topic and userArgument required' });
  }

  const stanceLabel = userStance === 'pro' ? '찬성' : '반대';
  const aiStanceLabel = userStance === 'pro' ? '반대' : '찬성';
  const aiArgStr = ((aiArguments || []) as DebateArgument[]).map((a) => `[${a.name}] ${a.argument}`).join('\n');
  const prevJudgStr = (previousJudgments || []).map((j: string, i: number) => `${i + 1}라운드: ${j}`).join('\n');

  const prompt = isFinal
    ? `너는 토론 최종 심판이다.

주제: ${topic}
사용자 입장: ${stanceLabel}
AI 입장: ${aiStanceLabel}
총 라운드 수: ${totalRounds}

이번 라운드 사용자 주장:
${userArgument}

이번 라운드 AI 주장:
${aiArgStr}

이전 판정:
${prevJudgStr || '없음'}

다음 JSON만 출력:
{
  "user_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "ai_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "round_winner": "user" | "ai" | "draw",
  "comment": "이번 라운드 평가",
  "final_winner": "user" | "ai" | "draw",
  "final_score": { "user": 0, "ai": 0 },
  "overall_comment": "전체 토론 총평",
  "user_strengths": ["강점1", "강점2"],
  "user_improvements": ["개선점1", "개선점2"],
  "mvp_moment": "가장 인상적이었던 순간"
}

평가 기준은 logic, evidence, persuasion, rebuttal, expression 각 10점 만점이다.`
    : `너는 토론 심판이다.

주제: ${topic}
현재 라운드: ${round}/${totalRounds}
사용자 입장: ${stanceLabel}
AI 입장: ${aiStanceLabel}

이번 라운드 사용자 주장:
${userArgument}

이번 라운드 AI 주장:
${aiArgStr}

${prevJudgStr ? `이전 판정:\n${prevJudgStr}\n` : ''}

다음 JSON만 출력:
{
  "user_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "ai_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "round_winner": "user" | "ai" | "draw",
  "comment": "이번 라운드 평가",
  "user_feedback": "사용자에게 줄 구체적인 조언"
}

평가 기준은 logic, evidence, persuasion, rebuttal, expression 각 10점 만점이다.`;

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
      return res.status(200).json(fallbackJudgment(Boolean(isFinal)));
    }

    const data = await openRouterRes.json();
    const result = extractJsonObject<DebateJudgeResult>(extractOpenRouterText(data));

    if (!result) {
      return res.status(200).json(fallbackJudgment(Boolean(isFinal)));
    }

    for (const key of ['user_score', 'ai_score'] as const) {
      if (!result[key]) {
        result[key] = { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 };
      }
      result[key]!.total =
        (result[key]!.logic || 0) +
        (result[key]!.evidence || 0) +
        (result[key]!.persuasion || 0) +
        (result[key]!.rebuttal || 0) +
        (result[key]!.expression || 0);
    }

    result.round_winner = result.round_winner || 'draw';
    result.comment = result.comment || '양측 모두 의미 있는 주장을 제시했습니다.';

    return res.status(200).json(result);
  } catch {
    return res.status(200).json(fallbackJudgment(Boolean(isFinal)));
  }
}

function fallbackJudgment(isFinal: boolean) {
  const base = {
    user_score: { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 },
    ai_score: { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 },
    round_winner: 'draw' as const,
    comment: '판정 중 오류가 발생해 무승부로 처리했습니다.',
    user_feedback: '다음 라운드에서는 더 구체적인 근거를 넣어보세요.',
  };

  if (isFinal) {
    return {
      ...base,
      final_winner: 'draw' as const,
      final_score: { user: 25, ai: 25 },
      overall_comment: '판정 시스템 오류로 전체 평가를 정확히 계산하지 못했습니다.',
      user_strengths: ['토론 참여'],
      user_improvements: ['더 구체적인 근거 제시'],
      mvp_moment: '토론 전체',
    };
  }

  return base;
}

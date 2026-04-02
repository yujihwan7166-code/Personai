import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { topic, round, totalRounds, userStance, userArgument, aiArguments, previousJudgments, isFinal } = req.body || {};

  if (!topic || !userArgument) {
    return res.status(400).json({ error: 'topic and userArgument required' });
  }

  const stanceLabel = userStance === 'pro' ? '찬성' : '반대';
  const aiStanceLabel = userStance === 'pro' ? '반대' : '찬성';

  const aiArgStr = (aiArguments || []).map((a: any) => `[${a.name}] ${a.argument}`).join('\n');
  const prevJudgStr = (previousJudgments || []).map((j: string, i: number) => `${i + 1}라운드: ${j}`).join('\n');

  let prompt: string;

  if (isFinal) {
    prompt = `당신은 토론 최종 판정관입니다. "${topic}" 주제에 대한 전체 토론을 평가합니다.

## 토론 정보
- 주제: ${topic}
- 유저 입장: ${stanceLabel}
- AI 입장: ${aiStanceLabel}
- 총 ${totalRounds}라운드 진행

## 이번(마지막) 라운드
유저(${stanceLabel}): ${userArgument}

AI(${aiStanceLabel}):
${aiArgStr}

## 이전 라운드 판정 기록
${prevJudgStr || '없음'}

## 최종 판정 지시
전체 토론을 종합 평가하여 다음 JSON을 반환하세요. 반드시 순수 JSON만 출력:

{
  "user_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "ai_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "round_winner": "user" | "ai" | "draw",
  "comment": "이번 라운드 한줄 평가",
  "final_winner": "user" | "ai" | "draw",
  "final_score": { "user": 0, "ai": 0 },
  "overall_comment": "전체 토론 총평 (3~4문장)",
  "user_strengths": ["강점1", "강점2"],
  "user_improvements": ["개선점1", "개선점2"],
  "mvp_moment": "토론 중 가장 인상적이었던 순간"
}

## 평가 기준 (각 10점 만점)
1. logic — 주장의 논리적 구조와 일관성
2. evidence — 구체적 데이터, 사례, 통계 활용
3. persuasion — 상대방과 청중을 납득시키는 힘
4. rebuttal — 상대 주장에 대한 효과적 반박
5. expression — 명확하고 효과적인 전달

## 판정 규칙
- 공정하게 판정하라. AI라고 봐주지 마라.
- 이전 라운드 판정을 참고하여 전체 흐름에서 평가
- final_score는 모든 라운드의 total 합산
- user_strengths, user_improvements는 유저 성장에 도움되는 피드백`;
  } else {
    prompt = `당신은 토론 판정관입니다. "${topic}" 주제의 ${round}/${totalRounds} 라운드를 평가합니다.

## 토론 정보
- 주제: ${topic}
- 유저 입장: ${stanceLabel}
- AI 입장: ${aiStanceLabel}
- 현재: ${round}라운드 / 총 ${totalRounds}라운드

## 이번 라운드 주장
유저(${stanceLabel}): ${userArgument}

AI(${aiStanceLabel}):
${aiArgStr}

${prevJudgStr ? `## 이전 라운드 판정\n${prevJudgStr}` : ''}

## 판정 지시
양측의 주장을 공정하게 평가하여 다음 JSON을 반환하세요. 반드시 순수 JSON만 출력:

{
  "user_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "ai_score": { "logic": 0, "evidence": 0, "persuasion": 0, "rebuttal": 0, "expression": 0, "total": 0 },
  "round_winner": "user" | "ai" | "draw",
  "comment": "이번 라운드 한줄 평가 (유저의 강점과 약점 모두 언급)",
  "user_feedback": "유저에게 주는 구체적 조언 (강점 1개 + 개선점 1개)"
}

## 평가 기준 (각 10점 만점)
1. logic — 주장의 논리적 구조와 일관성
2. evidence — 구체적 데이터, 사례, 통계 활용
3. persuasion — 상대방과 청중을 납득시키는 힘
4. rebuttal — 상대 주장에 대한 효과적 반박
5. expression — 명확하고 효과적인 전달

## 판정 규칙
- 공정하게. AI라고 봐주지 마라.
- total은 5개 항목의 합산 (50점 만점)
- ${round === 1 ? 'rebuttal은 첫 라운드이므로 주장의 선제적 반박 여부로 평가' : '이전 상대 주장에 대한 반박 효과성 평가'}
- comment는 "유저의 ~이 좋았으나, ~이 아쉬웠다" 형식으로`;
  }

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
      return res.status(200).json(fallbackJudgment(isFinal));
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(200).json(fallbackJudgment(isFinal));
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate scores
    for (const key of ['user_score', 'ai_score']) {
      if (!result[key]) result[key] = { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 };
      result[key].total = (result[key].logic || 0) + (result[key].evidence || 0) + (result[key].persuasion || 0) + (result[key].rebuttal || 0) + (result[key].expression || 0);
    }
    result.round_winner = result.round_winner || 'draw';
    result.comment = result.comment || '양측 모두 좋은 주장을 펼쳤습니다.';

    return res.status(200).json(result);
  } catch {
    return res.status(200).json(fallbackJudgment(isFinal));
  }
}

function fallbackJudgment(isFinal: boolean) {
  const base = {
    user_score: { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 },
    ai_score: { logic: 5, evidence: 5, persuasion: 5, rebuttal: 5, expression: 5, total: 25 },
    round_winner: 'draw' as const,
    comment: '판정 중 오류가 발생하여 무승부로 처리합니다.',
    user_feedback: '다음 라운드에서 더 구체적인 근거를 제시해보세요.',
  };
  if (isFinal) {
    return {
      ...base,
      final_winner: 'draw',
      final_score: { user: 25, ai: 25 },
      overall_comment: '판정 시스템 오류로 정확한 평가가 어렵습니다.',
      user_strengths: ['토론 참여'],
      user_improvements: ['더 구체적인 근거 제시'],
      mvp_moment: '토론 전체',
    };
  }
  return base;
}

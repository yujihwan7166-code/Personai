import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { scenario, intensity, conversationHistory, turnCount } = req.body || {};

  if (!scenario || !conversationHistory) {
    return res.status(400).json({ error: 'scenario and conversationHistory required' });
  }

  const roleNames = scenario.roles.map((r: any) => r.name).join(', ');
  const roleFocusDetail = scenario.roles.map((r: any) => `- ${r.name}: ${r.focus}`).join('\n');

  const prompt = `당신은 "${scenario.name}" 시뮬레이션의 진행자(오케스트레이터)입니다.
유저에게 직접 말하지 않습니다. 대화 흐름만 관리합니다.

## 시나리오 정보
- 시나리오: ${scenario.name}
- 유저 역할: ${scenario.userRole}
- 이해관계자: ${roleNames}
- 각 역할의 관심사:
${roleFocusDetail}
- 평가 지표: ${scenario.gaugeLabel}
- 최종 판정 옵션: ${scenario.verdictOptions.join(' / ')}
- 반응 강도: ${intensity}/10 (높을수록 날카로움)

## 현재 대화 기록 (${turnCount}턴)
${conversationHistory.map((m: any) => `[${m.speaker}] ${m.content}`).join('\n')}

## 지시사항
대화 기록을 분석하여 다음 JSON을 반환하세요. 반드시 순수 JSON만 출력하세요.

{
  "next_speaker": "역할명 (${roleNames} 중 하나)",
  "speak_direction": "이 역할이 어떤 방향으로 말해야 하는지 구체적 한줄 지시",
  "follow_up_speaker": "연달아 발언할 두 번째 역할. 없으면 null",
  "follow_up_direction": "두 번째 역할의 발언 방향. 없으면 null",
  "phase": "ongoing 또는 wrapping_up 또는 final",
  "reason": "왜 이 판단을 했는지 내부 메모"
}

## 핵심 판단 기준 (이 순서대로 판단하라)

### 1. 역할 교체 (최우선 — 반드시 지켜라)
- **같은 역할이 2턴 연속 발언했으면 → 반드시 다른 역할로 교체하라.** 이것은 절대 규칙이다.
- 유저가 답변했으면 대부분의 경우 다른 역할이 새 관점에서 질문해야 한다.
- 같은 역할이 연속하는 것은 유저 답변이 극도로 불충분할 때만 허용. 극도로 불충분한 기준: "네", "아니오", "ㅇㅇ", "ㅎ", 이모지만, 또는 질문과 전혀 관계없는 답변. 1~2문장이라도 내용이 있으면 충분한 것으로 판단하라.
- 대화 기록에서 마지막 AI 발언자를 확인하고, 가능하면 다른 역할을 next_speaker로 선택하라.

### 2. 정보 충분성 판단
유저의 마지막 답변이 현재 질문에 대해 충분한 정보를 제공했는가?
- **부족함** → 다른 역할이 같은 주제를 다른 각도에서 물어본다 (같은 역할이 또 묻지 않는다).
  - 예: VC가 시장 규모를 물었고 유저가 모호하게 답했으면 → 재무 심사역이 "구체적 수치로 말씀해주시겠어요?" 라고 다른 각도에서 파고듦
- **충분함** → 다른 역할이 완전히 새 주제로 전환.

### 3. follow_up_speaker
- 기본값은 null.
- 유저가 풍부한 답변을 해서 다른 역할이 즉시 반응할 내용이 있을 때만 사용.
- 짧은 답변 뒤에는 절대 2명이 나오지 않는다.

### 4. 기타
- 각 역할이 골고루 발언하도록 배분. 대화 기록에서 각 역할의 발언 횟수를 세고 적게 발언한 역할을 우선.
- 유저가 잘 답변하면 우호적 반응 가능 ("오 그거 좋은데요")
7. ${turnCount >= 12 ? '대화가 충분히 진행되었습니다. 마무리를 고려하세요. phase를 wrapping_up으로 전환할 수 있습니다.' : '아직 초중반입니다. phase는 ongoing으로 유지하세요.'}
8. ${turnCount >= 16 ? 'wrapping_up 단계입니다. 각 역할이 최종 입장을 밝히도록 유도하세요.' : ''}
9. wrapping_up에서 모든 역할이 최종 입장을 밝혔으면 → phase를 final로 전환

## 대화 흐름 가이드
- 초반(1~4턴): 사업 개요, 시장 규모, 핵심 가치 제안에 집중
- 중반(5~10턴): 수익 모델, 경쟁 우위, 팀 구성, 재무 계획 심화
- 후반(11~15턴): 리스크, 엑싯 전략, 밸류에이션 검증
- 마무리(16턴~): 최종 입장 정리

## speak_direction 작성 규칙
- 추상적이지 말고 구체적으로 작성 (예: "유저의 TAM 수치가 과대 추정인지 근거를 물어라" O, "시장에 대해 물어보세요" X)
- 이전 대화에서 언급된 구체적 내용을 참조하라 (예: "유저가 말한 월 매출 500만원의 성장률에 대해 파고들어라")`;

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok) {
      return res.status(200).json({
        next_speaker: scenario.roles[0]?.name || '',
        speak_direction: '유저의 답변에 대해 질문하세요.',
        follow_up_speaker: null,
        follow_up_direction: null,
        user_choices: [],
        phase: 'ongoing',
        reason: 'API error fallback',
      });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(200).json({
        next_speaker: scenario.roles[0]?.name || '',
        speak_direction: '유저의 답변에 대해 후속 질문을 하세요.',
        follow_up_speaker: null,
        follow_up_direction: null,
        user_choices: [],
        phase: 'ongoing',
        reason: 'Parse error fallback',
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!result.next_speaker || !result.speak_direction) {
      result.next_speaker = result.next_speaker || scenario.roles[0]?.name || '';
      result.speak_direction = result.speak_direction || '유저의 답변에 반응하세요.';
    }
    result.follow_up_speaker = result.follow_up_speaker || null;
    result.follow_up_direction = result.follow_up_direction || null;
    result.user_choices = result.user_choices || [];
    result.phase = result.phase || 'ongoing';

    return res.status(200).json(result);
  } catch {
    return res.status(200).json({
      next_speaker: scenario.roles[0]?.name || '',
      speak_direction: '유저의 답변에 대해 질문하세요.',
      follow_up_speaker: null,
      follow_up_direction: null,
      user_choices: [],
      phase: 'ongoing',
      reason: 'Exception fallback',
    });
  }
}

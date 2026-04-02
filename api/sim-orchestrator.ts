import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { scenario, intensity, conversationHistory, turnCount, mode, currentPhase } = req.body || {};

  if (!scenario || !conversationHistory) {
    return res.status(400).json({ error: 'scenario and conversationHistory required' });
  }

  // Consultation 모드: 순차 상담 전용 프롬프트
  if (mode === 'consultation' && currentPhase) {
    // 시나리오별 단계별 수집 체크리스트
    const phaseChecklists: Record<string, Record<string, string[]>> = {
      '의학 상담': {
        '접수 간호사': ['주 증상 (무엇이 불편한지)', '발병 시기 (언제부터)', '증상 정도 (1~10 통증 수준)', '긴급도 (일상 지장 여부)'],
        '전문의': ['과거 병력', '가족력', '증상 악화/완화 요인', '동반 증상'],
        '약사': ['현재 복용 약물', '알레르기 여부', '건강보조식품/한약'],
        '영양사': ['식습관 (끼니 횟수, 식단)', '음주/흡연', '운동 습관', '수면 패턴'],
      },
      '법률 상담': {
        '수석 변호사': ['사건 유형 (민사/형사/행정)', '분쟁 상대방', '시효 관련 날짜', '긴급 조치 필요 여부'],
        '사건 담당': ['사건 경위 (시간순)', '당사자 관계', '현재까지 조치', '보유 증거 목록'],
        '판례 연구원': ['핵심 법적 쟁점', '상대방 주장 근거', '유사 경험 여부'],
        '리스크 분석': ['원하는 결과', '감수 가능한 비용/기간', '합의 의향'],
      },
      '재무·투자 상담': {
        '재무설계사': ['월 소득/지출', '보유 자산 (예적금/부동산)', '부채 현황', '재무 목표'],
        '라이프플래너': ['연령대', '결혼/출산 계획', '주택 마련 계획', '은퇴 시기'],
        '투자 분석가': ['투자 경험', '리스크 수용도', '투자 가능 금액', '관심 투자 분야'],
        '세무사': ['소득 유형 (근로/사업/기타)', '현재 절세 전략', '연말정산 관련'],
      },
      '부동산 상담': {
        '부동산 컨설턴트': ['매수/매도/임대 목적', '예산 범위', '희망 지역', '입주 시기'],
        '시장 분석가': ['관심 매물 유형 (아파트/오피스텔/토지)', '투자/실거주', '대출 가능 여부'],
        '법률 전문가': ['기존 부동산 보유 현황', '공동명의 여부', '특수 계약 조건'],
        '세무사': ['보유 주택 수', '취득 시기', '양도 계획'],
      },
      '창업 상담': {
        '스타트업 멘토': ['사업 아이디어 핵심', '해결하려는 문제', '타겟 고객', '현재 진행 단계'],
        '시장 분석가': ['시장 규모 추정', '경쟁사/대안', '차별화 포인트'],
        '사업 전략가': ['수익 모델', '가격 정책', '초기 진입 전략', '핵심 지표(KPI)'],
        '재무 전문가': ['초기 자금 현황', '번레이트 예상', '투자 유치 계획', '손익분기 목표'],
      },
      '심리 상담': {
        '임상심리사': ['현재 가장 힘든 점', '지속 기간', '일상 영향도', '과거 상담 경험'],
        '상담심리사': ['대인관계 상황', '직장/학교 스트레스', '자존감 관련', '지지체계 (가족/친구)'],
        '정신건강의학 전문의': ['수면 패턴 (입면/각성)', '식욕 변화', '불안/우울 빈도', '신체 증상'],
        '마음챙김 코치': ['현재 스트레스 관리법', '취미/이완 활동', '운동 습관', '명상/호흡 경험'],
      },
    };

    const checklist = phaseChecklists[scenario.name]?.[currentPhase.role.name] || [];
    const checklistStr = checklist.length > 0
      ? `\n## 이 단계에서 반드시 수집해야 할 정보\n${checklist.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}\n\n대화 기록에서 위 항목 중 이미 확인된 것과 아직 미확인인 것을 구분하세요.`
      : '';

    // 현재 단계에서의 대화만 추출 (이전 단계 대화는 요약으로)
    const phaseMessages = conversationHistory.filter((m: any) => {
      // __round__ 메시지 이후의 대화만 (현재 단계)
      return true; // 전체 전달하되 프롬프트에서 구분하도록
    });

    const consultPrompt = `당신은 "${scenario.name}" 순차 상담의 진행 관리자입니다.

## 현재 상태
- 전체 진행: ${currentPhase.index + 1}/${currentPhase.totalPhases}단계 (${currentPhase.name})
- 현재 담당 전문가: ${currentPhase.role.name}
- 전문가 관심사: ${currentPhase.role.focus}
- 남은 단계: ${currentPhase.totalPhases - currentPhase.index - 1}개
${checklistStr}

## 전체 대화 기록
${conversationHistory.map((m: any) => `[${m.speaker}] ${m.content}`).join('\n')}

## 판단 지시
현재 전문가(${currentPhase.role.name})가 유저로부터 충분한 정보를 수집했는지 판단하세요.

반드시 순수 JSON만 출력:
{
  "next_speaker": "${currentPhase.role.name}",
  "speak_direction": "이 전문가가 다음에 물어볼 구체적 질문 (체크리스트 중 미확인 항목 기반)",
  "next_phase": true 또는 false,
  "phase": "ongoing",
  "phase_summary": "이 단계에서 파악된 핵심 정보 1~2줄 요약 (next_phase가 true일 때만)",
  "reason": "판단 근거 — 체크리스트 중 확인된/미확인 항목 명시"
}

## 전환 판단 기준 (이 순서대로 판단하라)

### 1. 체크리스트 기반 판단 (최우선)
- 체크리스트 항목의 **70% 이상**이 확인되었으면 → next_phase: true
- 유저가 "모르겠다", "없다", "해당없다"라고 답한 항목은 **확인된 것으로 간주**
- 아직 핵심 항목이 미확인이면 → next_phase: false

### 2. 대화 횟수 기반 보조 판단
- 이 단계에서 유저가 **3회 이상** 답변했으면 → 체크리스트 달성률이 50% 이상이면 전환 허용
- 이 단계에서 유저가 **4회 이상** 답변했으면 → 무조건 전환 (질질 끄는 것 방지)
- 첫 답변에서 전환하지 마라 (최소 1회 후속 질문 필요)

### 3. speak_direction 작성 규칙
- 체크리스트에서 **아직 미확인인 구체적 항목**을 지목하라
- 예시: "복용 중인 약물이 있는지, 알레르기 반응 경험이 있는지 물어보세요" (O)
- 예시: "추가 질문을 해주세요" (X — 이렇게 쓰지 마라)
- 유저가 이전에 언급한 내용을 참조하여 후속 질문 방향을 잡아라
- 상담 톤: 공감 → 질문 순서로 ("그렇군요, 그러면 혹시...")

### 4. phase_summary 작성 (전환 시)
- 다음 전문가에게 넘길 핵심 정보를 1~2줄로 요약
- 예: "환자: 30대 여성, 2주간 두통+어지러움, 긴급도 중, 일상 지장 있음"`;

    const model = 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res2 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: consultPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      });
      if (!res2.ok) {
        return res.status(200).json({ next_speaker: currentPhase.role.name, speak_direction: '추가 질문을 해주세요.', next_phase: false, phase: 'ongoing', reason: 'API error' });
      }
      const data = await res2.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(200).json({ next_speaker: currentPhase.role.name, speak_direction: '추가 정보를 물어보세요.', next_phase: false, phase: 'ongoing', reason: 'parse error' });
      }
      const result = JSON.parse(jsonMatch[0]);
      result.next_speaker = result.next_speaker || currentPhase.role.name;
      result.speak_direction = result.speak_direction || '추가 질문을 해주세요.';
      result.next_phase = result.next_phase === true;
      result.phase = result.phase || 'ongoing';
      return res.status(200).json(result);
    } catch {
      return res.status(200).json({ next_speaker: currentPhase.role.name, speak_direction: '추가 질문을 해주세요.', next_phase: false, phase: 'ongoing', reason: 'exception' });
    }
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

## 대화 흐름 가이드 (이 시나리오에 맞게 따르라)
${(() => {
  const guides: Record<string, string> = {
    '투자 유치': '- 초반(1~4턴): 사업 개요, 시장 규모(TAM/SAM/SOM), 핵심 가치 제안\n- 중반(5~10턴): 수익 모델, 경쟁 우위, 팀 구성, 재무 계획\n- 후반(11~15턴): 리스크, 엑싯 전략, 밸류에이션 검증',
    '채용 면접': '- 초반(1~4턴): 자기소개, 지원 동기, 회사/포지션 이해도\n- 중반(5~10턴): 직무 역량 검증 (기술 질문, 문제해결 사례, 프로젝트 경험)\n- 후반(11~15턴): 조직 적합성, 팀워크, 성장 비전, 연봉 협상\n- 특수: 압박 질문 1~2회 포함 (예: "왜 이전 회사를 나왔나요?", "본인의 약점은?")',
    '제품 런칭': '- 초반(1~4턴): 제품 소개, 타겟 고객, 해결하는 문제\n- 중반(5~10턴): 기존 대안 대비 차별점, 가격 정책, UX/기술 완성도\n- 후반(11~15턴): 시장 진입 전략, 경쟁 대응, 확장 계획\n- 특수: 타겟 고객은 감정적("이거 필요해!"), 경쟁사 PM은 공격적',
    '정책 검토': '- 초반(1~4턴): 정책 배경과 목적, 현재 문제, 핵심 내용\n- 중반(5~10턴): 이해관계자별 영향 (시민 생활, 기업 비용, 법적 쟁점)\n- 후반(11~15턴): 대안/보완책, 시행 로드맵, 부작용 최소화\n- 특수: 시민=감정+여론, 기업=수치, 법률=판례',
    '전략 회의': '- 초반(1~4턴): 전략 주제 소개, 현황 분석, 목표 설정\n- 중반(5~10턴): 부서별 관점에서 검토 (마케팅/기술/운영)\n- 후반(11~15턴): 우선순위, 일정/예산 합의, 실행 계획\n- 특수: 대립보다 합의 지향. "이건 좋은데 일정이..." 식으로',
    '사내 제안': '- 초반(1~4턴): 제안 배경, 현재 문제점, 핵심 내용\n- 중반(5~10턴): 비용/예산, ROI, 실행 가능성, 타 부서 영향\n- 후반(11~15턴): 리스크, 대안 비교, 승인 조건\n- 특수: 대표=거시적, CFO=숫자, 팀장=현장 현실',
    '입시 면접': '- 초반(1~4턴): 자기소개, 지원 동기, 학과 선택 이유\n- 중반(5~10턴): 전공 적합성 (관련 경험, 독서, 학업 계획), 자기소개서 내용 검증\n- 후반(11~15턴): 인성 (가치관, 리더십, 공동체), 학교생활 포부\n- 특수: 교수는 학문적 깊이, 사정관은 진정성, 인성면접관은 가치관',
  };
  return guides[scenario.name] || '- 초반: 상황 파악과 핵심 질문\n- 중반: 심화 검증\n- 후반: 최종 판단';
})()}
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

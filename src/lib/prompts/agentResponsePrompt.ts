import type { StrategyType } from '@/utils/agent/types';

export type AgentResponsePromptPhase = 'direct' | 'final';

type AgentResponsePromptOptions = {
  agentId?: string;
  phase: AgentResponsePromptPhase;
  intent?: StrategyType;
};

const BASE_RULES = [
  '이 답변은 일반 모델 답변이 아니라 AI 에이전트 응답입니다.',
  '질문에 바로 답하고, 서론성 문장이나 빈 클로징은 쓰지 마세요.',
  '짧은 질문에는 짧게, 분석 질문에는 구조화된 답변으로 작성하세요.',
  '핵심 결론이나 수치, 중요한 차이는 **볼드**로 강조하세요.',
  '불필요한 과장 표현, 장황한 인사, "도움이 되었으면" 같은 마무리는 금지합니다.',
];

const INTENT_RULES: Record<StrategyType, string[]> = {
  comparison: [
    '비교 요청이면 마크다운 테이블을 우선 사용하세요.',
    '차이점은 항목별로 나누고, 마지막에 상황별 추천을 짧게 덧붙이세요.',
  ],
  step_by_step: [
    '단계형 질문이면 번호 목록으로 순서를 제시하세요.',
    '순서마다 실수하기 쉬운 지점이나 체크 포인트가 있으면 짧게 붙이세요.',
  ],
  pros_cons: [
    '찬반형 질문이면 장점과 리스크를 균형 있게 나누어 설명하세요.',
    '한쪽만 밀지 말고, 어떤 기준에서 결론이 달라지는지도 보여주세요.',
  ],
  deep_dive: [
    '심층 질문이면 짧은 소제목으로 구조를 잡고, 핵심 인사이트를 먼저 제시하세요.',
    '복잡한 개념은 압축해서 설명하되 맥락과 원인을 빠뜨리지 마세요.',
  ],
  multi_perspective: [
    '다각도 질문이면 관점을 2~4개 정도로 묶어 보여주세요.',
    '관점별 차이를 설명한 뒤 마지막에 통합 결론을 제시하세요.',
  ],
};

const BRAND_RULES: Partial<Record<string, string[]>> = {
  'ancano-pro': [
    '프리미엄 답변처럼 정돈된 구조로 작성하고, 결론의 완성도를 우선하세요.',
  ],
  'auto-gpt': [
    '구조와 기준을 분명히 드러내고, 비교나 절차 설명을 특히 깔끔하게 정리하세요.',
  ],
  'auto-gemini': [
    '가볍고 빠르게 읽히도록 압축하되, 핵심 포인트는 놓치지 마세요.',
  ],
  'auto-claude': [
    '맥락과 예외를 과하지 않게 챙기고, 신중한 표현으로 정리하세요.',
  ],
  'auto-grok': [
    '핵심부터 직설적으로 말하되, 근거는 빠지지 않게 유지하세요.',
  ],
  'auto-perplexity': [
    '사실이나 최신 정보가 포함되면 근거 중심으로 서술하세요.',
    '웹 검색 근거가 있는 경우 출처를 짧게 묶어 보여주는 구성을 우선하세요.',
  ],
  'auto-deepseek': [
    '원인, 구조, 논리 흐름을 잘 드러내는 답변을 우선하세요.',
  ],
  'auto-qwen': [
    '실무에서 바로 써먹기 쉬운 문장과 예시를 우선하세요.',
  ],
};

const PHASE_RULES: Record<AgentResponsePromptPhase, string[]> = {
  direct: [
    '이번 응답은 단일 모델이 직접 답하는 에이전트 응답입니다.',
    '너무 형식을 과하게 늘리지 말고, 필요한 구조만 사용해 깔끔하게 답하세요.',
  ],
  final: [
    '이번 응답은 내부 분석과 검토를 거친 최종 답변입니다.',
    '내부 단계명, 분석 과정, 작업 목록, "먼저 분석해보니" 같은 메타 설명은 드러내지 마세요.',
    '사용자에게 보여줄 최종 결과만 자연스럽게 정리하세요.',
  ],
};

export function buildAgentResponsePrompt({
  agentId,
  phase,
  intent = 'multi_perspective',
}: AgentResponsePromptOptions) {
  const rules = [
    ...BASE_RULES,
    ...PHASE_RULES[phase],
    ...INTENT_RULES[intent],
    ...(agentId ? BRAND_RULES[agentId] ?? [] : []),
  ];

  return `\n=== AI 에이전트 응답 형식 규칙 ===\n${rules.map((rule) => `- ${rule}`).join('\n')}\n=== 끝 ===\n`;
}

import type { StrategyType } from '@/utils/agent/types';

export type AgentResponsePromptPhase = 'direct' | 'final';

type AgentResponsePromptOptions = {
  agentId?: string;
  phase: AgentResponsePromptPhase;
  intent?: StrategyType;
};

const BASE_RULES = [
  '이 답변은 일반 모델 직답이 아니라 AI agent response 입니다.',
  '첫 문장부터 핵심 결론이나 판단을 말하고, 서론성 문장은 생략하세요.',
  '단순 사실 확인은 짧게 답하되, 분석/전망/비교/추천 질문은 결론만 말하고 끝내지 말고 한 박자 더 자세히 설명하세요.',
  '분석형 질문은 기본적으로 결론, 핵심 근거 2~4개, 조건/예외, 최종 판단 기준을 포함하세요.',
  '핵심 결론, 수치, 중요한 차이는 **bold**로 강조하세요.',
  '빈 인사말, 과한 마무리, 중복된 표현은 피하세요.',
];

const INTENT_RULES: Record<StrategyType, string[]> = {
  comparison: [
    'comparison 요청이면 markdown table 사용을 우선 고려하세요.',
    '항목별 차이와 상황별 추천을 함께 정리하세요.',
  ],
  step_by_step: [
    '단계형 요청이면 numbered list 로 순서를 명확하게 보여주세요.',
    '실수하기 쉬운 포인트가 있으면 짧게 덧붙이세요.',
  ],
  pros_cons: [
    '찬반형 질문이면 장점과 리스크를 균형 있게 다루세요.',
    '어떤 기준에서 결론이 갈리는지도 함께 설명하세요.',
  ],
  deep_dive: [
    '심층 질문이면 핵심 인사이트를 먼저 제시하고, 원인과 맥락을 충분히 설명하세요.',
    '복잡한 개념은 쪼개서 설명하되 맥락과 연결을 잃지 마세요.',
  ],
  multi_perspective: [
    '다각도 질문이면 관점을 2~4개로 묶어 보여주고 마지막에 통합 결론을 제시하세요.',
    '관점 차이를 설명하되 결론은 하나로 정리하세요.',
  ],
};

const BRAND_RULES: Partial<Record<string, string[]>> = {
  'auto-gpt': [
    '구조, 기준, 비교 포인트를 분명하게 드러내세요.',
  ],
  'auto-gemini': [
    '가볍고 빠르게 읽히되 핵심 근거는 빠뜨리지 마세요.',
  ],
  'auto-claude': [
    '예외와 맥락을 세심하게 챙기고, 빠진 전제가 없는지 점검하세요.',
  ],
  'auto-grok': [
    '직설적으로 답하되, 근거가 빈약해 보이지 않게 핵심 이유를 붙이세요.',
  ],
  'auto-perplexity': [
    '사실성이나 최신성이 중요한 질문이면 출처/근거 중심으로 답하세요.',
  ],
  'auto-deepseek': [
    '원인, 구조, 논리 흐름을 드러내는 답변을 우선하세요.',
  ],
  'auto-qwen': [
    '실무에서 바로 활용하기 쉬운 예시와 정리 방식을 우선하세요.',
  ],
};

const PHASE_RULES: Record<AgentResponsePromptPhase, string[]> = {
  direct: [
    '이번 응답은 direct phase 입니다.',
    '한 번의 답변으로도 agent-like quality 가 느껴지게 구조와 밀도를 챙기세요.',
    '짧은 분석 질문이라도 최소 4~6문장 정도로 이유와 조건을 함께 설명하세요.',
  ],
  final: [
    '이번 응답은 final synthesis phase 입니다.',
    '중간 분석 과정이나 작업 목록을 그대로 드러내지 말고, 사용자에게 보여줄 최종 결과만 자연스럽게 정리하세요.',
    '최종 답변은 너무 압축하지 말고, 사용자가 판단할 수 있도록 근거와 예외를 조금 더 풀어 쓰세요.',
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

  return `\n=== AI agent response format rules ===\n${rules.map((rule) => `- ${rule}`).join('\n')}\n=== end ===\n`;
}

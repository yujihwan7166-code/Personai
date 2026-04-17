import type { AgentState, AgentStrategy, AgentTask, StrategyType } from './types';

type AgentPhaseCopy = {
  analyze: string;
  synthesize: string;
};

type FakeTaskTemplate = {
  label: string;
  publicNote: string;
};

type AgentStreamPresentation = {
  agentLabel: string;
  intent: StrategyType;
  intentLabel: string;
  analyzeLabel: string;
  planningLabel: string;
  synthesizeLabel: string;
  reviewLabel: string;
  headline: string;
  completeLabel: string;
};

const FALLBACK_INTENT: StrategyType = 'multi_perspective';

const AGENT_LABELS: Record<string, string> = {
  'ancano-pro': 'ANCANO Pro',
  'auto-gpt': 'GPT',
  'auto-gemini': 'Gemini',
  'auto-claude': 'Claude',
  'auto-grok': 'Grok',
  'auto-perplexity': 'Perplexity',
  'auto-deepseek': 'DeepSeek',
  'auto-qwen': 'Qwen',
};

const INTENT_LABELS: Record<StrategyType, string> = {
  comparison: '비교 판정',
  step_by_step: '절차 설계',
  pros_cons: '찬반 검토',
  deep_dive: '심층 분석',
  multi_perspective: '다각도 분석',
};

const DEFAULT_PHASE_COPY: Record<StrategyType, AgentPhaseCopy> = {
  comparison: {
    analyze: '평가 축과 판단 기준을 정렬 중',
    synthesize: '조건별 추천 기준을 도출 중',
  },
  step_by_step: {
    analyze: '실행 절차와 의존 관계를 분해 중',
    synthesize: '실행 가능한 순서로 절차를 재구성 중',
  },
  pros_cons: {
    analyze: '찬반 근거와 예외 조건을 교차 검토 중',
    synthesize: '판단 기준과 리스크를 균형 있게 정리 중',
  },
  deep_dive: {
    analyze: '맥락, 원인, 영향 범위를 심층 검토 중',
    synthesize: '핵심 인사이트와 결론 구조를 압축 중',
  },
  multi_perspective: {
    analyze: '질문 의도를 복수 관점으로 해석 중',
    synthesize: '관점 간 충돌과 공통분모를 통합 중',
  },
};

const BRAND_PHASE_OVERRIDES: Partial<Record<string, Partial<Record<StrategyType, AgentPhaseCopy>>>> = {
  'auto-gpt': {
    comparison: {
      analyze: '비교 기준과 판단 근거를 논리적으로 정렬 중',
      synthesize: '우선순위 기반의 추천 결론을 구성 중',
    },
  },
  'auto-gemini': {
    multi_perspective: {
      analyze: '질문 맥락을 빠르게 분해해 핵심 변수를 추출 중',
      synthesize: '읽기 쉬운 구조로 주요 쟁점을 통합 중',
    },
  },
  'auto-claude': {
    deep_dive: {
      analyze: '예외 조건과 맥락까지 세밀하게 검토 중',
      synthesize: '논리 공백이 없도록 결론 구조를 보강 중',
    },
    pros_cons: {
      analyze: '찬반 논리와 예외 조건을 균형 있게 평가 중',
      synthesize: '신중한 판단 기준으로 결론을 정리 중',
    },
  },
  'auto-grok': {
    comparison: {
      analyze: '핵심 차이를 빠르게 추출해 판단 축을 좁히는 중',
      synthesize: '불필요한 완곡함을 줄이고 결론을 압축 중',
    },
  },
  'auto-perplexity': {
    deep_dive: {
      analyze: '근거 신뢰도와 최신성을 우선 점검 중',
      synthesize: '확인된 정보 중심으로 답변 구조를 정리 중',
    },
  },
  'auto-deepseek': {
    deep_dive: {
      analyze: '논리 흐름과 원인 구조를 단계적으로 분해 중',
      synthesize: '원인, 근거, 결론의 연결성을 재구성 중',
    },
  },
  'auto-qwen': {
    step_by_step: {
      analyze: '실무 흐름 기준으로 절차 단위를 분해 중',
      synthesize: '바로 적용 가능한 실행 순서로 정리 중',
    },
  },
};

const FAKE_TASK_TEMPLATES: Record<StrategyType, FakeTaskTemplate[]> = {
  comparison: [
    { label: '비교 기준 정렬', publicNote: '판단에 필요한 평가 축을 우선순위별로 정리했습니다.' },
    { label: '항목별 차이 검토', publicNote: '성능, 비용, 용도, 제약 조건의 차이를 분리해 검토했습니다.' },
    { label: '조건별 적합도 판정', publicNote: '사용 상황에 따라 어떤 선택지가 유리한지 판단 기준을 세웠습니다.' },
  ],
  step_by_step: [
    { label: '문제 구조 분해', publicNote: '먼저 처리해야 할 조건과 의존 관계를 분리했습니다.' },
    { label: '실행 흐름 설계', publicNote: '각 단계를 순차적으로 실행 가능한 단위로 재배열했습니다.' },
    { label: '리스크 지점 점검', publicNote: '중간에 막히기 쉬운 구간과 확인 항목을 함께 검토했습니다.' },
  ],
  pros_cons: [
    { label: '찬성 근거 검토', publicNote: '선택지를 지지하는 핵심 근거와 기대 효과를 정리했습니다.' },
    { label: '반대 근거 검토', publicNote: '리스크, 비용, 반론 가능성을 별도로 점검했습니다.' },
    { label: '판단 기준 정리', publicNote: '무엇을 우선하느냐에 따라 결론이 달라지는 지점을 구분했습니다.' },
  ],
  deep_dive: [
    { label: '질문 맥락 파악', publicNote: '겉으로 보이는 질문보다 더 중요한 배경 맥락을 확인했습니다.' },
    { label: '원인과 영향 검토', publicNote: '원인, 결과, 파급 효과를 분리해 연결 관계를 살폈습니다.' },
    { label: '핵심 인사이트 정리', publicNote: '복잡한 내용을 결론으로 이어지는 핵심 구조로 압축했습니다.' },
  ],
  multi_perspective: [
    { label: '질문 의도 해석', publicNote: '질문에서 실제로 필요한 판단 지점을 먼저 분리했습니다.' },
    { label: '관점별 쟁점 검토', publicNote: '관점 간 충돌 지점과 공통 요인을 분리해 검토했습니다.' },
    { label: '종합 결론 구성', publicNote: '관점 차이까지 포함해 하나의 답변 구조로 통합했습니다.' },
  ],
};

const COMPARISON_HINTS = ['비교', '차이', 'vs', 'versus', '뭐가', '어느 쪽', '더 낫'];
const STEP_HINTS = ['단계', '순서', '가이드', '로드맵', 'setup', '설정', '구현 방법', '실행 방법', '어떻게'];
const PROS_CONS_HINTS = ['찬반', '장단점', '장점', '단점', 'pros', 'cons', '해야 할까', '좋을까'];
const DEEP_DIVE_HINTS = ['원인', '이유', '영향', '리스크', '미래', '추세', '심층', '깊게', '분석'];

function includesAny(text: string, hints: string[]) {
  return hints.some((hint) => text.includes(hint));
}

function toProgressLabel(label: string) {
  if (label.endsWith('중') || label.endsWith('중입니다.')) return label;
  return `${label} 중`;
}

export function getAgentLabel(expertId?: string) {
  if (!expertId) return 'AI 에이전트';
  return AGENT_LABELS[expertId] ?? expertId;
}

export function inferAgentIntent(message: string): StrategyType {
  const normalized = message.trim().toLowerCase();

  if (includesAny(normalized, COMPARISON_HINTS)) return 'comparison';
  if (includesAny(normalized, PROS_CONS_HINTS)) return 'pros_cons';
  if (includesAny(normalized, STEP_HINTS)) return 'step_by_step';
  if (includesAny(normalized, DEEP_DIVE_HINTS)) return 'deep_dive';

  return FALLBACK_INTENT;
}

export function getIntentLabel(intent?: StrategyType) {
  return INTENT_LABELS[intent ?? FALLBACK_INTENT];
}

export function getPhaseCopy(expertId: string | undefined, intent: StrategyType): AgentPhaseCopy {
  return BRAND_PHASE_OVERRIDES[expertId ?? '']?.[intent] ?? DEFAULT_PHASE_COPY[intent];
}

export function buildFakeAgentStrategy(
  message: string,
  expertId?: string,
  intentHint?: StrategyType,
): AgentStrategy {
  const intent = intentHint ?? inferAgentIntent(message);
  const templates = FAKE_TASK_TEMPLATES[intent];
  const brandLabel = getAgentLabel(expertId);

  return {
    type: intent,
    reasoning: `${brandLabel}가 ${INTENT_LABELS[intent]} 흐름으로 질문을 분석합니다.`,
    publicPlan: `${INTENT_LABELS[intent]} 기준으로 핵심 쟁점과 응답 구조를 설계합니다.`,
    publicSteps: templates.map((template) => template.label),
    tasks: templates.map((template, index) => ({
      id: `ft${index + 1}`,
      label: template.label,
      prompt: `${template.label}\n질문: ${message}\n핵심 근거와 판단 기준만 구조적으로 정리하세요.`,
    })),
  };
}

export function attachPublicNotes(tasks: AgentTask[], intent?: StrategyType) {
  const templates = FAKE_TASK_TEMPLATES[intent ?? FALLBACK_INTENT];
  return tasks.map((task, index) => ({
    ...task,
    publicNote: task.publicNote ?? templates[Math.min(index, templates.length - 1)]?.publicNote ?? '분석 중 확인한 핵심 근거를 최종 응답에 반영했습니다.',
  }));
}

export function getAgentStreamPresentation(state: AgentState): AgentStreamPresentation {
  const intent = state.strategy?.type ?? state.intent ?? FALLBACK_INTENT;
  const phaseCopy = getPhaseCopy(state.agentBrand, intent);
  const runningTask = state.tasks.find((task) => task.status === 'running');
  const doneCount = state.tasks.filter((task) => task.status === 'done').length;
  const totalCount = state.tasks.length;
  const agentLabel = getAgentLabel(state.agentBrand);
  const intentLabel = getIntentLabel(intent);
  const planningLabel = state.strategy?.publicPlan || '응답 구조와 분석 순서를 설계 중';

  let headline = phaseCopy.analyze;
  if (state.status === 'planning') {
    headline = planningLabel;
  } else if (state.status === 'processing') {
    headline = runningTask ? toProgressLabel(runningTask.label) : `${totalCount || 1}개 분석 축을 검토 중`;
  } else if (state.status === 'synthesizing') {
    headline = phaseCopy.synthesize;
  } else if (state.status === 'reviewing') {
    headline = '논리 공백과 누락 맥락을 최종 검수 중';
  } else if (state.status === 'complete') {
    headline = `${intentLabel} 절차를 완료했습니다.`;
  } else if (state.status === 'error') {
    headline = '분석 절차를 축약하고 응답 생성을 이어가는 중';
  }

  return {
    agentLabel,
    intent,
    intentLabel,
    analyzeLabel: phaseCopy.analyze,
    planningLabel,
    synthesizeLabel: phaseCopy.synthesize,
    reviewLabel: '누락 맥락과 논리 공백을 보강 중',
    headline,
    completeLabel: `${agentLabel} · ${intentLabel} · ${doneCount || totalCount}단계 완료 · ${(state.elapsedMs / 1000).toFixed(1)}초`,
  };
}

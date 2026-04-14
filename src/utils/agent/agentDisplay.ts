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
  comparison: '비교형 응답',
  step_by_step: '단계형 안내',
  pros_cons: '찬반형 검토',
  deep_dive: '심층 분석',
  multi_perspective: '다각도 분석',
};

const DEFAULT_PHASE_COPY: Record<StrategyType, AgentPhaseCopy> = {
  comparison: {
    analyze: '비교 기준을 추출하는 중',
    synthesize: '상황별 추천으로 정리하는 중',
  },
  step_by_step: {
    analyze: '실행 순서를 분해하는 중',
    synthesize: '실수 없이 따라갈 순서로 정리하는 중',
  },
  pros_cons: {
    analyze: '찬반 근거를 나누는 중',
    synthesize: '균형 잡힌 판단으로 정리하는 중',
  },
  deep_dive: {
    analyze: '질문의 맥락과 원인을 깊게 보는 중',
    synthesize: '핵심 인사이트로 압축하는 중',
  },
  multi_perspective: {
    analyze: '질문 의도를 여러 관점으로 해석하는 중',
    synthesize: '서로 다른 관점을 하나의 답으로 묶는 중',
  },
};

const BRAND_PHASE_OVERRIDES: Partial<Record<string, Partial<Record<StrategyType, AgentPhaseCopy>>>> = {
  'auto-gpt': {
    comparison: {
      analyze: '비교 축과 판단 기준을 정리하는 중',
      synthesize: '논리적인 추천 기준으로 정리하는 중',
    },
  },
  'auto-gemini': {
    multi_perspective: {
      analyze: '핵심 포인트를 빠르게 추리는 중',
      synthesize: '읽기 쉽게 요점을 묶는 중',
    },
  },
  'auto-claude': {
    deep_dive: {
      analyze: '예외와 맥락까지 꼼꼼히 살피는 중',
      synthesize: '빠진 부분 없이 다듬는 중',
    },
    pros_cons: {
      analyze: '찬반 논리와 예외를 함께 점검하는 중',
      synthesize: '신중한 판단 기준으로 정리하는 중',
    },
  },
  'auto-grok': {
    comparison: {
      analyze: '핵심 차이만 빠르게 뽑아내는 중',
      synthesize: '돌려 말하지 않고 결론으로 정리하는 중',
    },
  },
  'auto-perplexity': {
    deep_dive: {
      analyze: '근거와 최신성을 먼저 확인하는 중',
      synthesize: '확인된 정보 기준으로 정리하는 중',
    },
  },
  'auto-deepseek': {
    deep_dive: {
      analyze: '논리 흐름과 원인을 분해하는 중',
      synthesize: '원인과 결론을 다시 묶는 중',
    },
  },
  'auto-qwen': {
    step_by_step: {
      analyze: '실무 흐름 기준으로 단계를 나누는 중',
      synthesize: '바로 써먹기 쉽게 정리하는 중',
    },
  },
};

const FAKE_TASK_TEMPLATES: Record<StrategyType, FakeTaskTemplate[]> = {
  comparison: [
    { label: '비교 기준 정리', publicNote: '비교 축을 3개 안팎으로 확정했습니다.' },
    { label: '항목별 차이 검토', publicNote: '성능, 비용, 용도 차이를 나눠 봤습니다.' },
    { label: '상황별 추천 정리', publicNote: '어떤 상황에서 무엇이 맞는지 기준을 붙였습니다.' },
  ],
  step_by_step: [
    { label: '문제 구조 분해', publicNote: '무엇부터 해야 하는지 순서를 나눴습니다.' },
    { label: '실행 흐름 설계', publicNote: '앞 단계와 뒤 단계를 이어서 정리했습니다.' },
    { label: '실수 포인트 점검', publicNote: '중간에 막히기 쉬운 지점을 함께 묶었습니다.' },
  ],
  pros_cons: [
    { label: '찬성 근거 정리', publicNote: '선택했을 때의 이점을 먼저 추렸습니다.' },
    { label: '반대 근거 검토', publicNote: '리스크와 반대 논리를 따로 정리했습니다.' },
    { label: '판단 기준 정리', publicNote: '무엇을 우선하면 결론이 달라지는지 붙였습니다.' },
  ],
  deep_dive: [
    { label: '질문 맥락 파악', publicNote: '겉핥기보다 왜 이 질문이 나왔는지부터 봤습니다.' },
    { label: '원인과 영향 검토', publicNote: '원인과 파급 효과를 함께 묶어 봤습니다.' },
    { label: '핵심 인사이트 정리', publicNote: '복잡한 내용을 핵심 몇 줄로 압축했습니다.' },
  ],
  multi_perspective: [
    { label: '질문 의도 해석', publicNote: '질문에서 정말 필요한 포인트를 먼저 골랐습니다.' },
    { label: '관점별 검토', publicNote: '서로 다른 시각이 겹치는 부분과 갈리는 부분을 봤습니다.' },
    { label: '관점 차이 통합', publicNote: '갈리는 지점까지 포함해 하나의 답으로 묶었습니다.' },
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
  return label.endsWith('중') ? label : `${label} 중`;
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
    publicPlan: `${INTENT_LABELS[intent]} 흐름으로 핵심 포인트를 정리합니다.`,
    publicSteps: templates.map((template) => template.label),
    tasks: templates.map((template, index) => ({
      id: `ft${index + 1}`,
      label: template.label,
      prompt: `${template.label}\n질문: ${message}\n핵심 포인트만 구조적으로 정리하세요.`,
    })),
  };
}

export function attachPublicNotes(tasks: AgentTask[], intent?: StrategyType) {
  const templates = FAKE_TASK_TEMPLATES[intent ?? FALLBACK_INTENT];
  return tasks.map((task, index) => ({
    ...task,
    publicNote: task.publicNote ?? templates[Math.min(index, templates.length - 1)]?.publicNote ?? '핵심 포인트를 답변에 반영했습니다.',
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
  const planningLabel = state.strategy?.publicPlan || '답변 구조를 짜는 중';

  let headline = phaseCopy.analyze;
  if (state.status === 'planning') {
    headline = planningLabel;
  } else if (state.status === 'processing') {
    headline = runningTask ? toProgressLabel(runningTask.label) : `${totalCount || 1}개 관점을 검토하는 중`;
  } else if (state.status === 'synthesizing') {
    headline = phaseCopy.synthesize;
  } else if (state.status === 'reviewing') {
    headline = '빠진 맥락이 없는지 마지막으로 다듬는 중';
  } else if (state.status === 'complete') {
    headline = `${intentLabel} 정리를 마쳤습니다.`;
  } else if (state.status === 'error') {
    headline = '분석 단계를 단순화하고 바로 답변을 이어가는 중';
  }

  return {
    agentLabel,
    intent,
    intentLabel,
    analyzeLabel: phaseCopy.analyze,
    planningLabel,
    synthesizeLabel: phaseCopy.synthesize,
    reviewLabel: '빠진 맥락을 보강하는 중',
    headline,
    completeLabel: `${agentLabel} · ${intentLabel} · ${doneCount || totalCount}단계 완료 · ${(state.elapsedMs / 1000).toFixed(1)}초`,
  };
}

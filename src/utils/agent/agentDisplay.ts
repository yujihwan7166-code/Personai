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
  synthesizeLabel: string;
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
    synthesize: '사용 상황별 추천으로 정리하는 중',
  },
  step_by_step: {
    analyze: '문제를 단계로 분해하는 중',
    synthesize: '실행 순서로 깔끔하게 정리하는 중',
  },
  pros_cons: {
    analyze: '찬반 포인트를 나누는 중',
    synthesize: '균형 잡힌 판단으로 정리하는 중',
  },
  deep_dive: {
    analyze: '핵심 맥락을 파고드는 중',
    synthesize: '핵심 인사이트로 압축하는 중',
  },
  multi_perspective: {
    analyze: '질문 의도를 해석하는 중',
    synthesize: '서로 다른 관점을 통합하는 중',
  },
};

const BRAND_PHASE_OVERRIDES: Partial<Record<string, Partial<Record<StrategyType, AgentPhaseCopy>>>> = {
  'ancano-pro': {
    multi_perspective: {
      analyze: '최적 응답 경로를 조율하는 중',
      synthesize: '가장 완성도 높은 답으로 정리하는 중',
    },
  },
  'auto-gpt': {
    comparison: {
      analyze: '질문 구조와 비교 축을 정리하는 중',
      synthesize: '논리적인 추천 기준으로 정리하는 중',
    },
    step_by_step: {
      analyze: '실행 순서를 구조화하는 중',
      synthesize: '빠뜨림 없는 순서로 정리하는 중',
    },
  },
  'auto-gemini': {
    comparison: {
      analyze: '핵심 비교 포인트를 빠르게 추리는 중',
      synthesize: '상황별 추천을 빠르게 정리하는 중',
    },
    multi_perspective: {
      analyze: '핵심 포인트를 빠르게 훑는 중',
      synthesize: '한눈에 보이게 압축하는 중',
    },
  },
  'auto-claude': {
    deep_dive: {
      analyze: '예외와 맥락까지 꼼꼼히 점검하는 중',
      synthesize: '빠진 부분 없이 정리하는 중',
    },
    pros_cons: {
      analyze: '찬반 논리와 예외를 함께 검토하는 중',
      synthesize: '신중한 판단으로 정리하는 중',
    },
  },
  'auto-grok': {
    comparison: {
      analyze: '핵심 차이만 바로 뽑아내는 중',
      synthesize: '군더더기 없이 결론으로 정리하는 중',
    },
  },
  'auto-perplexity': {
    deep_dive: {
      analyze: '근거와 최신성을 먼저 확인하는 중',
      synthesize: '출처 기준으로 요약하는 중',
    },
    multi_perspective: {
      analyze: '핵심 근거를 확인하는 중',
      synthesize: '확인된 정보 위주로 정리하는 중',
    },
  },
  'auto-deepseek': {
    deep_dive: {
      analyze: '논리 흐름을 분해하는 중',
      synthesize: '원인과 결론을 다시 묶는 중',
    },
  },
  'auto-qwen': {
    step_by_step: {
      analyze: '실행 흐름을 실무 기준으로 정리하는 중',
      synthesize: '바로 써먹기 쉽게 정리하는 중',
    },
  },
};

const FAKE_TASK_TEMPLATES: Record<StrategyType, FakeTaskTemplate[]> = {
  comparison: [
    { label: '비교 기준 정리', publicNote: '비교 축을 3개 안팎으로 압축했습니다.' },
    { label: '항목별 차이 검토', publicNote: '성능, 비용, 용도 차이를 나눠 봤습니다.' },
    { label: '상황별 추천 정리', publicNote: '어떤 상황에서 더 맞는지 기준을 붙였습니다.' },
  ],
  step_by_step: [
    { label: '문제 구조 분해', publicNote: '해야 할 일을 순서 단위로 잘라냈습니다.' },
    { label: '실행 순서 설계', publicNote: '먼저 할 일과 나중에 할 일을 구분했습니다.' },
    { label: '실수 포인트 점검', publicNote: '중간에 막히기 쉬운 지점을 같이 표시했습니다.' },
  ],
  pros_cons: [
    { label: '찬성 논거 정리', publicNote: '도입하거나 선택했을 때의 이점을 먼저 정리했습니다.' },
    { label: '반대 논거 검토', publicNote: '리스크와 반대 근거를 따로 분리해 봤습니다.' },
    { label: '판단 기준 정리', publicNote: '무엇을 우선하면 결론이 달라지는지 붙였습니다.' },
  ],
  deep_dive: [
    { label: '핵심 맥락 파악', publicNote: '겉핥기보다 먼저 큰 맥락을 잡았습니다.' },
    { label: '원인과 영향 검토', publicNote: '왜 그런지와 어떤 영향을 주는지 나눠 봤습니다.' },
    { label: '핵심 인사이트 압축', publicNote: '복잡한 내용을 핵심 몇 줄로 줄였습니다.' },
  ],
  multi_perspective: [
    { label: '질문 의도 해석', publicNote: '질문에서 정말 필요한 포인트를 먼저 잡았습니다.' },
    { label: '관점별 검토', publicNote: '서로 다른 관점에서 빠진 부분이 없는지 봤습니다.' },
    { label: '관점 차이 통합', publicNote: '겹치는 의견과 갈리는 의견을 한 번에 묶었습니다.' },
  ],
};

const COMPARISON_HINTS = [
  '비교', '차이', 'vs', 'versus', '더 나은', '뭐가 더', '어느 쪽', '차별점',
];

const STEP_HINTS = [
  '단계', '순서', '절차', '가이드', '로드맵', 'roadmap', 'setup', '세팅',
  '구현 방법', '실행 방법', '어떻게', '플랜',
];

const PROS_CONS_HINTS = [
  '찬반', '장단점', '장점', '단점', 'pros', 'cons', '해야 할까', '좋을까', '도입해도 될까', '옳은가',
];

const DEEP_DIVE_HINTS = [
  '원인', '이유', '왜', '영향', '리스크', '전망', '미래', '트렌드', '심층', '깊게',
  '원리', '구조', '아키텍처', '분석',
];

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

  if (includesAny(normalized, COMPARISON_HINTS)) {
    return 'comparison';
  }

  if (includesAny(normalized, PROS_CONS_HINTS)) {
    return 'pros_cons';
  }

  if (includesAny(normalized, STEP_HINTS)) {
    return 'step_by_step';
  }

  if (includesAny(normalized, DEEP_DIVE_HINTS)) {
    return 'deep_dive';
  }

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
    reasoning: `${brandLabel}가 ${INTENT_LABELS[intent]} 방식으로 질문을 나눠 봅니다.`,
    tasks: templates.map((template, index) => ({
      id: `ft${index + 1}`,
      label: template.label,
      prompt: `${template.label}\n질문: ${message}\n핵심 포인트만 짧게 정리해.`,
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

  let headline = phaseCopy.analyze;
  if (state.status === 'processing') {
    headline = runningTask ? toProgressLabel(runningTask.label) : `${totalCount || 1}개 관점을 나눠서 검토하는 중`;
  } else if (state.status === 'synthesizing') {
    headline = phaseCopy.synthesize;
  } else if (state.status === 'complete') {
    headline = `${intentLabel} 정리를 마쳤습니다.`;
  } else if (state.status === 'error') {
    headline = '분석 과정을 단순화하고 바로 답변하는 중';
  }

  return {
    agentLabel,
    intent,
    intentLabel,
    analyzeLabel: phaseCopy.analyze,
    synthesizeLabel: phaseCopy.synthesize,
    headline,
    completeLabel: `${agentLabel} · ${intentLabel} · ${doneCount || totalCount}단계 완료 · ${(state.elapsedMs / 1000).toFixed(1)}초`,
  };
}

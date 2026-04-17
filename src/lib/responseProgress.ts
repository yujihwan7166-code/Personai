export type ResponseState =
  | 'queued'
  | 'analyzing'
  | 'searching'
  | 'planning'
  | 'processing'
  | 'drafting'
  | 'reviewing'
  | 'finalizing'
  | 'complete'
  | 'error';

export type ResponseProgress = {
  state: ResponseState;
  label: string;
  detail?: string;
};

const DEFAULT_PROGRESS: Record<ResponseState, ResponseProgress> = {
  queued: {
    state: 'queued',
    label: '응답 대기열에 등록했습니다.',
    detail: '요청 처리 순서와 실행 컨텍스트를 준비하고 있습니다.',
  },
  analyzing: {
    state: 'analyzing',
    label: '요구 범위를 분석하고 있습니다.',
    detail: '질문 의도, 전제 조건, 필요한 응답 깊이를 식별하고 있습니다.',
  },
  searching: {
    state: 'searching',
    label: '근거 자료를 수집하고 있습니다.',
    detail: '응답에 필요한 최신 정보와 참조 맥락을 선별하고 있습니다.',
  },
  planning: {
    state: 'planning',
    label: '응답 전략을 설계하고 있습니다.',
    detail: '어떤 기준과 순서로 답변을 구성할지 구조화하고 있습니다.',
  },
  processing: {
    state: 'processing',
    label: '핵심 쟁점을 검토하고 있습니다.',
    detail: '질문에 맞는 근거, 변수, 관점을 우선순위별로 정리하고 있습니다.',
  },
  drafting: {
    state: 'drafting',
    label: '초안 구조를 작성하고 있습니다.',
    detail: '분석 내용을 답변 가능한 문단 구조로 전환하고 있습니다.',
  },
  reviewing: {
    state: 'reviewing',
    label: '논리와 누락 항목을 검수하고 있습니다.',
    detail: '결론의 일관성, 빠진 맥락, 과도한 단정을 다시 점검하고 있습니다.',
  },
  finalizing: {
    state: 'finalizing',
    label: '최종 응답을 정제하고 있습니다.',
    detail: '분석 결과를 읽기 쉬운 구조와 결론 중심의 답변으로 마무리하고 있습니다.',
  },
  complete: {
    state: 'complete',
    label: '응답 완료',
  },
  error: {
    state: 'error',
    label: '응답 처리 중 오류가 발생했습니다.',
  },
};

export function getDefaultProgress(
  state: ResponseState,
  overrides?: Partial<ResponseProgress>,
): ResponseProgress {
  return {
    ...DEFAULT_PROGRESS[state],
    ...overrides,
    state,
  };
}

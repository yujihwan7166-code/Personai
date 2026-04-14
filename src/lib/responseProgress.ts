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
    label: '응답 대기 중',
    detail: '이제 바로 답변 준비를 시작합니다.',
  },
  analyzing: {
    state: 'analyzing',
    label: '질문을 해석하고 있어요.',
    detail: '요청 의도와 답변 방향을 먼저 정리하고 있습니다.',
  },
  searching: {
    state: 'searching',
    label: '관련 정보를 찾고 있어요.',
    detail: '필요한 검색 결과와 맥락을 모으고 있습니다.',
  },
  planning: {
    state: 'planning',
    label: '답변 구조를 짜고 있어요.',
    detail: '어떤 순서와 관점으로 답할지 정리하고 있습니다.',
  },
  processing: {
    state: 'processing',
    label: '핵심 포인트를 검토하고 있어요.',
    detail: '질문에 맞는 근거와 관점을 추려내고 있습니다.',
  },
  drafting: {
    state: 'drafting',
    label: '답변 초안을 작성하고 있어요.',
    detail: '핵심 내용을 자연스럽게 풀어쓰는 중입니다.',
  },
  reviewing: {
    state: 'reviewing',
    label: '답변을 더 탄탄하게 다듬고 있어요.',
    detail: '빠진 맥락이나 부족한 설명이 없는지 다시 보고 있습니다.',
  },
  finalizing: {
    state: 'finalizing',
    label: '최종 답변으로 정리하고 있어요.',
    detail: '지금까지 정리한 내용을 보기 좋게 마무리하는 중입니다.',
  },
  complete: {
    state: 'complete',
    label: '응답 완료',
  },
  error: {
    state: 'error',
    label: '응답 중 문제가 발생했어요.',
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

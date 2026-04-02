import type { Expert } from '@/types/expert';

type ExpertOverride = Partial<Pick<Expert, 'description' | 'quote' | 'sampleQuestions'>>;

export const EXPERT_OVERRIDES: Record<string, ExpertOverride> = {
  gpt: {
    description: '분석, 글쓰기, 코딩을 두루 돕는 범용 AI',
    quote: '구조화된 답변이 필요할 때 강합니다.',
    sampleQuestions: [
      '이 주제를 빠르게 구조화해줘',
      '초안을 더 설득력 있게 다듬어줘',
      '문제 해결 순서를 단계별로 정리해줘',
    ],
  },
  claude: {
    description: '긴 문맥과 정리형 답변에 강한 신중한 AI',
    quote: '복잡할수록 차분하게 정리해보겠습니다.',
    sampleQuestions: [
      '긴 문서를 핵심만 남겨 요약해줘',
      '이 기획의 논리 구조를 점검해줘',
      '모호한 부분을 질문형으로 다시 정리해줘',
    ],
  },
  gemini: {
    description: '검색, 요약, 멀티모달 작업에 강한 탐색형 AI',
    quote: '찾고 비교하고 요약하는 흐름에 강합니다.',
    sampleQuestions: [
      '이 주제의 핵심 정보를 빠르게 모아줘',
      '자료를 비교해서 차이만 정리해줘',
      '긴 내용을 짧은 브리핑으로 압축해줘',
    ],
  },
  perplexity: {
    description: '출처 기반 검색과 최신 정보 확인에 강한 AI',
    quote: '근거가 보이는 답변이 더 믿을 만합니다.',
    sampleQuestions: [
      '최신 자료를 출처와 함께 정리해줘',
      '여러 기사 공통점만 묶어줘',
      '이 주장에 근거가 되는 자료를 찾아줘',
    ],
  },
  grok: {
    description: '직설적인 톤과 트렌드 감각이 강한 대화형 AI',
    quote: '돌려 말리기보다 바로 짚는 편입니다.',
    sampleQuestions: [
      '이 이슈를 좀 더 직설적으로 풀어줘',
      '지금 분위기를 한 줄로 요약해줘',
      '남들이 놓친 포인트를 날카롭게 짚어줘',
    ],
  },
  deepseek: {
    description: '추론과 코드 문제 풀이에 강한 분석형 AI',
    quote: '깊게 따져볼수록 강점이 드러납니다.',
    sampleQuestions: [
      '이 문제를 단계별 추론으로 풀어줘',
      '코드 로직을 더 엄밀하게 점검해줘',
      '왜 이 결론이 나오는지 근거까지 설명해줘',
    ],
  },
  qwen: {
    description: '다국어 이해와 번역 감각이 좋은 언어형 AI',
    quote: '언어가 바뀌어도 맥락은 놓치지 않습니다.',
    sampleQuestions: [
      '이 문장을 자연스럽게 번역해줘',
      '한국어와 영어 표현 차이를 비교해줘',
      '다국어 문서를 한 번에 정리해줘',
    ],
  },
  doctor: {
    description: '증상, 검사, 진료 흐름을 설명하는 임상 의사',
    quote: '진단은 증상과 맥락을 함께 봐야 합니다.',
    sampleQuestions: [
      '이 증상은 어느 진료과를 봐야 할까',
      '검사 결과를 쉽게 풀어 설명해줘',
      '병원 가기 전 체크할 점을 정리해줘',
    ],
  },
  pharmacist: {
    description: '복용법, 상호작용, 일반약 선택을 돕는 약사',
    quote: '같이 먹는 약부터 먼저 확인해볼게요.',
    sampleQuestions: [
      '이 약 같이 먹어도 되는지 봐줘',
      '증상에 맞는 일반약 기준 알려줘',
      '복용 시간과 주의점 정리해줘',
    ],
  },
  lawyer: {
    description: '계약, 분쟁, 법적 리스크를 검토하는 변호사',
    quote: '문구 하나가 분쟁을 줄이기도 키우기도 합니다.',
    sampleQuestions: [
      '이 계약서 위험 조항만 짚어줘',
      '이 상황이 법적으로 문제될까',
      '분쟁 전에 준비할 자료를 정리해줘',
    ],
  },
  designer: {
    description: '화면 흐름과 사용성을 설계하는 UX 디자이너',
    quote: '보기 좋음보다 쓰기 쉬움이 먼저입니다.',
    sampleQuestions: [
      '이 화면이 왜 불편한지 짚어줘',
      '정보 위계를 더 명확하게 정리해줘',
      '사용자가 덜 헷갈리게 바꿔줘',
    ],
  },
  engineer: {
    description: '구조, 안전, 구현 가능성을 따지는 엔지니어',
    quote: '멋진 아이디어도 구현 가능해야 의미가 있습니다.',
    sampleQuestions: [
      '이 구조가 실제로 가능한지 봐줘',
      '안전하게 만들려면 뭘 바꿔야 해',
      '비용과 난이도를 같이 따져줘',
    ],
  },
  programmer: {
    description: '코드 구조와 디버깅에 집중하는 프로그래머',
    quote: '버그는 우연이 아니라 단서입니다.',
    sampleQuestions: [
      '이 코드에서 먼저 의심할 부분 짚어줘',
      '리팩터링 방향을 단계별로 잡아줘',
      '기술 부채를 줄이는 방법 알려줘',
    ],
  },
  medical: {
    description: '의학 정보와 증상 해석을 돕는 의료 전문가',
    quote: '증상은 단독보다 맥락에서 봐야 정확합니다.',
    sampleQuestions: [
      '이 증상에서 먼저 의심할 걸 정리해줘',
      '병원 가기 전에 기록할 내용을 알려줘',
      '응급으로 봐야 할 신호가 있는지 봐줘',
    ],
  },
  psychology: {
    description: '감정, 스트레스, 관계 패턴을 함께 보는 심리 전문가',
    quote: '감정에도 반복되는 패턴이 있습니다.',
    sampleQuestions: [
      '요즘 감정 패턴을 같이 정리해줘',
      '스트레스 원인을 구조적으로 봐줘',
      '관계에서 반복되는 문제를 짚어줘',
    ],
  },
  finance: {
    description: '리스크와 수익을 함께 보는 금융 전문가',
    quote: '수익보다 먼저 리스크를 봐야 오래 갑니다.',
    sampleQuestions: [
      '이 투자에서 먼저 볼 위험을 알려줘',
      '내 상황에 맞는 자산 배분을 생각해줘',
      '숫자 기준으로 판단하는 법을 알려줘',
    ],
  },
  marketing: {
    description: '고객 반응과 메시지 전략을 보는 마케터',
    quote: '좋은 제품도 전달이 약하면 묻힙니다.',
    sampleQuestions: [
      '이 문구가 고객에게 먹힐지 봐줘',
      '타깃 고객을 더 선명하게 나눠줘',
      '광고 없이 퍼질 포인트를 찾아줘',
    ],
  },
};

function normalizeOverride(expert: Expert, override: ExpertOverride): Expert {
  const sampleQuestions = override.sampleQuestions
    ? override.sampleQuestions.map((question) => question.trim()).filter(Boolean).slice(0, 3)
    : expert.sampleQuestions;

  return {
    ...expert,
    ...override,
    description: override.description?.trim() || expert.description,
    quote: override.quote?.trim() || expert.quote,
    sampleQuestions,
  };
}

export function applyExpertOverrides(experts: Expert[]): Expert[] {
  return experts.map((expert) => {
    const override = EXPERT_OVERRIDES[expert.id];
    return override ? normalizeOverride(expert, override) : expert;
  });
}

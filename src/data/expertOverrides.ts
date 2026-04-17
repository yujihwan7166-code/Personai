import type { Expert } from '@/types/expert';

type ExpertOverride = Partial<Pick<Expert, 'description' | 'quote' | 'sampleQuestions'>>;

const MAX_SAMPLE_QUESTIONS = 3;

function createOverride(
  description: string,
  quote: string,
  sampleQuestions: [string, string, string]
): ExpertOverride {
  return { description, quote, sampleQuestions };
}

export const EXPERT_OVERRIDES: Record<string, ExpertOverride> = {
  gpt: createOverride(
    '구조화, 글쓰기, 코드 작업을 두루 돕는 범용 AI',
    '뭐든 물어봐, 정리해줄게',
    [
      '이 주제를 한 번에 구조화해줘',
      '초안을 더 명확한 문장으로 다듬어줘',
      '복잡한 문제를 단계별로 풀어줘',
    ]
  ),
  claude: createOverride(
    '긴 문서와 맥락 정리를 차분하게 해주는 신중한 AI',
    '솔직하게 말할게, 근데',
    [
      '긴 문서를 핵심만 남겨 요약해줘',
      '흩어진 아이디어를 논리 구조로 묶어줘',
      '애매한 표현을 질문형으로 다시 정리해줘',
    ]
  ),
  gemini: createOverride(
    '자료 비교, 빠른 브리핑, 검색형 정리에 강한 AI',
    '검색은 내가 제일 잘해',
    [
      '이 주제 핵심 정보만 빠르게 모아줘',
      '여러 자료의 공통점과 차이만 정리해줘',
      '긴 내용을 바로 공유할 브리핑으로 바꿔줘',
    ]
  ),
  perplexity: createOverride(
    '출처 확인과 최신 정보 정리에 강한 리서치 AI',
    '출처 없으면 답이 아니다',
    [
      '최신 자료를 출처와 함께 정리해줘',
      '이 주장과 관련된 근거 자료를 찾아줘',
      '기사 여러 개를 묶어 흐름만 요약해줘',
    ]
  ),
  grok: createOverride(
    '직설적 요약과 분위기 파악에 강한 대화형 AI',
    '돌려 말하기 싫어서',
    [
      '이 이슈를 직설적으로 요약해줘',
      '지금 분위기를 한 문단으로 정리해줘',
      '사람들이 불편해할 포인트를 먼저 짚어줘',
    ]
  ),
  deepseek: createOverride(
    '추론과 코드 문제 해결에 강한 분석형 AI',
    '깊이 파고들어야 답이 보여',
    [
      '문제를 단계별 추론으로 풀어줘',
      '이 코드 로직의 빈틈을 찾아줘',
      '왜 이 결론이 나오는지 과정까지 설명해줘',
    ]
  ),
  qwen: createOverride(
    '다국어 이해와 번역 감각이 좋은 언어형 AI',
    '몇 개 국어든 상관없어',
    [
      '이 문장을 자연스럽게 번역해줘',
      '한국어와 영어 표현 차이를 비교해줘',
      '긴 외국어 문서를 핵심만 정리해줘',
    ]
  ),
  lawyer: createOverride(
    '소송·법률자문 전문가',
    '말과 글로 엮어낸 가장 단단한 방패',
    [
      '이 계약에서 위험한 부분만 짚어줘',
      '지금 상황이 법적으로 문제인지 봐줘',
      '분쟁 전에 남겨둘 기록을 알려줘',
    ]
  ),
};

function normalizeOverride(expert: Expert, override: ExpertOverride): Expert {
  const sampleQuestions = override.sampleQuestions
    ? override.sampleQuestions
        .map((question) => question.trim())
        .filter(Boolean)
        .slice(0, MAX_SAMPLE_QUESTIONS)
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

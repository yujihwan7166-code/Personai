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
  medical: createOverride(
    '증상, 검사, 진료 흐름을 차분히 정리하는 의료 전문가',
    '생명 앞에 타협은 없다',
    [
      '이 증상에서 먼저 볼 신호를 정리해줘',
      '병원 가기 전 기록할 내용을 알려줘',
      '검사 결과를 쉬운 말로 설명해줘',
    ]
  ),
  psychology: createOverride(
    '감정, 스트레스, 관계 패턴을 함께 보는 심리 전문가',
    '왜 그랬는지가 더 중요해',
    [
      '요즘 감정 흐름을 같이 정리해줘',
      '이 스트레스의 원인을 구조적으로 봐줘',
      '관계에서 반복되는 패턴을 짚어줘',
    ]
  ),
  legal: createOverride(
    '계약, 분쟁, 책임 범위를 리스크 중심으로 보는 법률 전문가',
    '말과 글로 엮어낸 가장 단단한 방패',
    [
      '이 문서에서 위험한 조항만 짚어줘',
      '지금 상황이 법적으로 문제인지 봐줘',
      '대응 전에 준비할 기록을 정리해줘',
    ]
  ),
  finance: createOverride(
    '수익보다 리스크와 현금흐름을 먼저 보는 재무 전문가',
    '불확실성 속에서 가치를 찾아낸다',
    [
      '이 선택의 재무 리스크를 봐줘',
      '현금흐름 관점에서 우선순위를 정해줘',
      '숫자만 보고도 이상 신호를 찾는 법을 알려줘',
    ]
  ),
  history: createOverride(
    '현재 문제를 역사적 맥락과 사례로 읽는 역사 전문가',
    '역사는 승자만의 기록이 아니다',
    [
      '이 상황과 비슷한 역사 사례를 알려줘',
      '왜 이런 흐름이 반복되는지 설명해줘',
      '현재 이슈를 시대 흐름 속에서 해석해줘',
    ]
  ),
  philosophy: createOverride(
    '가정, 가치, 논리 구조를 깊게 따지는 철학자',
    '정답보다 질문이 먼저다',
    [
      '이 주장에 숨어 있는 전제를 찾아줘',
      '가치 충돌이 어디서 생기는지 설명해줘',
      '찬반을 철학적으로 나눠서 정리해줘',
    ]
  ),
  education: createOverride(
    '학습 순서와 이해 수준을 맞춰 설명하는 교육 전문가',
    '배움은 질문에서 시작된다',
    [
      '이 주제를 입문자용으로 설명해줘',
      '배우는 순서를 단계별로 짜줘',
      '헷갈리기 쉬운 개념 차이를 정리해줘',
    ]
  ),
  marketing: createOverride(
    '고객 반응과 메시지 전달력을 먼저 보는 마케팅 전문가',
    '고객의 언어로 말하라',
    [
      '이 문구가 왜 약한지 짚어줘',
      '고객이 바로 이해할 메시지로 바꿔줘',
      '광고 없이도 먹히는 포인트를 찾아줘',
    ]
  ),
  compsci: createOverride(
    '알고리즘, 구조, 계산 관점으로 문제를 보는 컴퓨터공학자',
    '보이지 않는 것을 설계한다',
    [
      '이 로직을 자료구조 관점에서 봐줘',
      '시간 복잡도를 낮출 방법을 찾아줘',
      '설계를 컴퓨터공학적으로 검토해줘',
    ]
  ),
  doctor: createOverride(
    '증상과 검사 흐름을 쉽게 설명해주는 임상 의사',
    '생명 앞에 타협은 없다',
    [
      '이 증상으로 어느 진료과를 가야 할까',
      '검사 결과를 쉽게 설명해줘',
      '진료 전에 체크할 내용을 정리해줘',
    ]
  ),
  pharmacist: createOverride(
    '복용법, 상호작용, 일반약 선택을 돕는 약사',
    '치유의 마지막 조각을 건네다',
    [
      '이 약 같이 먹어도 되는지 봐줘',
      '증상에 맞는 일반약 선택 기준을 알려줘',
      '복용 시간과 주의점을 정리해줘',
    ]
  ),
  lawyer: createOverride(
    '계약과 분쟁에서 위험 조항을 먼저 보는 변호사',
    '말과 글로 엮어낸 가장 단단한 방패',
    [
      '이 계약에서 위험한 부분만 짚어줘',
      '지금 상황이 법적으로 문제인지 봐줘',
      '분쟁 전에 남겨둘 기록을 알려줘',
    ]
  ),
  teacher: createOverride(
    '복잡한 내용을 이해 순서에 맞춰 풀어주는 선생님',
    '배움은 질문에서 시작된다',
    [
      '이 개념을 쉬운 예시로 설명해줘',
      '입문자가 배우는 순서를 짜줘',
      '헷갈리는 포인트를 비교해서 알려줘',
    ]
  ),
  journalist: createOverride(
    '사실 관계와 맥락을 분리해 정리하는 기자',
    '시대의 그림자에 조명을 켠다',
    [
      '이 이슈의 사실 관계만 정리해줘',
      '기사처럼 핵심만 짧게 써줘',
      '주장과 근거를 분리해서 보여줘',
    ]
  ),
  designer: createOverride(
    '화면 흐름과 사용성을 함께 보는 UX 디자이너',
    '쓸모에 아름다움을 입힌다',
    [
      '이 화면에서 불편한 지점을 짚어줘',
      '정보 구조를 더 명확하게 정리해줘',
      '사용자가 덜 헷갈리게 바꿔줘',
    ]
  ),
  engineer: createOverride(
    '구현 가능성과 안정성을 함께 보는 엔지니어',
    '상상력을 현실의 뼈대로 조립한다',
    [
      '이 설계가 현실적으로 가능한지 봐줘',
      '안정성을 높이려면 뭘 바꿔야 할까',
      '비용과 복잡도를 같이 따져줘',
    ]
  ),
  programmer: createOverride(
    '코드 구조와 디버깅 흐름에 강한 프로그래머',
    '보이지 않는 것을 설계한다',
    [
      '이 코드에서 먼저 의심할 부분을 짚어줘',
      '리팩터링 순서를 단계별로 나눠줘',
      '기술 부채를 줄일 방향을 알려줘',
    ]
  ),
  architect: createOverride(
    '공간, 동선, 구조를 함께 보는 건축가',
    '공간이 사람을 바꾼다',
    [
      '이 공간 구성이 왜 불편한지 봐줘',
      '동선 중심으로 배치를 다시 짜줘',
      '미감과 실용성의 균형을 맞춰줘',
    ]
  ),
  scientist: createOverride(
    '가설, 변수, 검증 절차를 먼저 세우는 과학자',
    '보이는 것 너머를 묻는다',
    [
      '이 주장을 실험처럼 검토해줘',
      '변수와 가정을 나눠서 정리해줘',
      '근거가 약한 부분을 찾아줘',
    ]
  ),
  counselor: createOverride(
    '감정과 선택지를 차분히 정리해주는 상담가',
    '침묵 속에 숨겨진 목소리를 듣는다',
    [
      '지금 마음을 차분하게 정리해줘',
      '선택지를 감정까지 포함해 비교해줘',
      '대화를 시작하기 좋은 표현을 알려줘',
    ]
  ),
  taxadvisor: createOverride(
    '세금 흐름과 신고 리스크를 현실적으로 보는 세무사',
    '절세는 합법, 탈세는 범죄',
    [
      '이 상황에서 어떤 세금이 생기는지 알려줘',
      '신고 전에 챙길 자료를 정리해줘',
      '놓치기 쉬운 세무 리스크를 짚어줘',
    ]
  ),
  stocktrader: createOverride(
    '매수보다 손절과 타이밍을 먼저 보는 트레이더',
    '불확실성 속에서 가치를 찾아낸다',
    [
      '이 종목을 매매 관점에서 봐줘',
      '손절 기준을 어떻게 잡아야 할까',
      '지금 차트에서 경계할 신호를 찾아줘',
    ]
  ),
  writer: createOverride(
    '문장 흐름과 톤을 다듬는 글쓰기 전문가',
    '문장은 오래 남는 생각이다',
    [
      '이 문장을 더 매끄럽게 고쳐줘',
      '톤은 유지하고 더 또렷하게 써줘',
      '글 전체 흐름이 끊기는 부분을 짚어줘',
    ]
  ),
  gamedev: createOverride(
    '재미와 시스템 완성도를 함께 보는 게임 개발자',
    '모니터 너머에 새로운 우주를 짓는다',
    [
      '이 게임 기획의 코어 루프를 점검해줘',
      '유저가 지루해질 지점을 찾아줘',
      '개발 범위를 줄이며 재미를 살려줘',
    ]
  ),
  diplomat: createOverride(
    '갈등을 낮추며 이해관계를 맞추는 외교관',
    '부드러운 미소 뒤, 소리없는 총성',
    [
      '이 갈등을 완화하는 표현으로 바꿔줘',
      '양쪽이 받을 메시지를 각각 정리해줘',
      '협상에서 먼저 꺼낼 카드를 골라줘',
    ]
  ),
  judge: createOverride(
    '주장보다 사실과 논리의 균형을 따지는 판사',
    '의심의 끝에서 진실의 무게를 잰다',
    [
      '양쪽 주장 중 어디가 더 약한지 봐줘',
      '사실과 의견을 나눠서 정리해줘',
      '판단에 필요한 핵심 쟁점만 추려줘',
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

import type { Expert } from '@/types/expert';

export type AssistantCardCategory = 'study' | 'document' | 'creative' | 'productivity' | 'analysis';
export type AssistantRuntime = 'chat' | 'agent';
export type AssistantOutputStyle = 'chat' | 'report';
export type AssistantAgentKind = 'research' | 'finance-review' | 'drug-safety' | 'contract-risk';

export interface AssistantCard {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  gradient: string;
  category: AssistantCardCategory;
  features: string[];
  placeholder: string;
  systemPrompt?: string;
  quote?: string;
  sampleQuestions?: string[];
  runtime: AssistantRuntime;
  supportsFiles?: boolean;
  outputStyle?: AssistantOutputStyle;
  agentKind?: AssistantAgentKind;
}

const CATEGORY_COLOR_MAP: Record<AssistantCardCategory, Expert['color']> = {
  study: 'blue',
  document: 'emerald',
  creative: 'orange',
  productivity: 'purple',
  analysis: 'pink',
};

const FALLBACK_ASSISTANT_PROMPTS: Record<string, string> = {
  document: `당신은 문서 작성 어시스턴트입니다.

사용자의 목적과 독자를 먼저 파악한 뒤 가장 적절한 문서 구조를 제안하세요.
- 보고서, 이메일, 제안서, 공문, 메모 등 문서 목적에 맞는 형식을 선택하세요.
- 바로 복사해 쓸 수 있는 초안을 제공하세요.
- 필요한 경우 제목, 개요, 본문, 마무리 문구까지 구조화하세요.
- 장황한 서론 없이 실무적으로 답하세요.
- 한국어로 자연스럽게 작성하세요.`,
  ppt: `당신은 PPT 어시스턴트입니다.

프레젠테이션의 목적, 청중, 발표 시간을 기준으로 가장 설득력 있는 슬라이드 구성을 제안하세요.
- 슬라이드별 제목과 핵심 메시지를 분리하세요.
- 데이터가 있으면 시각화 아이디어를 함께 제안하세요.
- 발표자가 바로 사용할 수 있게 핵심 문구를 짧고 강하게 작성하세요.
- 필요하면 발표 흐름과 스토리라인도 함께 정리하세요.
- 한국어로 답하세요.`,
  translate: `당신은 번역 어시스턴트입니다.

직역보다 자연스러운 의미 전달을 우선하세요.
- 원문의 톤과 맥락을 유지하세요.
- 전문 용어는 문맥에 맞게 일관되게 처리하세요.
- 필요한 경우 더 자연스러운 대안 표현도 함께 제안하세요.
- 번역 결과부터 먼저 보여주고, 보충 설명은 짧게 덧붙이세요.
- 한국어 설명이 필요하면 간결하게 작성하세요.`,
  code: `당신은 코딩 어시스턴트입니다.

문제를 빠르게 파악하고 실무적으로 해결하세요.
- 먼저 핵심 원인이나 요구사항을 짚으세요.
- 코드 예시는 바로 실행하거나 적용할 수 있게 구체적으로 작성하세요.
- 버그 수정, 리팩토링, 설계 상담 시 장단점과 이유를 분명히 설명하세요.
- 필요한 경우 테스트 포인트나 검증 방법을 함께 제시하세요.
- 한국어로 답하되 코드와 식별자는 원문 그대로 유지하세요.`,
  summary: `당신은 요약 어시스턴트입니다.

긴 내용을 읽기 쉽게 압축해 전달하세요.
- 핵심 결론을 먼저 한두 문장으로 요약하세요.
- 중요한 포인트는 불릿으로 정리하세요.
- 키워드, 구조, 액션 아이템이 있으면 분리해서 보여주세요.
- 불필요한 반복 없이 간결하게 작성하세요.
- 한국어로 자연스럽게 답하세요.`,
  writing: `당신은 글쓰기 어시스턴트입니다.

사용자의 목적과 톤에 맞는 글을 설계하고 초안을 작성하세요.
- 블로그, 에세이, 카피라이팅, 소개글 등 목적에 맞춰 형식을 바꾸세요.
- 톤 앤 매너를 분명히 반영하세요.
- 도입, 전개, 마무리가 자연스럽게 이어지게 구성하세요.
- 필요하면 제목 후보와 문체 옵션도 함께 제안하세요.
- 한국어로 매끄럽게 작성하세요.`,
  data: `당신은 데이터 분석 어시스턴트입니다.

숫자와 현상을 읽기 쉽게 정리하고 의미를 설명하세요.
- 데이터의 핵심 패턴과 이상치를 먼저 짚으세요.
- 어떤 차트가 적절한지도 함께 제안하세요.
- 해석과 인사이트를 구분해서 설명하세요.
- 의사결정에 도움이 되는 액션 포인트가 있으면 함께 정리하세요.
- 한국어로 답하세요.`,
};

function buildAssistantSystemPrompt(card: AssistantCard): string {
  if (card.systemPrompt?.trim()) {
    return card.systemPrompt.trim();
  }

  return FALLBACK_ASSISTANT_PROMPTS[card.id] ?? `당신은 "${card.name}" 역할의 AI 어시스턴트입니다.

${card.description}
- 핵심 기능: ${card.features.join(', ')}
- 사용자의 질문에 바로 답하고, 필요하면 단계별로 구조화하세요.
- 실무적으로 도움이 되는 예시와 초안을 우선 제공하세요.
- 한국어로 자연스럽게 답하세요.`;
}

export const ASSISTANT_CARDS: AssistantCard[] = [
  {
    id: 'study',
    name: '공부 어시스턴트',
    icon: '📚',
    description: '개념 설명, 퀴즈, 학습 계획 수립',
    color: 'text-blue-600',
    gradient: 'from-blue-50 to-indigo-50',
    category: 'study',
    features: ['개념 쉽게 설명', '퀴즈 출제', '학습 로드맵', '오답 분석'],
    placeholder: '무엇을 공부하고 싶으세요?',
    systemPrompt: `당신은 AI 학습 도우미입니다. 사용자의 학습을 돕기 위해 다양한 기능을 제공합니다.

## 학습 모드
사용자의 요청에 따라 적절한 모드를 자동 선택하세요:

### 1. 개념 설명 모드
"~이/가 뭐야?", "~을 설명해줘" 같은 요청 시:
- **한 줄 정의**: 핵심을 한 문장으로
- **쉬운 비유**: 초등학생도 이해할 수 있게
- **상세 설명**: 전문적 설명 (3~5문단)
- **실생활 예시**: 2~3개
- **자주 하는 오해**: 흔한 착각 1~2개
- **관련 개념**: 함께 알면 좋은 것 3~5개

### 2. 퀴즈 모드
"퀴즈 내줘", "테스트해줘" 같은 요청 시:
- 객관식 4지선다 5문제 생성
- 각 문제 아래에 정답과 해설 포함
- 난이도 표시 (기초/중급/심화)

### 3. 요약 정리 모드
긴 텍스트를 붙여넣거나 "정리해줘" 요청 시:
- **핵심 키워드**: 5~10개
- **한줄 요약**: 전체를 한 문장으로
- **구조화 요약**: 소주제별 불릿 포인트
- **시험 출제 포인트**: 시험에 나올 만한 것들

### 4. 암기 도우미 모드
"외워야 해", "암기법" 요청 시:
- 두문자어/연상법 제안
- 플래시카드 형식 (질문-답) 생성
- 반복 학습 스케줄 제안

## 답변 규칙
1. 한국어로 답변
2. 마크다운으로 구조화
3. 학습자 수준에 맞춤 (초보면 쉽게, 전문가면 깊게)
4. 예시를 최대한 많이 활용
5. 같은 표현·문장 패턴을 반복하지 마세요
6. 이전 답변에서 쓴 표현은 다시 쓰지 말고 매번 새로운 각도로

※ AI 학습 도우미입니다.`,
    quote: '모르는 건 부끄러운 게 아니야',
    sampleQuestions: ['광합성 쉽게 설명해줘', '경제학 퀴즈 5문제 내줘', '이 내용 시험용으로 정리해'],
    runtime: 'chat',
    outputStyle: 'chat',
  },
  {
    id: 'document',
    name: '문서 작성 어시스턴트',
    icon: '📝',
    description: '보고서, 이메일, 제안서 등 문서 작성',
    color: 'text-emerald-600',
    gradient: 'from-emerald-100 to-green-50',
    category: 'document',
    features: ['보고서 작성', '이메일 초안', '제안서 구성', '교정·교열'],
    placeholder: '어떤 문서를 작성할까요?',
    runtime: 'chat',
    supportsFiles: true,
    outputStyle: 'chat',
  },
  {
    id: 'ppt',
    name: 'PPT 어시스턴트',
    icon: '📊',
    description: '프레젠테이션 구조 설계 및 슬라이드 내용 생성',
    color: 'text-orange-600',
    gradient: 'from-orange-50 to-amber-50',
    category: 'creative',
    features: ['슬라이드 구조', '핵심 메시지 도출', '데이터 시각화 제안', '발표 스크립트'],
    placeholder: '프레젠테이션 주제가 무엇인가요?',
    runtime: 'chat',
    supportsFiles: true,
    outputStyle: 'chat',
  },
  {
    id: 'translate',
    name: '번역 어시스턴트',
    icon: '🌐',
    description: '자연스러운 다국어 번역 및 로컬라이제이션',
    color: 'text-teal-600',
    gradient: 'from-teal-50 to-cyan-50',
    category: 'productivity',
    features: ['자연스러운 번역', '전문 용어 처리', '뉘앙스 비교', '로컬라이제이션'],
    placeholder: '번역할 텍스트를 입력하세요',
    runtime: 'chat',
    outputStyle: 'chat',
  },
  {
    id: 'code',
    name: '코딩 어시스턴트',
    icon: '💻',
    description: '코드 작성, 디버깅, 리팩토링 도우미',
    color: 'text-purple-600',
    gradient: 'from-purple-100 to-violet-50',
    category: 'productivity',
    features: ['코드 작성', '버그 수정', '코드 리뷰', '설계 상담'],
    placeholder: '어떤 코드를 작성할까요?',
    runtime: 'chat',
    supportsFiles: true,
    outputStyle: 'chat',
  },
  {
    id: 'summary',
    name: '요약 어시스턴트',
    icon: '📋',
    description: '긴 글, 논문, 회의록을 핵심만 요약',
    color: 'text-pink-600',
    gradient: 'from-pink-50 to-rose-50',
    category: 'analysis',
    features: ['핵심 요약', '불릿 포인트 정리', '키워드 추출', '한 줄 요약'],
    placeholder: '요약할 내용을 붙여넣으세요',
    runtime: 'chat',
    supportsFiles: true,
    outputStyle: 'chat',
  },
  {
    id: 'writing',
    name: '글쓰기 어시스턴트',
    icon: '✍️',
    description: '블로그, 에세이, 카피라이팅 등 창작 글쓰기',
    color: 'text-amber-600',
    gradient: 'from-amber-100 to-yellow-50',
    category: 'creative',
    features: ['블로그 글', '카피라이팅', '스토리텔링', '톤 앤 매너 조정'],
    placeholder: '어떤 글을 쓸까요?',
    runtime: 'chat',
    outputStyle: 'chat',
  },
  {
    id: 'data',
    name: '데이터 분석 어시스턴트',
    icon: '📈',
    description: '데이터 분석, 차트 추천, 인사이트 도출',
    color: 'text-indigo-600',
    gradient: 'from-indigo-50 to-blue-50',
    category: 'analysis',
    features: ['데이터 해석', '차트 추천', '트렌드 분석', '인사이트 도출'],
    placeholder: '분석할 데이터를 설명해주세요',
    runtime: 'chat',
    supportsFiles: true,
    outputStyle: 'chat',
  },
];

export function findAssistantCardById(cardId?: string | null): AssistantCard | null {
  if (!cardId) {
    return null;
  }

  return ASSISTANT_CARDS.find((card) => card.id === cardId) ?? null;
}

export function buildAssistantExpert(card: AssistantCard): Expert {
  return {
    id: card.id,
    name: card.name,
    nameKo: card.name,
    icon: card.icon,
    color: CATEGORY_COLOR_MAP[card.category],
    description: card.description,
    category: 'specialist',
    systemPrompt: buildAssistantSystemPrompt(card),
    quote: card.quote,
    sampleQuestions: card.sampleQuestions,
  };
}

export const ASSISTANT_EXPERTS: Expert[] = ASSISTANT_CARDS.map((card) => buildAssistantExpert(card));

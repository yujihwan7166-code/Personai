import type { Expert } from '@/types/expert';

export type AssistantCardCategory = 'productivity' | 'study' | 'work' | 'life' | 'analysis' | 'content';


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
  productivity: 'purple',
  study: 'blue',
  work: 'emerald',
  life: 'orange',
  analysis: 'pink',
  content: 'amber',
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
  // ── 생산성 ──
  { id: 'translate', name: '다국어 번역', icon: '🌐', description: '자연스러운 다국어 번역 및 로컬라이제이션', color: 'text-purple-600', gradient: 'from-purple-50 to-violet-50', category: 'productivity', features: ['자연스러운 번역', '전문 용어', '뉘앙스 비교'], placeholder: '번역할 텍스트를 입력하세요', sampleQuestions: ['이 문장을 영어로 번역해줘', '비즈니스 이메일을 일본어로 바꿔줘'], runtime: 'chat' },
  { id: 'file-convert', name: '파일 변환', icon: '📁', description: '문서 포맷 변환 및 텍스트 추출', color: 'text-purple-600', gradient: 'from-purple-50 to-violet-50', category: 'productivity', features: ['포맷 변환', '텍스트 추출'], placeholder: '변환할 파일을 업로드하세요', sampleQuestions: ['엑셀을 CSV로 변환해줘', 'Word 파일에서 텍스트 추출해줘'], runtime: 'chat', supportsFiles: true },

  // ── 학습 ──
  { id: 'math', name: '수학 튜터', icon: '📐', description: '수학 문제 단계별 풀이 및 개념 설명', color: 'text-blue-600', gradient: 'from-blue-50 to-indigo-50', category: 'study', features: ['단계별 풀이', '공식 설명', '개념 정리'], placeholder: '수학 문제를 입력하세요', sampleQuestions: ['이 미적분 문제 풀어줘', '확률 공식 정리해줘'], runtime: 'chat' },

  // ── 업무 ──
  { id: 'document', name: '문서 작성', icon: '📝', description: '보고서, 이메일, 제안서 등 문서 작성', color: 'text-emerald-600', gradient: 'from-emerald-50 to-green-50', category: 'work', features: ['보고서', '이메일', '제안서'], placeholder: '어떤 문서를 작성할까요?', sampleQuestions: ['월간 보고서 초안 작성해줘', '거래처 이메일 초안 써줘'], runtime: 'chat', supportsFiles: true },
  { id: 'ppt', name: 'PPT 생성', icon: '📊', description: '프레젠테이션 슬라이드 구조 설계 및 내용 생성', color: 'text-emerald-600', gradient: 'from-emerald-50 to-green-50', category: 'work', features: ['슬라이드 구조', '핵심 메시지', '스크립트'], placeholder: '발표 주제가 무엇인가요?', sampleQuestions: ['AI 트렌드 발표자료 만들어줘', '10장짜리 사업 제안 PPT 구성해줘'], runtime: 'chat', supportsFiles: true },
  { id: 'resume', name: '자소서 첨삭', icon: '📄', description: '이력서 및 자기소개서 작성·첨삭', color: 'text-emerald-600', gradient: 'from-emerald-50 to-green-50', category: 'work', features: ['이력서', '자소서', '첨삭'], placeholder: '자소서를 붙여넣으세요', sampleQuestions: ['이 자소서 첨삭해줘', 'IT 직무 이력서 작성해줘'], runtime: 'chat', supportsFiles: true },
  { id: 'legal', name: '법률 검토', icon: '⚖️', description: '법률 조항 해석 및 계약서 리스크 분석', color: 'text-emerald-600', gradient: 'from-emerald-50 to-green-50', category: 'work', features: ['조항 해석', '리스크 분석', '계약 검토'], placeholder: '검토할 내용을 입력하세요', sampleQuestions: ['이 계약 조항 해석해줘', '근로계약서 리스크 체크해줘'], runtime: 'chat', supportsFiles: true },

  // ── 생활 ──
  { id: 'saving', name: '절약 도우미', icon: '💰', description: '가계부 분석, 절약 팁, 지출 최적화', color: 'text-orange-600', gradient: 'from-orange-50 to-amber-50', category: 'life', features: ['가계부 분석', '절약 팁', '지출 최적화'], placeholder: '지출 내역을 알려주세요', sampleQuestions: ['월 200만원으로 절약 계획 세워줘', '불필요한 구독 찾아줘'], runtime: 'chat' },

  // ── 분석 ──
  { id: 'voice-analysis', name: '음성 분석', icon: '🎙️', description: '음성 데이터 분석 및 텍스트 변환', color: 'text-pink-600', gradient: 'from-pink-50 to-rose-50', category: 'analysis', features: ['음성→텍스트', '회의 요약', '발화 분석'], placeholder: '음성 파일을 업로드하세요', sampleQuestions: ['이 회의 녹음 요약해줘', '음성 파일을 텍스트로 변환해줘'], runtime: 'chat', supportsFiles: true },
  { id: 'chart', name: '차트 제작', icon: '📈', description: '데이터 기반 차트 및 그래프 생성', color: 'text-pink-600', gradient: 'from-pink-50 to-rose-50', category: 'analysis', features: ['차트 생성', '데이터 시각화', '그래프 추천'], placeholder: '시각화할 데이터를 입력하세요', sampleQuestions: ['매출 데이터로 막대 차트 만들어줘', '이 데이터에 맞는 차트 추천해줘'], runtime: 'chat', supportsFiles: true },
  { id: 'trend', name: '트렌드 분석', icon: '🔥', description: '시장 트렌드 분석 및 미래 예측', color: 'text-pink-600', gradient: 'from-pink-50 to-rose-50', category: 'analysis', features: ['트렌드 분석', '시장 예측', '키워드 분석'], placeholder: '어떤 분야의 트렌드인가요?', sampleQuestions: ['2025 AI 시장 트렌드 분석해줘', 'MZ세대 소비 트렌드 알려줘'], runtime: 'chat' },
  { id: 'youtube-analysis', name: '유튜브 영상 분석', icon: '▶️', description: '유튜브 영상 구조, 썸네일, SEO 분석', color: 'text-pink-600', gradient: 'from-pink-50 to-rose-50', category: 'analysis', features: ['영상 구조 분석', '썸네일 평가', 'SEO 분석'], placeholder: '유튜브 영상 URL을 입력하세요', sampleQuestions: ['이 영상 구조 분석해줘', '조회수 높이는 전략 알려줘'], runtime: 'chat' },

  // ── 콘텐츠 ──
  { id: 'image-gen', name: '이미지 만들기', icon: '🎨', description: 'AI 이미지 생성 프롬프트 작성 도우미', color: 'text-amber-600', gradient: 'from-amber-50 to-yellow-50', category: 'content', features: ['프롬프트 작성', '스타일 추천', '이미지 기획'], placeholder: '어떤 이미지를 만들까요?', sampleQuestions: ['미니멀한 로고 프롬프트 작성해줘', '블로그 썸네일 이미지 기획해줘'], runtime: 'chat' },
  { id: 'logo', name: '로고 아이디어', icon: '✏️', description: '브랜드 로고 컨셉 및 디자인 가이드', color: 'text-amber-600', gradient: 'from-amber-50 to-yellow-50', category: 'content', features: ['로고 컨셉', '브랜딩', '디자인 가이드'], placeholder: '어떤 브랜드인가요?', sampleQuestions: ['카페 로고 아이디어 3개 제안해줘', '테크 스타트업 로고 컨셉 잡아줘'], runtime: 'chat' },
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

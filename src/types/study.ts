export type StudySourceKind = 'paste' | 'url' | 'youtube' | 'recording' | 'pdf' | 'pptx' | 'docx';

export interface StudySource {
  id: string;
  kind: StudySourceKind;
  title: string;
  content: string;
  url?: string;
  /** 썸네일 이미지 (data URL 또는 외부 URL). 카드 미리보기용. */
  thumbnail?: string;
  addedAt: number;
  enabled: boolean;
  status: 'ready' | 'processing' | 'error';
  errorMessage?: string;
  /** IndexedDB 블롭 저장소 키. 원본 파일을 다시 렌더하기 위해 사용. */
  blobRef?: string;
  /** 원본 MIME 타입 (뷰어 분기용). */
  mimeType?: string;
  /** PDF 페이지 수 / PPTX 슬라이드 수. */
  pageCount?: number;
  /** 'native' = 원본 렌더, 'text' = 텍스트 폴백. blobRef 없거나 파싱 실패 시 'text'. */
  renderMode?: 'native' | 'text';
}

export type StudyLens = 'summary' | 'keypoints' | 'mindmap' | 'quiz' | 'guide' | 'debate';
export type StudyTone = 'plain' | 'student' | 'exam' | 'interview' | 'kid';
export type StudyLevel = 'basic' | 'standard' | 'advanced';

export interface LensOutput {
  lens: StudyLens;
  content: string;
  tone: StudyTone;
  level: StudyLevel;
  generatedAt: number;
  meta?: Record<string, unknown>;
}

export interface StudyQuizItem {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  concept?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  concept?: string;
  ease: number;
  intervalDays: number;
  dueAt: number;
  reviewsCount: number;
  lastReviewedAt?: number;
}

export interface WrongAnswer {
  id: string;
  quizItemId: string;
  question: string;
  correct: string;
  chosen: string;
  explanation: string;
  concept?: string;
  missedAt: number;
  reviewedCount: number;
}

export interface StudyChatTurn {
  id: string;
  role: 'user' | 'assistant' | 'expertA' | 'expertB';
  content: string;
  name?: string;
  createdAt: number;
  citations?: number[];
}

export type HighlightColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface Highlight {
  id: string;
  turnId: string;
  text: string;
  color: HighlightColor;
  createdAt: number;
}

export interface StudyNotebook {
  id: string;
  title: string;
  icon: string;
  sources: StudySource[];
  lensOutputs: Partial<Record<StudyLens, LensOutput>>;
  quizItems: StudyQuizItem[];
  flashcards: Flashcard[];
  wrongAnswers: WrongAnswer[];
  chat: StudyChatTurn[];
  highlights?: Highlight[];
  createdAt: number;
  updatedAt: number;
  chatMode: 'explain' | 'socratic';
  debatePartners?: { expertAId?: string; expertBId?: string };
  folderId?: string;
  description?: string;
  pinned?: number;
  color?: string;
}

export interface NotebookTemplate {
  id: string;
  title: string;
  icon: string;
  description: string;
  sampleSource?: { title: string; content: string };
}

export const NOTEBOOK_TEMPLATES: NotebookTemplate[] = [
  {
    id: 'blank',
    title: '빈 노트북',
    icon: '📘',
    description: '자유롭게 시작하기',
  },
  {
    id: 'english',
    title: '영어 단어장',
    icon: '🔤',
    description: '단어·예문 중심 학습',
    sampleSource: {
      title: '기초 영단어 샘플',
      content: `기초 영단어 20선 — 뜻·예문·사용 맥락

1. **achieve** (성취하다): He worked hard to achieve his goals. 동사적 맥락에서 "목표·결과를 얻다".
2. **brilliant** (뛰어난): The solution was brilliant. 지적 우수성 + 밝게 빛나는 이중 의미.
3. **crucial** (결정적): Timing is crucial in sports. "중요한"보다 더 강한 "핵심 분수령".
4. **determine** (결정·결심하다): The committee will determine the outcome. 공식적 판단 맥락.
5. **efficient** (효율적): The engine is highly efficient. 투입 대비 산출이 큼.
6. **fundamental** (기본적·근본적): Trust is fundamental to friendship. 빼면 성립 안 하는 요소.
7. **genuine** (진짜의·진심 어린): a genuine smile. "가짜가 아닌" 뉘앙스.
8. **hesitate** (망설이다): Don't hesitate to ask. 부정형으로 권유할 때 자주 쓰임.
9. **initial** (처음의): My initial reaction was surprise. 이후 변할 수 있음을 암시.
10. **justify** (정당화하다): Can you justify this expense? 이유·근거를 요구함.
11. **maintain** (유지하다): The car needs regular maintenance. 상태를 유지하는 행위.
12. **obvious** (분명한): It's obvious he's tired. 누구나 알아볼 수 있음.
13. **persuade** (설득하다): She persuaded me to join. 상대 의사를 변화시킴.
14. **reluctant** (꺼리는): I'm reluctant to agree. 내키지 않지만 거부까진 아님.
15. **significant** (상당한·의미있는): a significant difference. 규모 또는 의미.
16. **tend to** (~하는 경향): People tend to exaggerate online. 습관적 경향.
17. **variety** (다양성): a variety of options. 종류의 다름.
18. **witness** (목격하다): He witnessed the accident. 법적·공식 맥락에서도 자주 쓰임.
19. **yield** (산출하다·양보하다): The investment yielded 10%. / Yield to oncoming traffic.
20. **zeal** (열정): her zeal for justice. 행동을 강하게 밀어붙이는 감정.`,
    },
  },
  {
    id: 'exam',
    title: '시험 대비',
    icon: '📝',
    description: '개념 정리 + 기출 유형',
    sampleSource: {
      title: '경제학 원론 샘플',
      content: `경제학 원론 — 핵심 개념 요약

**1. 기회비용(Opportunity Cost)**
어떤 선택을 할 때 포기한 대안 중 가장 가치 있는 것. 예: 대학 진학의 기회비용은 그 시간에 일했다면 벌 수 있었던 소득과 누릴 수 있었던 경험.

**2. 한계효용 체감의 법칙(Law of Diminishing Marginal Utility)**
재화 소비량이 늘어날수록 추가 단위에서 얻는 효용은 점점 작아진다. 첫 번째 피자 조각이 세 번째보다 훨씬 만족스럽다.

**3. 수요·공급 법칙**
가격이 오르면 수요량 감소·공급량 증가, 가격이 내리면 반대. 균형점에서 거래가 성립.

**4. 탄력성(Elasticity)**
가격 변화에 수요량이 얼마나 반응하는가. 필수품(쌀, 약)은 비탄력적, 사치품은 탄력적.

**5. 시장 실패(Market Failure)**
외부효과, 공공재, 정보 비대칭, 독점 등으로 자원 배분이 최적이 안 되는 경우. 정부 개입의 이론적 근거.

**6. GDP와 GNI의 차이**
GDP는 영토 기준, GNI는 국민 기준. 해외 근로 소득은 GNI에만 포함.

**7. 인플레이션의 원인**
수요 견인(수요 > 공급), 비용 인상(원자재·임금 상승), 통화량 증가.

**8. 비교우위(Comparative Advantage)**
절대적으로 뒤처져도 상대적으로 덜 뒤처지는 분야가 있다면 그 분야에 특화해 교역하면 둘 다 이득. 국제무역의 논리적 기초.`,
    },
  },
  {
    id: 'book',
    title: '책 한 권',
    icon: '📖',
    description: '독서 노트·핵심 정리',
    sampleSource: {
      title: '《생각에 관한 생각》 1부 샘플',
      content: `『생각에 관한 생각』 (대니얼 카너먼) — 1부 요약

카너먼은 인간 사고를 두 시스템으로 나눈다.

**시스템 1**: 빠르고 자동적이며 직관적. 감정적 반응, 익숙한 패턴 인식, 즉각적 판단을 담당. 노력 없이 작동하지만 편향에 취약하다.

**시스템 2**: 느리고 의식적이며 논리적. 복잡한 계산, 신중한 추론, 자제력을 담당. 에너지가 많이 들어서 게으르게 작동한다.

**핵심 주장**: 우리는 대부분의 시간을 시스템 1에 의존하며, 시스템 2는 시스템 1의 결론을 검증하기보다 사후 합리화한다. 이 때문에 체계적인 인지 편향이 발생한다.

**주요 편향 예시**
- **가용성 휴리스틱**: 쉽게 떠오르는 사례로 빈도를 판단 (비행기 사고 뉴스 → 비행기 위험하다 과대평가).
- **대표성 휴리스틱**: 전형적 이미지와 일치하면 확률이 높다고 판단 (도서관 사서 vs 농부 사례).
- **닻 내리기(앵커링)**: 처음 제시된 숫자가 이후 판단을 왜곡.
- **손실 회피**: 같은 크기의 이득보다 손실을 약 2배로 크게 느낌.

**실용적 시사점**: 중요한 결정일수록 시스템 2를 의식적으로 작동시켜야 한다. 직관이 강하게 작동할수록 점검이 필요하다.`,
    },
  },
  {
    id: 'lecture',
    title: '강의 필기',
    icon: '🎓',
    description: '수업·강연 내용 정리',
    sampleSource: {
      title: '컴퓨터과학 개론 샘플',
      content: `[강의 발췌] 컴퓨터과학 개론 — 알고리즘의 복잡도

오늘은 알고리즘 분석의 기초인 시간 복잡도(Time Complexity)를 다룬다.

**Big-O 표기법**
입력 크기 n이 커질 때 알고리즘이 필요로 하는 연산 횟수의 상한을 표현. 상수 계수와 저차항은 무시.

예: 3n² + 5n + 2 → O(n²)

**흔한 복잡도 등급 (낮음 → 높음)**
- O(1) 상수: 배열 인덱스 접근
- O(log n) 로그: 이진 탐색
- O(n) 선형: 배열 전체 순회
- O(n log n) 선형로그: 효율적 정렬(머지·퀵)
- O(n²) 제곱: 버블 정렬, 이중 반복문
- O(2^n) 지수: 순진한 피보나치 재귀

**왜 중요한가**
n = 1,000일 때:
- O(n)은 1,000번
- O(n²)은 1,000,000번
- O(2^n)은 약 10^301번 — 우주 시간으로도 못 푼다.

**실전 조언**
1. 정렬이 필요하면 O(n log n)을 목표로.
2. 중첩 반복문이 보이면 O(n²)를 의심하고 해시맵으로 줄일 수 있는지 확인.
3. 재귀는 메모이제이션으로 지수를 다항으로 낮출 수 있다.

다음 시간: 공간 복잡도와 메모리 트레이드오프.`,
    },
  },
];

export const NOTEBOOK_ICON_PRESETS = [
  '📘', '📗', '📕', '📙', '📒', '📓',
  '📔', '📖', '🔤', '📐', '📝', '🎓',
  '🎨', '💻', '🔬', '⚖️', '💊', '💰',
  '📊', '🌐', '🎵', '🏃', '🗺️', '🧠',
] as const;

export interface StudyFolder {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

export const FOLDER_COLORS = [
  '#0F172A', // slate-900 (기본)
  '#1E40AF', // blue-800
  '#0E7490', // cyan-700
  '#166534', // green-800
  '#854D0E', // yellow-800
  '#C2410C', // orange-700
  '#B91C1C', // red-700
  '#9F1239', // rose-800
  '#7E22CE', // purple-700
  '#4338CA', // indigo-700
] as const;

export const HIGHLIGHT_META: Record<HighlightColor, { label: string; role: string; swatch: string; ring: string }> = {
  yellow: { label: '중요', role: '핵심', swatch: 'bg-yellow-300', ring: 'ring-yellow-400' },
  pink: { label: '헷갈림', role: '오답 후보', swatch: 'bg-pink-300', ring: 'ring-pink-400' },
  blue: { label: '보충 필요', role: '추가 학습', swatch: 'bg-sky-300', ring: 'ring-sky-400' },
  green: { label: '암기', role: '플래시카드', swatch: 'bg-emerald-300', ring: 'ring-emerald-400' },
};

export interface StudyStreak {
  lastStudyDate: string;
  streakDays: number;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyNotebook(title = '새 노트북', icon = '📘'): StudyNotebook {
  const now = Date.now();
  return {
    id: newId('nb'),
    title,
    icon,
    sources: [],
    lensOutputs: {},
    quizItems: [],
    flashcards: [],
    wrongAnswers: [],
    chat: [],
    createdAt: now,
    updatedAt: now,
    chatMode: 'explain',
  };
}

export const LENS_META: Record<StudyLens, { label: string; icon: string; tintClass: string; ringClass: string; accentText: string; lucide: string }> = {
  summary: { label: '요약', icon: '📝', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'FileText' },
  keypoints: { label: '핵심 포인트', icon: '⭐', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Sparkles' },
  mindmap: { label: '마인드맵', icon: '🧠', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'GitBranch' },
  quiz: { label: '퀴즈', icon: '🎯', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Target' },
  guide: { label: '학습 가이드', icon: '🗺️', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Map' },
  debate: { label: '2인 토론', icon: '💬', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'MessagesSquare' },
};

export const TONE_META: Record<StudyTone, string> = {
  plain: '기본',
  student: '학생용',
  exam: '시험 대비',
  interview: '면접용',
  kid: '초등생',
};

export const LEVEL_META: Record<StudyLevel, string> = {
  basic: '기초',
  standard: '표준',
  advanced: '심화',
};

export function countDueCards(nb: StudyNotebook, now = Date.now()): number {
  return nb.flashcards.filter((c) => c.dueAt <= now).length;
}

export type StudyPaneKind = 'sources' | 'chat' | 'studio';
export type StudyLayoutMode = 1 | 2 | 3;

export interface StudyLayoutPrefs {
  mode: StudyLayoutMode;
  slots: StudyPaneKind[];
  lockSourceLeft: boolean;
  /** 각 슬롯의 비율 (합이 1에 가까울 필요는 없음; flex에 그대로 적용) */
  weights?: number[];
}

export const DEFAULT_LAYOUT_PREFS: StudyLayoutPrefs = {
  mode: 3,
  slots: ['sources', 'chat', 'studio'],
  lockSourceLeft: false,
  weights: [22, 50, 28],
};

export const PANE_META: Record<StudyPaneKind, { label: string; icon: string }> = {
  sources: { label: '원본', icon: '📄' },
  chat: { label: '대화', icon: '💬' },
  studio: { label: '스튜디오', icon: '✨' },
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

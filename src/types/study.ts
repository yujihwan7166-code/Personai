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
  /** 업로드 시 감지된, 텍스트가 거의 없는 스캔본 페이지 번호들. OCR 대상. */
  scanPages?: number[];
  /** User-requested OCR pages. These bypass automatic scan-page detection for manual recovery. */
  forcedOcrPages?: number[];
  /** OCR 자동 시작 여부. 스캔/이미지 페이지가 있는 PDF 면 true. */
  ocrEnabled?: boolean;
  /** PDF native 텍스트(extractPdfMeta 원본). OCR/Vision 으로 덮어쓰지 않는 보존 필드.
   *  page-level merge 시 native 가 OCR 보다 정확한 페이지에서 fallback 으로 사용. */
  nativeText?: string;
  /** PDF 의 outline/bookmark 평탄화 결과 (Phase 3).
   *  AI 챕터 추측보다 정확한 TOC 가 있으면 챕터 경계 결정의 ground truth 로 사용. */
  outline?: Array<{ title: string; page: number; depth: number }>;
}

export type StudyLens = 'summary' | 'keypoints' | 'mindmap' | 'quiz' | 'guide' | 'debate' | 'flashcards' | 'podcast' | 'diagram';
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

/* ── 노트정리: 페이지별 모드 ── */
export type PageNoteStatus = 'pending' | 'oneLiner' | 'full' | 'skipped' | 'error';
export type PageNoteKind = 'text' | 'image-only';
export type SummaryDensity = 'oneline' | 'standard' | 'detailed';

export interface PageNote {
  page: number;
  title?: string;
  oneLiner: string;
  body?: string;
  kind?: PageNoteKind;
  status: PageNoteStatus;
  generatedAt?: number;
}

export interface PageNoteGroup {
  id: string;
  title: string;
  pageRange: [number, number];
  pages: number[];
}

/** AI 가 자료를 의미 단위로 4~8개로 잘라낸 챕터(덩어리). 각 챕터는 자체 요약을 가진다. */
export interface PageChunk {
  id: string;
  /** 시작·끝 페이지 (포함) */
  range: [number, number];
  /** 챕터에 포함된 페이지 번호 배열 */
  pages: number[];
  /** 챕터 제목 (예: "간 해부학") */
  title: string;
  /** 챕터 요약 (마크다운 2~4문장) */
  summary: string;
}

export interface SummaryStructured {
  mode: 'whole' | 'pages';
  pages?: {
    notes: PageNote[];
    /** 챕터(덩어리) 단위 그룹 — 메인 UI 의 아코디언 항목 */
    chunks?: PageChunk[];
    /** @deprecated 이전 버전 그룹 — chunks 로 대체 */
    groups?: PageNoteGroup[];
    density: SummaryDensity;
    /** true = 페이지를 이미지로 보내 비전 모델로 생성. 스캔본 PDF 등에 사용. */
    vision?: boolean;
    /** 비전 모드 시 PDF blob 식별 (재로드용) */
    sourceBlobRef?: string;
  };
}

export interface StudyQuizItem {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  concept?: string;
}

/* ── 도식 (비주얼 설명) ── */
export type DiagramKind = 'flowchart' | 'timeline' | 'comparison' | 'cause' | 'tree' | 'sequence';

export interface ComparisonTable {
  columns: string[];
  rows: Array<{ label: string; cells: string[] }>;
}

export interface DiagramVariant {
  mermaid?: string;
  table?: ComparisonTable;
  caption?: string;
  generatedAt: number;
}

export interface DiagramItem {
  id: string;
  title: string;
  kind: DiagramKind;
  kindLabel?: string;
  concept: string;
  focus?: string;
  mermaid?: string;
  table?: ComparisonTable;
  caption?: string;
  /** 사용자가 직접 수정한 Mermaid 코드. 있으면 mermaid 보다 우선 렌더. */
  userEditedMermaid?: string;
  /** 다른 유형 캐시: flowchart 로 만든 걸 사용자가 timeline 으로 전환하면 여기에 저장. */
  variants?: Partial<Record<DiagramKind, DiagramVariant>>;
  /** 노드별 이해도. Mermaid 노드 id 기준. */
  nodeStates?: Record<string, MindmapNodeStatus>;
  /** 마인드맵 노드에서 파생된 경우 원 노드 id. */
  originNodeId?: string;
  pageRefs?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface DiagramConceptSuggestion {
  concept: string;
  kind: DiagramKind;
  reason?: string;
}

export const DIAGRAM_KIND_META: Record<DiagramKind, { label: string; hint: string; emoji: string; example: string }> = {
  flowchart:  { label: '플로우',   hint: '프로세스·절차·의사결정 흐름', emoji: '', example: '혈액 순환' },
  timeline:   { label: '타임라인', hint: '시간 순서·연대기',            emoji: '', example: '프랑스 혁명' },
  comparison: { label: '비교표',   hint: 'A vs B 대조',                 emoji: '', example: '자본주의 vs 공산주의' },
  cause:      { label: '인과',     hint: '원인 → 결과 체인',            emoji: '', example: '인플레이션 원인' },
  tree:       { label: '트리',     hint: '계층·분류 구조',              emoji: '', example: '조직 구조' },
  sequence:   { label: '시퀀스',   hint: '상호작용·주고받음 순서',      emoji: '', example: '요청·응답' },
};

/* ── 팟캐스트 ── */
export type PodcastPurpose = 'exam' | 'overview' | 'review' | 'briefing' | 'deep-dive';
export type PodcastLength = 'short' | 'standard' | 'long'; // 3 / 5 / 10 분
export type PodcastTone = 'friendly' | 'serious' | 'lecture';

export interface PodcastLine {
  speaker: 'A' | 'B';
  text: string;
  /** TTS 합성 뒤의 누적 시작 오프셋(초). 자막 싱크용. */
  startAt?: number;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  purpose: PodcastPurpose;
  purposeLabel?: string;
  length: PodcastLength;
  tone: PodcastTone;
  focus?: string;
  script: PodcastLine[];
  /** 서버 TTS 로 생성된 통합 mp3 블롭 키 (IndexedDB). Phase B 전용, 없으면 브라우저 TTS 로 재생. */
  audioBlobRef?: string;
  durationSec?: number;
  createdAt: number;
  updatedAt: number;
  lastPlayedAt?: number;
  playCount?: number;
}

export const PODCAST_PURPOSE_META: Record<PodcastPurpose | 'auto', { label: string; hint: string }> = {
  exam:       { label: '시험 대비', hint: '출제 포인트·틀리기 쉬운 지점' },
  overview:   { label: '개요',       hint: '균형 잡힌 입문 설명' },
  review:     { label: '재정리',     hint: '강의 구조 다시 정리' },
  briefing:   { label: '브리핑',     hint: '짧은 요점 전달' },
  'deep-dive':{ label: '심화',       hint: '배경·응용까지 깊이' },
  auto:       { label: '자동',       hint: '자료에 맞춰 선택' },
};

export const PODCAST_LENGTH_META: Record<PodcastLength, { label: string; minutes: number }> = {
  short:    { label: '짧게 · 3분',  minutes: 3 },
  standard: { label: '표준 · 5분',  minutes: 5 },
  long:     { label: '깊게 · 10분', minutes: 10 },
};

export const PODCAST_TONE_META: Record<PodcastTone, string> = {
  friendly: '친근한',
  serious:  '진지한',
  lecture:  '강의형',
};

export interface QuizDeck {
  id: string;
  name: string;
  /** 사용자가 입력한 자유 범위/주제. */
  focus?: string;
  count: number;
  level: StudyLevel;
  tone: StudyTone;
  useWeakConcepts: boolean;
  createdAt: number;
  updatedAt: number;
  items: StudyQuizItem[];
  lastPlayedAt?: number;
  lastScore?: { correct: number; total: number };
  playCount?: number;
}

export type FlashcardCardType = 'definition' | 'example' | 'comparison' | 'mechanism';

export interface FlashcardDeck {
  id: string;
  name: string;
  /** 사용자가 입력한 자유 범위/주제. */
  focus?: string;
  /** 카드 유형 다중 선택. 비어있으면 "골고루". */
  cardTypes?: FlashcardCardType[];
  level?: StudyLevel;
  createdAt: number;
}

export const FLASHCARD_CARD_TYPE_META: Record<FlashcardCardType, { label: string; hint: string }> = {
  definition: { label: '용어 정의', hint: '개념·용어의 뜻' },
  example:    { label: '예시·사례', hint: '구체 사례·적용' },
  comparison: { label: '개념 비교', hint: 'A vs B 대조' },
  mechanism:  { label: '메커니즘', hint: '원리·작동 과정' },
};

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
  /** 'ai' = AI가 생성한 카드(덱 재생성 시 교체됨), 'user' = 사용자가 수동 추가(하이라이트 등, 보존). undefined=기존 카드. */
  source?: 'ai' | 'user';
  /** 속한 덱. 없으면 '기본' 덱으로 간주. */
  deckId?: string;
  /** 사용자가 따로 저장(북마크)한 카드. 플래시카드 메인의 "저장함" 섹션으로 통합 조회. */
  saved?: boolean;
  /** 저장 시각. 없으면 저장된 적 없음. */
  savedAt?: number;
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
  citationSources?: Array<{
    id: string;
    title: string;
    kind: StudySource['kind'];
    contentPreview: string;
  }>;
}

/* ── 마인드맵 ── */
export type MindmapNodeStatus = 'unknown' | 'shaky' | 'got-it';

export interface MindmapNode {
  id: string;
  label: string;
  /** 한 줄 설명 (노드 호버 툴팁·컨텍스트용). */
  summary?: string;
  /** 원본 페이지 뱃지. */
  pages?: number[];
  emoji?: string;
  /** 루트 직속 자식에만 지정, 자손은 상속. `#RRGGBB`. */
  branchColor?: string;
  children: MindmapNode[];
  /** 사용자가 추가/수정한 노드 여부. 재생성 시 보존용. */
  source?: 'ai' | 'user';
}

export interface MindmapCrossLink {
  from: string;
  to: string;
  label?: string;
}

export interface MindmapMeta {
  root: MindmapNode;
  crossLinks?: MindmapCrossLink[];
  /** 사용자별 노드 학습 상태. */
  userNodeStates?: Record<string, MindmapNodeStatus>;
  version: 1;
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
  /** 레거시 단일 퀴즈 배열. 마이그레이션 이후 빈 배열. 신규는 quizDecks 사용. */
  quizItems: StudyQuizItem[];
  /** 퀴즈 덱 리스트. 각 덱이 items 를 가진다. */
  quizDecks?: QuizDeck[];
  /** 팟캐스트 에피소드 리스트. */
  podcastEpisodes?: PodcastEpisode[];
  /** 도식 아이템 리스트. */
  diagrams?: DiagramItem[];
  flashcards: Flashcard[];
  /** 플래시카드 덱 메타. 없으면 덱 없는(= 기본) 카드들만 있는 상태. */
  flashcardDecks?: FlashcardDeck[];
  wrongAnswers: WrongAnswer[];
  chat: StudyChatTurn[];
  highlights?: Highlight[];
  createdAt: number;
  updatedAt: number;
  chatMode: 'explain' | 'socratic' | 'custom';
  /** 'custom' 모드일 때의 사용자 지정 지시문. */
  chatCustomInstruction?: string;
  /** AI 답변 길이 선호. 기본은 모델 판단. */
  chatResponseLength?: 'default' | 'long' | 'short';
  debatePartners?: { expertAId?: string; expertBId?: string };
  folderId?: string;
  description?: string;
  pinned?: number;
  color?: string;
}

export const NOTEBOOK_ICON_PRESETS = [
  'BookOpen', 'Book', 'BookOpenCheck', 'Library', 'Bookmark', 'FileText',
  'ClipboardList', 'PenLine', 'ScrollText', 'GraduationCap', 'Brain', 'Sparkles',
  'Bot', 'Code2', 'Calculator', 'FlaskConical', 'Globe2', 'Mic', 'Youtube',
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

export function createEmptyNotebook(title = '새 자료', icon = 'BookOpen'): StudyNotebook {
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
  summary: { label: '노트정리', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'FileText' },
  keypoints: { label: '핵심 포인트', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Sparkles' },
  mindmap: { label: '마인드맵', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'GitBranch' },
  quiz: { label: '퀴즈', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Target' },
  guide: { label: '학습 가이드', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Map' },
  debate: { label: '2인 토론', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'MessagesSquare' },
  flashcards: { label: '플래시카드', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Layers' },
  podcast: { label: '팟캐스트', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'Mic' },
  diagram: { label: '도식', icon: '', tintClass: 'bg-slate-100', ringClass: 'ring-slate-200', accentText: 'text-slate-900', lucide: 'BarChart3' },
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

/** 레거시 quizItems → quizDecks 1회성 마이그레이션. 변경 시 새 객체 반환, 변경 없으면 동일 참조. */
export function migrateQuizDecks(nb: StudyNotebook): StudyNotebook {
  if (nb.quizDecks !== undefined) return nb;
  if (!nb.quizItems || nb.quizItems.length === 0) {
    return { ...nb, quizDecks: [] };
  }
  const now = Date.now();
  const deck: QuizDeck = {
    id: newId('qd'),
    name: '퀴즈 (이전)',
    count: nb.quizItems.length,
    level: 'standard',
    tone: 'student',
    useWeakConcepts: false,
    createdAt: now,
    updatedAt: now,
    items: nb.quizItems,
  };
  return { ...nb, quizDecks: [deck], quizItems: [] };
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
  weights: [30, 42, 28],
};

export const PANE_META: Record<StudyPaneKind, { label: string; icon: string }> = {
  sources: { label: '원본', icon: '' },
  chat: { label: '대화', icon: '' },
  studio: { label: '스튜디오', icon: '' },
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

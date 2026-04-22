/**
 * AI 어시스턴트 - 음성 분석(녹음 분석) 기능 타입 정의.
 * 공부 도우미와 별도 모듈. V2에서 공부 노트북이 이 녹음을 참조하는 방식으로 연결 예정.
 */

export type VoiceRecordingStatus = 'uploading' | 'transcribing' | 'analyzing' | 'ready' | 'error';

export interface VoiceTranscriptSegment {
  /** 초 단위 시작 시각 */
  start: number;
  /** 초 단위 종료 시각 */
  end: number;
  /** 전사된 텍스트 */
  text: string;
}

export interface VoiceChapter {
  /** 초 단위 */
  start: number;
  end: number;
  title: string;
}

export interface VoiceActionItem {
  text: string;
  /** 담당자(추출 가능할 때) */
  owner?: string;
  /** 기한 표현(추출 가능할 때) — ISO 아니고 원문 */
  due?: string;
}

export interface VoiceRecording {
  id: string;
  userId: string;
  /** 자동 생성된 한 줄 제목. 유저가 수정 가능. */
  title: string;
  /** IndexedDB blob 키 */
  audioBlobRef?: string;
  mimeType?: string;
  /** 녹음 길이(초) */
  durationSec: number;
  /** 전사 세그먼트 배열 */
  transcript: VoiceTranscriptSegment[];
  /** 2~3문장 요약 */
  summary: string;
  /** 3~7개 챕터 목차 */
  chapters: VoiceChapter[];
  /** 액션아이템 (없으면 빈 배열) */
  actionItems: VoiceActionItem[];
  status: VoiceRecordingStatus;
  /** error 상태일 때 사용자용 메시지 */
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceUsage {
  userId: string;
  /** 'YYYY-MM' (KST 기준) */
  yearMonth: string;
  secondsUsed: number;
}

/** 월 무료 한도(초) */
export const MONTHLY_FREE_SECONDS = 30 * 60;

/** Whisper API 단일 파일 바이트 상한 */
export const WHISPER_FILE_LIMIT = 25 * 1024 * 1024;

/** 업로드 허용 MIME 접미사 */
export const VOICE_ACCEPT_TYPES = '.mp3,.m4a,.wav,.webm,.mp4,audio/*';

export const VOICE_STATUS_LABEL: Record<VoiceRecordingStatus, string> = {
  uploading: '업로드 중',
  transcribing: '전사 중',
  analyzing: '분석 중',
  ready: '완료',
  error: '오류',
};

/** 현재 KST 기준 yyyy-MM 반환 */
export function currentYearMonthKST(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/* ── 창조물 생성(ArtifactKind) — AudioPen·Voicenotes·Fathom 패턴 ── */

export type ArtifactKind = 'blog' | 'sns' | 'email' | 'slack' | 'note' | 'minutes';
export type ArtifactTone = 'formal' | 'casual' | 'expert';
export type ArtifactLength = 'short' | 'medium' | 'long';

export interface ArtifactMeta {
  icon: string;
  label: string;
  description: string;
}

export const ARTIFACT_META: Record<ArtifactKind, ArtifactMeta> = {
  blog:    { icon: '📝', label: '블로그 글',      description: '제목·소제목·본문 구조' },
  sns:     { icon: '🐦', label: 'SNS 포스트',     description: 'X 스레드 3~5개' },
  email:   { icon: '✉️', label: '이메일 초안',     description: '후속·감사·공지' },
  slack:   { icon: '💬', label: '슬랙/카톡 요약', description: '5줄 이내 공유용' },
  note:    { icon: '📚', label: '학습 노트',      description: '개념·예시·질문' },
  minutes: { icon: '📋', label: '회의록',         description: '결정사항·액션' },
};

export const ARTIFACT_KIND_ORDER: ArtifactKind[] = ['blog', 'sns', 'email', 'slack', 'note', 'minutes'];

export const ARTIFACT_TONE_LABEL: Record<ArtifactTone, string> = {
  formal: '포멀',
  casual: '캐주얼',
  expert: '전문가',
};

export const ARTIFACT_LENGTH_LABEL: Record<ArtifactLength, string> = {
  short: '짧게',
  medium: '보통',
  long: '길게',
};

export interface VoiceArtifact {
  id: string;
  recordingId: string;
  kind: ArtifactKind;
  tone: ArtifactTone;
  length: ArtifactLength;
  content: string;
  createdAt: number;
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

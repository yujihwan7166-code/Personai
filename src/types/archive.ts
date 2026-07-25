/**
 * 아카이브(내 보관소) 타입·상수.
 *
 * 구조 2축:
 *  - 컬렉션(= 폴더): 좌측 사이드바. 저장할 때 어디에 넣을지 하나 고른다.
 *    이름·이모지만 갖는 순수 분류함이다 — 컬렉션별 입력 양식은 없다(저장창은 단일 폼).
 *  - 형태(kind): 글·이미지·파일·링크 — 첨부물로 자동 판정. 상단 드롭다운 필터.
 *
 * 저장 계층: 메타데이터는 localStorage(archiveStore), 파일 원본은 IndexedDB(archiveBlobStore).
 */

export const ARCHIVE_CHANGED = 'archive:changed';

/** 어디에도 안 속한 항목이 떨어지는 폴백 컬렉션 이름. */
export const FALLBACK_COLLECTION_NAME = '기타';
export const FALLBACK_COLLECTION_KEY = 'etc';

/** 항목 형태 — 첨부물로 자동 판정. */
export type ArchiveKind = 'note' | 'image' | 'file' | 'link';

export const KIND_LABEL: Record<ArchiveKind, string> = {
  note: '글',
  image: '이미지',
  file: '파일',
  link: '링크',
};

/**
 * 추가 필드 값 (발급일·금액 등).
 * 레거시 — 컬렉션별 양식이 있던 시절 저장된 항목만 갖는다. 새로 채워지는 경로는 없고
 * 상세 패널에서 읽기 전용으로만 보여준다. (기존 데이터 보존용이라 지우지 않는다)
 */
export interface ArchiveFieldValue {
  key: string;
  label: string;
  value: string;
}

export interface ArchiveItem {
  id: string;
  /** 소속 컬렉션. */
  collectionId: string;
  /** 레거시 — 양식 시절의 builtin key. 새 항목엔 붙지 않는다. */
  formKey?: string;
  kind: ArchiveKind;
  title: string;
  /** 본문/메모. */
  note?: string;
  /** kind='link' 원본 URL. */
  url?: string;
  /** url 에서 파생한 도메인 (표시용). */
  domain?: string;
  tags: string[];
  /** 레거시 추가 필드 — 읽기 전용. {@link ArchiveFieldValue} */
  fields?: ArchiveFieldValue[];
  /** 파일·이미지 원본 (archiveBlobStore id). */
  blobRef?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  starred?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveCollection {
  id: string;
  name: string;
  emoji?: string;
  order: number;
  /** 기본 시드 컬렉션의 안정적 식별자 (커스텀은 undefined). */
  builtinKey?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// 기본 컬렉션 시드
// ─────────────────────────────────────────────

/**
 * 최초 1회 깔리는 기본 폴더 8종 (7 + '기타' 폴백).
 * 이름·이모지만 갖는다 — 폴더마다 다른 입력 양식은 없다.
 * builtinKey 는 안정적 식별자라 바꾸면 기존 사용자와 어긋난다.
 */
export const DEFAULT_COLLECTION_SEEDS: { builtinKey: string; name: string; emoji: string }[] = [
  { builtinKey: 'documents', name: '서류·증명', emoji: '📄' },
  { builtinKey: 'receipts', name: '영수증·보증서', emoji: '🧾' },
  { builtinKey: 'bookmarks', name: '북마크·링크', emoji: '🔖' },
  { builtinKey: 'videos', name: '볼거리', emoji: '▶️' },
  { builtinKey: 'photos', name: '추억·사진', emoji: '📷' },
  { builtinKey: 'ideas', name: '아이디어·메모', emoji: '💡' },
  { builtinKey: 'recipes', name: '레시피', emoji: '🍳' },
  { builtinKey: FALLBACK_COLLECTION_KEY, name: FALLBACK_COLLECTION_NAME, emoji: '📦' },
];

// ─────────────────────────────────────────────
// 날짜 — 저장은 UTC ISO, 표시·묶음은 로컬 기준
// ─────────────────────────────────────────────

/**
 * createdAt(UTC ISO) → 로컬 'YYYY-MM-DD'.
 *
 * ISO 문자열을 그대로 slice 하면 UTC 날짜가 나와, KST 자정~오전 9시에 저장한 항목이
 * 하루 전으로 찍힌다. 표시·연도 필터·월 묶음은 전부 이 헬퍼를 거친다.
 */
export function localYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** createdAt → 로컬 'YYYY-MM' (타임라인 월 묶음·이번 달 카운트). */
export const localYm = (iso: string): string => localYmd(iso).slice(0, 7);

/** createdAt → 로컬 'YYYY' (연도 필터). */
export const localYear = (iso: string): string => localYmd(iso).slice(0, 4);

/** 지금 이 순간의 로컬 'YYYY-MM'. */
export const currentLocalYm = (): string => localYm(new Date().toISOString());

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

/** URL → 도메인 (표시용). 실패 시 undefined. */
export function extractDomain(url: string): string | undefined {
  try {
    const u = new URL(url.trim());
    return u.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** 문자열이 http/https URL 한 개인지 — 붙여넣기 저장 판정용. */
export function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

/** YouTube URL → 영상 id (썸네일용). 아니면 undefined. */
export function youtubeId(url: string): string | undefined {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : undefined;
}

export function isImageMime(mime: string | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

/** 첨부물로 형태 자동 판정. */
export function deriveKind(input: { mimeType?: string; url?: string; hasFile?: boolean }): ArchiveKind {
  if (input.hasFile || input.mimeType) {
    return isImageMime(input.mimeType) ? 'image' : 'file';
  }
  if (input.url) return 'link';
  return 'note';
}

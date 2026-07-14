/**
 * 아카이브(내 보관소) 타입·상수·양식 정의.
 *
 * 구조 2축:
 *  - 컬렉션(내용 묶음, = 저장 양식): 좌측 사이드바. 저장할 때 고르면 그 필드가 뜬다.
 *  - 형태(kind): 글·이미지·파일·링크 — 첨부물로 자동 판정. 상단 칩 필터.
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

/** 양식 필드 값 (발급일·금액 등 컬렉션별 추가 정보). */
export interface ArchiveFieldValue {
  key: string;
  label: string;
  value: string;
}

export interface ArchiveItem {
  id: string;
  /** 소속 컬렉션. */
  collectionId: string;
  /** 만든 양식의 builtin key (커스텀은 undefined). */
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
  /** 양식별 추가 필드 (발급일·만료일·금액 등). */
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
// 양식(폼) 정의 — 컬렉션 = 양식
// ─────────────────────────────────────────────

export type ArchiveFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'url'
  | 'number'
  | 'file'
  | 'image'
  | 'password';

export interface ArchiveFormField {
  key: string;
  label: string;
  type: ArchiveFieldType;
  placeholder?: string;
  /** false 로 두면 필수. 기본 true(선택). */
  optional?: boolean;
}

export interface ArchiveForm {
  /** 안정적 식별자 — 컬렉션 builtinKey 와 짝. */
  key: string;
  name: string;
  emoji: string;
  desc: string;
  /** 폼 필드 — 순서대로 렌더. */
  fields: ArchiveFormField[];
}

/** 기본 양식 8종 (7 + 기타 폴백). 저장 시 이 순서로 선택기에 노출. */
export const DEFAULT_FORMS: ArchiveForm[] = [
  {
    key: 'documents',
    name: '서류·증명',
    emoji: '📄',
    desc: '등본·계약서·수료증',
    fields: [
      { key: 'title', label: '제목', type: 'text', placeholder: '무슨 서류인가요?', optional: false },
      { key: 'file', label: '파일', type: 'file' },
      { key: 'issued', label: '발급일', type: 'date' },
      { key: 'expires', label: '만료일', type: 'date' },
      { key: 'issuer', label: '발급처', type: 'text', placeholder: '어디서 받았나요?' },
    ],
  },
  {
    key: 'receipts',
    name: '영수증·보증서',
    emoji: '🧾',
    desc: '구매·A/S·연말정산',
    fields: [
      { key: 'title', label: '제품·항목', type: 'text', placeholder: '무엇을 샀나요?', optional: false },
      { key: 'file', label: '사진·파일', type: 'file' },
      { key: 'purchased', label: '구매일', type: 'date' },
      { key: 'warranty', label: '보증 만료', type: 'date' },
      { key: 'amount', label: '금액', type: 'number', placeholder: '원' },
    ],
  },
  {
    key: 'bookmarks',
    name: '북마크·링크',
    emoji: '🔖',
    desc: '웹사이트·아티클·읽을거리',
    fields: [
      { key: 'url', label: 'URL', type: 'url', placeholder: 'https://', optional: false },
      { key: 'title', label: '제목', type: 'text', placeholder: '비우면 링크에서 가져와요' },
      { key: 'note', label: '메모', type: 'textarea', placeholder: '왜 저장했나요?' },
    ],
  },
  {
    key: 'videos',
    name: '볼거리',
    emoji: '▶️',
    desc: '유튜브·영상',
    fields: [
      { key: 'url', label: 'URL', type: 'url', placeholder: 'https://youtube.com/...', optional: false },
      { key: 'title', label: '제목', type: 'text', placeholder: '영상 제목' },
      { key: 'channel', label: '채널', type: 'text', placeholder: '누가 만들었나요?' },
      { key: 'note', label: '메모', type: 'textarea' },
    ],
  },
  {
    key: 'photos',
    name: '추억·사진',
    emoji: '📷',
    desc: '사진·이미지·캡처',
    fields: [
      { key: 'image', label: '이미지', type: 'image', optional: false },
      { key: 'title', label: '제목', type: 'text', placeholder: '어떤 순간인가요?' },
      { key: 'shot', label: '찍은 날', type: 'date' },
    ],
  },
  {
    key: 'ideas',
    name: '아이디어·메모',
    emoji: '💡',
    desc: '떠오른 생각·글귀·기록',
    fields: [
      { key: 'title', label: '제목', type: 'text', placeholder: '한 줄 요약', optional: false },
      { key: 'note', label: '내용', type: 'textarea', placeholder: '자유롭게 적어요' },
    ],
  },
  {
    key: 'recipes',
    name: '레시피',
    emoji: '🍳',
    desc: '요리법·맛집',
    fields: [
      { key: 'title', label: '제목', type: 'text', placeholder: '무슨 요리인가요?', optional: false },
      { key: 'url', label: '참고 링크', type: 'url', placeholder: 'https://' },
      { key: 'note', label: '재료·방법', type: 'textarea', placeholder: '재료와 순서' },
    ],
  },
  {
    key: FALLBACK_COLLECTION_KEY,
    name: FALLBACK_COLLECTION_NAME,
    emoji: '📦',
    desc: '아무거나 — 나중에 정리',
    fields: [
      { key: 'title', label: '제목', type: 'text', placeholder: '무엇을 저장하나요?' },
      { key: 'note', label: '내용', type: 'textarea' },
      { key: 'file', label: '파일', type: 'file' },
    ],
  },
];

/** 시드로 만들 기본 컬렉션 (양식과 1:1). */
export const DEFAULT_COLLECTION_SEEDS = DEFAULT_FORMS.map((f) => ({
  builtinKey: f.key,
  name: f.name,
  emoji: f.emoji,
}));

export const getForm = (key: string | undefined): ArchiveForm | undefined =>
  key ? DEFAULT_FORMS.find((f) => f.key === key) : undefined;

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

/** 문자열이 URL 형태인지 (http/https). */
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

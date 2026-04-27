/**
 * 마이위키 — 개인용 나무위키/옵시디언형 지식 베이스 도메인 타입.
 *
 * 설계 근거: docs/architecture/data-and-auth.md §4 + deep-research-report 의
 * frontmatter 스키마(type/category/status/tags/aliases) + 4가지 관계
 * (refersTo / cites / inherits / similarTo).
 *
 * v1 은 IndexedDB 단일 저장소에서 시작. 클라우드 sync 는 후속 단계.
 */

export type WikiPageType =
  | 'concept'   // 개념·주제
  | 'moc'       // Map of Content — 길찾기 허브
  | 'source'    // 책·논문·아티클·강의
  | 'project'   // 진행 중 프로젝트
  | 'meeting'   // 회의·결정 기록
  | 'person'    // 인물
  | 'index';    // 대문/홈

export type WikiPageStatus =
  | 'draft'     // 초안
  | 'active'    // 작업 중
  | 'stable'    // 안정
  | 'archived'; // 보관

export interface WikiPage {
  id: string;
  title: string;
  /** 별칭·동의어. 검색 시 함께 매칭. */
  aliases: string[];
  type: WikiPageType;
  category?: string;
  status: WikiPageStatus;
  tags: string[];
  /** Markdown 본문. [[페이지명]] 위키링크 지원. */
  body: string;
  /** *역할(role)* 플래그 — type 과 독립.
   *  메인 문서는 "여러 페이지를 묶는 길찾기 허브" 역할.
   *  type 은 (개념/출처/인물/...) 그대로 유지하면서 동시에 메인 문서일 수 있음.
   *  legacy: type='moc' 인 페이지도 메인으로 인식 (isMainDoc 헬퍼 사용). */
  isMain?: boolean;
  // ── 4 관계 (deep-research §관계 시각화 표 그대로) ──
  /** 일반 참조. 본문 [[link]] 파싱으로 자동 채워짐. */
  refersTo: string[];
  /** 출처 인용 — source 노트 id. */
  cites: string[];
  /** 상위 개념·분류·계승. */
  inherits: string[];
  /** 비교·유사 항목. */
  similarTo: string[];
  /** 소속 메인 문서 ids. */
  parentMocs: string[];
  createdAt: number;
  updatedAt: number;
}

/** 메인 문서 여부 — 신규 isMain 또는 legacy type='moc'. */
export function isMainDoc(p: { type: WikiPageType; isMain?: boolean }): boolean {
  return !!p.isMain || p.type === 'moc';
}

/** 사용자 type 드롭다운에 노출할 type 들 (역할 'moc' 제외). */
export const USER_FACING_TYPES: WikiPageType[] = ['concept', 'source', 'project', 'meeting', 'person', 'index'];

export const WIKI_TYPE_META: Record<WikiPageType, { label: string; icon: string; tint: string; description: string }> = {
  concept: { label: '개념',     icon: '📄', tint: 'hsl(220 60% 50%)', description: '주제·용어·개념' },
  moc:     { label: '메인 문서', icon: '📖', tint: 'hsl(45 85% 50%)',  description: '여러 페이지를 묶는 길찾기 문서' },
  source:  { label: '출처',     icon: '📚', tint: 'hsl(150 55% 42%)', description: '책·논문·아티클' },
  project: { label: '프로젝트', icon: '🚀', tint: 'hsl(280 60% 55%)', description: '진행 중 프로젝트' },
  meeting: { label: '회의',     icon: '🗣️', tint: 'hsl(195 60% 45%)', description: '회의·결정 기록' },
  person:  { label: '인물',     icon: '👤', tint: 'hsl(0 70% 55%)',   description: '인물 카드' },
  index:   { label: '대문',     icon: '🏠', tint: 'hsl(262 70% 55%)', description: '대문/입구' },
};

export const WIKI_STATUS_META: Record<WikiPageStatus, { label: string; tint: string }> = {
  draft:    { label: '초안',   tint: 'hsl(0 0% 60%)' },
  active:   { label: '작업중', tint: 'hsl(210 70% 55%)' },
  stable:   { label: '안정',   tint: 'hsl(145 55% 45%)' },
  archived: { label: '보관',   tint: 'hsl(0 0% 40%)' },
};

export function newWikiId(): string {
  return `w_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyWikiPage(overrides: Partial<WikiPage> = {}): WikiPage {
  const now = Date.now();
  return {
    id: newWikiId(),
    title: '제목 없음',
    aliases: [],
    type: 'concept',
    status: 'draft',
    tags: [],
    body: '',
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** 본문에서 [[페이지명]] 패턴을 추출. 표시명/실제명 분리(`[[실제|표시]]`)도 지원. */
const WIKILINK_REGEX = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export function extractWikiLinks(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  WIKILINK_REGEX.lastIndex = 0;
  while ((m = WIKILINK_REGEX.exec(body)) !== null) {
    const target = m[1].trim();
    if (target) out.add(target);
  }
  return Array.from(out);
}

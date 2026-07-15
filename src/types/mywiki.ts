/**
 * 마이위키 — "한 주제를 깊게 파는 개인 백과사전" 도메인 타입.
 *
 * 확정 시안(Wiki.dc.html, 2026-07-16) 기반. 옛 types/wiki.ts(일기 블록에디터 소유)와 별개.
 *
 * 구조: 주제(Topic) → 문서(Doc) 트리. 문서 본문은 HTML 문자열
 * (contentEditable + 툴바·팝오버로만 생성 — 사용자는 문법을 모름).
 * 링크는 제목이 아니라 **문서 id** 기반(<a data-link="docId">)이라 개명에 안전.
 */

export const MYWIKI_CHANGED = 'mywiki:changed';

export interface WikiTopic {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface WikiInfoRow {
  k: string;
  v: string;
}

export interface WikiFootnote {
  n: number;
  text: string;
}

export interface WikiDoc {
  id: string;
  topicId: string;
  /** null 이면 주제 바로 아래(최상위 문서). */
  parentId: string | null;
  title: string;
  /** 본문 HTML — sanitize 거쳐 저장. 링크: <a data-link="docId">, 예약: <a data-stub-title="제목">. */
  body: string;
  infobox: WikiInfoRow[];
  tags: string[];
  footnotes: WikiFootnote[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

/* ── 시안 팔레트 (Wiki.dc.html) ── */
export const WK = {
  frame: '#0F2A22',        // 앱 프레임(다크 그린)
  rail: '#123A2F',         // 좌측 레일
  paper: '#FBFAF5',        // 본문 캔버스(종이)
  ink: '#26332E',          // 본문 잉크
  inkDeep: '#14342B',      // 제목 잉크
  green: '#2D6A4F',        // 액센트 그린 (존재 링크)
  greenDark: '#1B4332',
  red: '#B23A2E',          // 예약(스텁) 링크
  line: '#ECE7DA',         // 종이 위 헤어라인
  lineSoft: '#EAE4D5',
  muted: '#8A9691',
  faint: '#9AA49F',
  sand: '#B0A88F',
} as const;

/** 본문 텍스트가 이 길이 미만이면 "아직 정리 중인 문서"(스텁). */
export const STUB_TEXT_LENGTH = 40;

export const SERIF = "'Noto Serif KR', 'Newsreader', Georgia, serif";

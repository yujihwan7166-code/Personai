/**
 * 마이위키 — "도서관에서 책을 골라, 그 안에 백과사전을 써내려가는" 방.
 *
 * 두 시안을 참고해 확정 (2026-07-16):
 *  - 톤·도서관(책장)·문서 해부도 = 마이위키.dc.html (양피지 서재)
 *  - 선택 팝오버(연결/예약/주석) · id 기반 링크 = Wiki.dc.html
 *  - 편집 모델 = 보기 기본 + 편집 토글 (사용자 선택)
 *
 * 구조: 책(Topic) → 문서(Doc) 트리. 본문은 HTML 문자열(문법 제로 — 버튼·팝오버만).
 * 링크는 문서 id 기반(<a data-link="docId">)이라 제목을 바꿔도 안 깨진다.
 */

export const MYWIKI_CHANGED = 'mywiki:changed';

export interface WikiTopic {
  id: string;
  name: string;
  /** 책등 색 (팔레트에서 자동 배정). */
  tint: string;
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
  /** null 이면 책 바로 아래(최상위 문서). */
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

/* ── 양피지 서재 팔레트 (마이위키.dc.html) ── */
export const PW = {
  paper: '#f2ede3',       // 페이지 배경
  panel: '#f7f3ea',       // 헤더
  card: '#f8f4ec',        // 카드·인포박스
  cardLine: '#e6ddcd',
  line: '#e2dacb',        // 헤어라인
  rail: '#f5f0e6',        // 좌측 트리 레일
  ink: '#2b2622',         // 진한 잉크
  body: '#38322c',        // 본문 잉크
  sub: '#7c7264',
  faint: '#a89a86',
  sand: '#b7aa96',
  accent: '#a8462e',      // 벽돌 레드 — 로고·활성·링크
  red: '#c0392b',         // 예약(스텁) 링크
  linkUnder: '#a8462e55',
  input: '#ded5c4',
  inputBg: '#fffdf8',
} as const;

/** 책등 색 팔레트 — 새 책에 순서대로 배정. */
export const SPINE_TINTS = [
  '#8c4a2f', '#5f6b34', '#8a2f2f', '#7a5230', '#3a5a7c', '#6b4a7a', '#2f6b5a', '#9a7b2f',
] as const;

/** 본문 텍스트가 이 길이 미만이면 "얇은 판"(스텁). */
export const STUB_TEXT_LENGTH = 40;

export const SERIF = "'Gowun Batang', 'Noto Serif KR', Georgia, serif";
export const SANS = "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', system-ui, sans-serif";

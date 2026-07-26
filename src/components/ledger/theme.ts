/**
 * 가계부 팔레트 — 값은 index.css 의 `.ledger-theme` 안 `--lg-*` 에 있다.
 *
 * 여기에 hex 를 직접 두면 방 테마 체계(.{room}-theme) 밖으로 나가서
 * 다크모드도, 방 단위 재도색도 따라오지 않는다. 이름만 들고 CSS 변수를 가리킨다.
 * (실측 원본은 시안 Ledger.dc.html — index.css 주석에 hex 그대로 남겨두었다.)
 */
const v = (name: string) => `var(--lg-${name})`;

export const C = {
  // 바탕
  bg: v('bg'),
  side: v('side'),
  card: v('card'),
  cardAlt: v('card-alt'),
  head: v('head'),            // 표 머리·그룹 헤더
  hover: v('hover'),
  hoverSide: v('hover-side'),
  hoverBtn: v('hover-btn'),
  hoverBtn2: v('hover-btn2'),
  track: v('track'),          // 진행바 바탕
  chipBg: v('chip'),          // 이모지 타일

  // 선
  line: v('line'),
  lineSoft: v('line-soft'),
  lineFaint: v('line-faint'),
  lineRow: v('line-row'),
  lineInput: v('line-input'),
  lineBtn: v('line-btn'),

  // 글자
  ink: v('ink'),
  ink2: v('ink2'),
  ink3: v('ink3'),
  ink4: v('ink4'),
  sub: v('sub'),
  sub2: v('sub2'),
  muted: v('muted'),
  muted2: v('muted2'),
  muted3: v('muted3'),
  navInactive: v('nav-inactive'),

  // 강조
  navy: v('navy'),
  navyDeep: v('navy-deep'),
  navyMid: v('navy-mid'),
  navyPale: v('navy-pale'),
  navyFaint: v('navy-faint'),
  green: v('green'),
  greenDot: v('green-dot'),
  red: v('red'),

  // 상태 배지·안내
  navSel: v('nav-sel'),
  tipBg: v('tip-bg'),
  tipLine: v('tip-line'),
  tipLine2: v('tip-line2'),
  tipInk: v('tip-ink'),
  warnBg: v('warn-bg'),
  warnInk: v('warn-ink'),
  warnDot: v('warn-dot'),
  okBg: v('ok-bg'),
  okLine: v('ok-line'),
  okInk: v('ok-ink'),
  fixedBg: v('fixed-bg'),
  fixedInk: v('fixed-ink'),
  backupInk: v('backup-ink'),
  backupDot: v('backup-dot'),
} as const;

export const KRW = (n: number) => Math.round(n).toLocaleString('ko-KR');

/** 도넛·막대의 카테고리 색 순서 — 남색 계열 명도 사다리. */
export const SLICE_COLORS = [
  v('navy'), v('navy-mid'), v('navy-pale'), v('navy-faint'), '#DDE1EA', '#EAECF1',
];

export const card: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  background: C.card,
};

export const btn: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  background: C.card,
  fontSize: 12.5,
  fontWeight: 600,
  color: C.ink3,
  cursor: 'pointer',
  height: 32,
  padding: '0 13px',
};

export const btnPrimary: React.CSSProperties = {
  border: 'none',
  borderRadius: 9,
  background: C.navy,
  color: '#fff',
  fontSize: 12.5,
  fontWeight: 650,
  cursor: 'pointer',
};

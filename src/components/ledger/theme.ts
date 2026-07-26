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

/**
 * 좁은 칸(캘린더 한 칸 등)에 들어가는 짧은 금액.
 *
 * 예전엔 `23k` 였다. k 는 천 단위 묶음인데 한국어로 돈을 읽을 땐 만 단위로
 * 끊는다 — 23k 를 보고 '이만 삼천' 이 나오려면 머릿속에서 한 번 바꿔야 한다.
 * 만·억으로 끊으면 그 변환이 없다.
 *
 *   4,500 → 4,500   (만 미만은 그대로 — 축약할 자릿수가 없다)
 *  23,000 → 2.3만
 * 560,000 → 56만    (10만 넘으면 소수점은 노이즈)
 * 1.6억  → 1.6억
 */
export const KRWShort = (n: number): string => {
  const v = Math.round(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  if (v < 10_000) return sign + v.toLocaleString('ko-KR');
  if (v < 100_000_000) {
    const man = v / 10_000;
    // 10만 미만만 소수 한 자리 — 그 위로는 소수점이 정보가 아니라 자리만 먹는다
    return `${sign}${man < 10 ? String(Math.round(man * 10) / 10) : String(Math.round(man))}만`;
  }
  const eok = v / 100_000_000;
  return `${sign}${eok < 10 ? String(Math.round(eok * 10) / 10) : String(Math.round(eok))}억`;
};

/**
 * 사람이 친 것을 금액으로 읽는다.
 *
 * 돈을 말할 때 한국어는 만 단위로 끊는다 — "삼만 원", "십오만 원". 그런데 입력칸은
 * 0 을 다섯 개 세라고 요구했다. 세다 하나 틀리면 3,000 이 30,000 이 된다.
 * 말하는 대로 칠 수 있게 만·천·억을 받는다.
 *
 *   30000  → 30000        1.5만  → 15000
 *   3만    → 30000        2천    → 2000
 *   3만5천 → 35000        1억    → 100000000
 *   1,200원 → 1200        (콤마·공백·'원' 은 무시)
 *
 * 못 읽으면 null — 부르는 쪽이 '안 바꾼다' 를 고를 수 있게 0 을 돌려주지 않는다.
 */
export function parseAmount(raw: string): number | null {
  const s = (raw ?? '').replace(/[,\s원]/g, '');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));

  const UNIT: Record<string, number> = { 억: 100_000_000, 만: 10_000, 천: 1_000, 백: 100 };
  const re = /(\d+(?:\.\d+)?)([억만천백]?)/g;
  let total = 0;
  let matched = false;
  let cursor = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index !== cursor) return null;      // 숫자·단위 아닌 글자가 끼면 포기
    cursor = m.index + m[0].length;
    matched = true;
    total += Number(m[1]) * (UNIT[m[2]] ?? 1);
  }
  if (!matched || cursor !== s.length) return null;
  return Math.round(total);
}

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

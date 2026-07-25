/**
 * 가계부 시안 토큰 (Ledger.dc.html 실측).
 * 시안이 인라인 hex 로 쓰여 있어 그대로 옮긴다 — 재해석하지 않는다.
 */
export const C = {
  // 바탕
  bg: '#F6F5F1',
  side: '#FCFBF9',
  card: '#FFFFFF',
  cardAlt: '#FCFBF9',
  head: '#FBFAF7',        // 표 머리·그룹 헤더
  hover: '#FCFBF8',
  hoverSide: '#F0EEE8',
  hoverBtn: '#F5F3EE',
  hoverBtn2: '#F3F1EB',
  track: '#EFEDE7',       // 진행바 바탕
  chipBg: '#F4F2EC',      // 이모지 타일

  // 선
  line: '#E4E1D9',
  lineSoft: '#EDEAE3',
  lineFaint: '#F0EEE8',
  lineRow: '#F5F3EE',
  lineInput: '#DCD8CF',
  lineBtn: '#E9E6DF',

  // 글자
  ink: '#1B1F27',
  ink2: '#262B36',
  ink3: '#3B4250',
  ink4: '#4A5261',
  sub: '#6B7280',
  sub2: '#7C828F',
  muted: '#8A8F9C',
  muted2: '#9AA0AC',
  muted3: '#A5A9B3',
  navInactive: '#5B6273',

  // 강조
  navy: '#33405E',
  navyDeep: '#28334C',
  navyMid: '#6E7CA8',
  navyPale: '#A9B4CA',
  navyFaint: '#C7CDDA',
  green: '#2E7358',
  greenDot: '#63A187',
  red: '#C0503F',

  // 상태 배지·안내
  navSel: '#E7E4DC',
  tipBg: '#F7F8FC',
  tipLine: '#D9DCE6',
  tipLine2: '#DEE1EC',
  tipInk: '#2A3450',
  warnBg: '#FBF1E4',
  warnInk: '#96622C',
  warnDot: '#C98D4A',
  okBg: '#F6FAF7',
  okLine: '#DFE6E0',
  okInk: '#2E5C49',
  fixedBg: '#EEF1F8',
  fixedInk: '#4A5B85',
  backupInk: '#B0763A',
  backupDot: '#D9A05B',
} as const;

export const KRW = (n: number) => Math.round(n).toLocaleString('ko-KR');

/** 시안의 도넛·막대에 쓰이는 카테고리 색 순서. */
export const SLICE_COLORS = ['#33405E', '#6E7CA8', '#A9B4CA', '#C7CDDA', '#DDE1EA', '#EAECF1'];

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

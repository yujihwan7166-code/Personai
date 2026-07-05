/**
 * 오늘의 딜 — 스트립 광고 슬롯 (2026-07-05).
 *
 * 자연스러운 한 줄 스폰서 문구 + 외부 링크. 날짜 기준으로 하나 로테이션해
 * 매일 다른 딜이 뜨게. (추후 제휴 API 연동 시 이 배열을 교체.)
 */
export interface Deal {
  label: string;
  url: string;
}

const DEALS: Deal[] = [
  { label: '아이허브 비타민 최대 30%', url: 'https://kr.iherb.com' },
  { label: '쿠팡 로켓와우 오늘의 특가', url: 'https://www.coupang.com' },
  { label: '무신사 여름 세일 ~50%', url: 'https://www.musinsa.com' },
  { label: '올리브영 세일 최대 40%', url: 'https://www.oliveyoung.co.kr' },
  { label: '교보문고 이달의 책 할인', url: 'https://www.kyobobook.co.kr' },
];

/** 오늘의 딜 1개 — 날짜 기준 로테이션. */
export function todayDeal(): Deal {
  const now = new Date();
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return DEALS[dayIndex % DEALS.length];
}

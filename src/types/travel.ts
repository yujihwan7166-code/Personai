/**
 * 여행기록 타입 — 여행(Trip). 여행 속 기록은 daylogStore(날짜 귀속)가 소유.
 *
 * 모델 (트리플·Polarsteps 문법):
 * - 여행 = 날짜 범위 + 목적지. 지난/여행 중/다가옴 상태는 오늘 날짜로 파생.
 */

export const TRAVEL_CHANGED = 'travel:changed';

export interface Trip {
  id: string;
  /** 여행 이름 (예: "다낭 4박 5일"). */
  title: string;
  /** 목적지 — 카드 부제 + 지도 초기 중심 지오코딩에 쓰임 (예: "베트남 다낭"). */
  destination: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD (포함) */
  endDate: string;
  /** 커버 사진 (압축 Base64). 없으면 기록 속 첫 사진으로 대체. */
  cover?: string;
  createdAt: string;
}

export type TripStatus = 'upcoming' | 'ongoing' | 'past';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 로컬 타임존 기준 YYYY-MM-DD — toISOString(UTC) 금지 (KST에서 하루 밀림). */
export const toLocalYMD = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** 오늘 (로컬 캘린더 날짜) — date input 값과 같은 의미 체계. */
export const todayKey = (): string => toLocalYMD(new Date());

export function tripStatus(trip: Pick<Trip, 'startDate' | 'endDate'>, todayYYYYMMDD: string): TripStatus {
  if (todayYYYYMMDD < trip.startDate) return 'upcoming';
  if (todayYYYYMMDD > trip.endDate) return 'past';
  return 'ongoing';
}

/** 시작~종료 사이 날짜 나열 (여행 DAY 구획용, 최대 60일 안전장치). */
export function tripDays(trip: Pick<Trip, 'startDate' | 'endDate'>): string[] {
  const days: string[] = [];
  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);
  for (let d = start; d <= end && days.length < 60; d = new Date(d.getTime() + 86400000)) {
    days.push(toLocalYMD(d));
  }
  return days;
}

/** 날짜 차이 (b - a, 일 단위). */
export function diffDays(aYYYYMMDD: string, bYYYYMMDD: string): number {
  return Math.round((Date.parse(`${bYYYYMMDD}T00:00:00`) - Date.parse(`${aYYYYMMDD}T00:00:00`)) / 86400000);
}

/** "3박 4일" / "당일" 라벨. */
export function nightsLabel(trip: Pick<Trip, 'startDate' | 'endDate'>): string {
  const nights = Math.max(0, diffDays(trip.startDate, trip.endDate));
  return nights === 0 ? '당일' : `${nights}박 ${nights + 1}일`;
}

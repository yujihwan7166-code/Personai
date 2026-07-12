/**
 * 여행기록 타입 — 여행(Trip) / 여행 속 기록(TravelRecord) / 가고 싶은 곳(BucketPlace).
 *
 * 모델 (트리플·Polarsteps 문법):
 * - 여행 = 날짜 범위 + 목적지. 지난/여행 중/다가옴 상태는 오늘 날짜로 파생.
 * - 기록 = 여행 "안"에서만 존재 (tripId 필수). 일기와 완전 무관 — 일상 입력층은 없다.
 * - 기록 종류는 트리플식 카테고리 5종, 사용자가 칩으로 직접 고른다 (AI 분류 없음).
 */

export const TRAVEL_CHANGED = 'travel:changed';

export type RecordKind = 'food' | 'sight' | 'stay' | 'move' | 'note';

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

export interface TravelRecord {
  id: string;
  tripId: string;
  /** YYYY-MM-DD — 여행 기간 안의 하루. */
  date: string;
  /** HH:mm — 없으면 하루 안에서 입력 순서로 정렬. */
  time?: string;
  kind: RecordKind;
  text: string;
  /** 장소 이름 — 지도 핀 라벨·지오코딩 키. */
  place?: string;
  /** 기록 사진 (압축 Base64). */
  photo?: string;
  createdAt: string;
}

export interface BucketPlace {
  id: string;
  name: string;
  note?: string;
  done: boolean;
  createdAt: string;
}

export const RECORD_KIND_META: Record<RecordKind, { label: string; emoji: string; tint: string }> = {
  food:  { label: '맛집',   emoji: '🍜', tint: 'hsl(18 80% 50%)' },
  sight: { label: '볼거리', emoji: '🏛️', tint: 'hsl(210 70% 46%)' },
  stay:  { label: '숙소',   emoji: '🛏️', tint: 'hsl(262 52% 54%)' },
  move:  { label: '이동',   emoji: '🚌', tint: 'hsl(150 45% 40%)' },
  note:  { label: '메모',   emoji: '✏️', tint: 'hsl(30 8% 46%)' },
};

export const RECORD_KIND_ORDER: RecordKind[] = ['food', 'sight', 'stay', 'move', 'note'];

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

/**
 * 여행 — 날짜 범위 하나 = 여행 한 개 (Polarsteps 모델).
 *
 * 여행은 조각을 "다시 입력"하는 게 아니라, 그 기간의 조각을 *렌즈처럼 모아* 보여준다.
 * 그래서 Trip 자체는 이름·기간·표지만 갖고, 실제 내용(먹은것·간곳·사진)은 daylogStore 조각에서 온다.
 */

export const TRIP_CHANGED = 'trip:changed';

export interface Trip {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD (포함) */
  endDate: string;
  /** 표지 사진 (압축 Base64). 없으면 기간 내 첫 사진을 대신 쓴다. */
  cover?: string;
  createdAt: string;
}

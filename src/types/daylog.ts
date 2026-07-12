/**
 * 데일리로그 — 하루 기록(DayItem) 타입.
 *
 * 핵심 모델 (2026-07-12 확정): 기록은 여행이 아니라 **날짜**에 속한다.
 * 하루 페이지(글쓰기)에서 일기 본문과 함께 먹은 것·간 곳을 같은 자리에서 남기고,
 * 여행(Trip)은 날짜 범위를 묶는 렌즈일 뿐 — 기간 안의 기록을 자동으로 모아 보여준다.
 * 일기 본문(journalStore)과는 저장소가 분리되어 서로 영향 없음.
 */

export const DAYLOG_CHANGED = 'daylog:changed';

export type DayItemKind = 'meal' | 'place' | 'note';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DayItem {
  id: string;
  /** YYYY-MM-DD — 소속 날짜. 여행은 이 날짜로 기간 매칭한다. */
  date: string;
  /** HH:mm — 있으면 타임라인 정렬에 사용. */
  time?: string;
  kind: DayItemKind;
  /** kind === 'meal' 일 때 끼니. */
  mealSlot?: MealSlot;
  /** 한 줄 본문. */
  text: string;
  /** 장소 이름 — 지도 핀. 먹은 것에도 붙을 수 있다 ("홍대 국밥집"). */
  place?: string;
  /** 사진 (압축 Base64). */
  photo?: string;
  createdAt: string;
}

export const DAY_ITEM_META: Record<DayItemKind, { label: string; emoji: string; tint: string }> = {
  meal:  { label: '먹은 것', emoji: '🍚', tint: 'hsl(18 80% 50%)' },
  place: { label: '간 곳',   emoji: '📍', tint: 'hsl(183 58% 36%)' },
  note:  { label: '메모',    emoji: '✏️', tint: 'hsl(30 8% 46%)' },
};

export const DAY_ITEM_ORDER: DayItemKind[] = ['meal', 'place', 'note'];

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export const MEAL_SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

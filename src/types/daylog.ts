/**
 * 데이로그 타입 — 하루의 "조각(모먼트)" 기록.
 *
 * 일기(JournalEntry, 회고 층)와 별도 저장 — 일기 데이터는 건드리지 않는다.
 * 조각 = 낮 동안 툭툭 남기는 한 줄 (아점저 식사·한 일·간 곳·본 것·메모).
 * 레퍼런스: 디로그(세로 타임라인) · 하루콩(저마찰 마이크로 기록) · Day One(하루 여러 모먼트).
 */

export const DAYLOG_CHANGED = 'daylog:changed';

export type MomentKind = 'meal' | 'activity' | 'place' | 'media' | 'note';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DayMoment {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm — 타임라인 정렬 기준. */
  time: string;
  kind: MomentKind;
  /** kind === 'meal' 일 때 끼니. */
  mealSlot?: MealSlot;
  /** 한 줄 본문. */
  text: string;
  /** 조각 사진 (압축 Base64 data URL) — 먹은 것·순간 기록용. */
  photo?: string;
  /** 장소 이름 — kind === 'place' 일 때 주로. 나중에 지도 핀의 라벨이 된다. */
  place?: string;
  createdAt: string;
}

export const MOMENT_KIND_META: Record<MomentKind, { label: string; emoji: string; tint: string }> = {
  meal:     { label: '식사',  emoji: '🍚', tint: 'hsl(25 85% 50%)' },
  activity: { label: '한 일', emoji: '✏️', tint: 'hsl(220 65% 52%)' },
  place:    { label: '간 곳', emoji: '📍', tint: 'hsl(150 50% 40%)' },
  media:    { label: '본 것', emoji: '🎬', tint: 'hsl(262 60% 55%)' },
  note:     { label: '메모',  emoji: '💬', tint: 'hsl(28 15% 48%)' },
};

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

/** 시간대 구획 — 타임라인 그룹 라벨. */
export function partOfDay(timeHHmm: string): '아침' | '낮' | '저녁' | '밤' {
  const h = Number(timeHHmm.slice(0, 2));
  if (h >= 5 && h < 11) return '아침';
  if (h >= 11 && h < 17) return '낮';
  if (h >= 17 && h < 21) return '저녁';
  return '밤';
}

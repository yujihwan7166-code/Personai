/**
 * 시간·날짜 유틸 — KST 03시 day rollover.
 *
 * 모든 입력 epoch 는 UTC ms. 화면 표시·계산은 KST 기준.
 * 03시 이전은 전날로 간주(밤늦게 작업한 사람을 같은 "오늘"로 보호).
 */

import type { DayKey, Epoch, HabitCadence } from './types';

const KST_OFFSET_MS = 9 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** UTC epoch → KST 03시 기준 DayKey ('YYYY-MM-DD'). */
export function dayKeyOf(epoch: Epoch): DayKey {
  const kst = new Date(epoch + KST_OFFSET_MS);
  // 03시 이전이면 전날로 보정
  if (kst.getUTCHours() < 3) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().slice(0, 10);
}

export function todayKey(): DayKey {
  return dayKeyOf(Date.now());
}

/** DayKey → 그 날 03:00 KST 의 epoch. */
export function startOfDayKst(dayKey: DayKey): Epoch {
  const [y, m, d] = dayKey.split('-').map(Number);
  // KST 03:00 = UTC 18:00 of (d-1)
  return Date.UTC(y, m - 1, d - 1, 18, 0, 0);
}

/** KST 기준 weekday. 0=일 ~ 6=토. */
export function weekdayKst(epoch: Epoch): number {
  const kst = new Date(epoch + KST_OFFSET_MS);
  return kst.getUTCDay();
}

/** DayKey 의 KST weekday. */
export function weekdayOfDayKey(dayKey: DayKey): number {
  return weekdayKst(startOfDayKst(dayKey) + 4 * 3600 * 1000);
}

/** 다음 날 DayKey. */
export function nextDay(dayKey: DayKey): DayKey {
  return dayKeyOf(startOfDayKst(dayKey) + DAY_MS + KST_OFFSET_MS);
}

/** 이전 날 DayKey. */
export function prevDay(dayKey: DayKey): DayKey {
  return dayKeyOf(startOfDayKst(dayKey) - DAY_MS + KST_OFFSET_MS);
}

/** [from, to] 범위(둘 다 포함)의 DayKey 배열. */
export function rangeDays(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = nextDay(cur);
  }
  return out;
}

/** habit cadence 가 해당 DayKey 와 일치하나? */
export function matchesCadence(cadence: HabitCadence, dayKey: DayKey): boolean {
  if (cadence.kind === 'daily') return true;
  return cadence.days.includes(weekdayOfDayKey(dayKey));
}

/** 오늘 epoch 기준 N일 전의 DayKey. */
export function dayKeyBefore(daysAgo: number): DayKey {
  return dayKeyOf(Date.now() - daysAgo * DAY_MS);
}

/** YYYY-MM-DD HH:mm 한국 표기. */
export function formatKst(epoch: Epoch, opts?: { withTime?: boolean }): string {
  const kst = new Date(epoch + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  if (!opts?.withTime) return `${y}-${m}-${d}`;
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/**
 * Planner 의 시간·날짜 키 변환 유틸 — 한 곳 모음.
 *
 * 이전엔 `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
 * 같은 inline 표현이 Planner.tsx / TodayTimeline.tsx / 핸들러들 사이에 분산.
 * 새 코드는 본 헬퍼들만 쓰도록 가이드 — 기존 habitStats.toDateKey 도 호환 보장.
 *
 * 모두 **로컬 시간대 기준**. UTC 가 필요한 경우 별도 함수 만들 것 (현재 없음).
 */

import { toDateKey as habitToDateKey } from './habitStats';

/**
 * Date → 'YYYY-MM-DD' (로컬). 기존 habitStats.toDateKey 와 동일 결과.
 * 재정의 안 하고 그대로 re-export — 단일 진실 유지.
 */
export const toDayKey = habitToDateKey;

/**
 * 'YYYY-MM-DD' → 로컬 자정 Date. 잘못된 형식이면 null.
 */
export function parseDayKey(key: string): Date | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return isNaN(d.getTime()) ? null : d;
}

/** 두 Date 가 같은 날(로컬) 인지. 시·분·초 무시. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Date + N일 (음수 가능). 새 Date 반환. */
export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** 'YYYY-MM-DD' + N일. 잘못된 키면 빈 문자열. */
export function shiftDayKey(key: string, days: number): string {
  const d = parseDayKey(key);
  return d ? toDayKey(addDays(d, days)) : '';
}

/** ISO 시각(또는 Date) → 로컬 'YYYY-MM-DD' 키. 잘못된 입력은 빈 문자열. */
export function isoToDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return toDayKey(d);
}

/** 'YYYY-MM-DD' + 'HH:MM' → 로컬 Date. */
export function combineDayAndTime(dayKey: string, hhmm: string): Date | null {
  const day = parseDayKey(dayKey);
  if (!day) return null;
  const t = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!t) return null;
  const hh = Number(t[1]);
  const mm = Number(t[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  day.setHours(hh, mm, 0, 0);
  return day;
}

/** Date → 'HH:MM' (로컬). */
export function toHhMm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

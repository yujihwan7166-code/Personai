/**
 * 주간 보드용 날짜 헬퍼 — JournalWeekBoard 가 사용.
 *
 * 일관성 원칙: 일기는 월요일 시작 (한국 사용자 익숙). planner 는 일요일 시작이라 별도.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 주어진 날짜 기준 월요일 ~ 일요일 Date 쌍. */
export function getMondaySunday(anchorIso: string): { mon: Date; sun: Date } {
  const anchor = new Date(anchorIso);
  const day = anchor.getDay(); // 0=일 ~ 6=토
  const monOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(anchor);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(anchor.getDate() + monOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}

/** Anchor ISO → 그 주의 월요일 ISO (정규화). 같은 주 anchor 동일 처리. */
export function normalizeWeekAnchor(anchorIso: string): string {
  const { mon } = getMondaySunday(anchorIso);
  return `${ymd(mon)}T00:00:00`;
}

/** 주 단위 이동 (offset 주). */
export function shiftWeek(anchorIso: string, weeks: number): string {
  const d = new Date(anchorIso);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
}

/** anchor 가 오늘 포함 주인지. */
export function isAnchorCurrentWeek(anchorIso: string): boolean {
  const { mon, sun } = getMondaySunday(anchorIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  return t >= mon.getTime() && t <= sun.getTime() + 23 * 3600 * 1000;
}

/** 주 라벨 — "5월 4 ~ 10일 · 2026" 또는 월 걸치는 경우. */
export function weekLabel(anchorIso: string): string {
  const { mon, sun } = getMondaySunday(anchorIso);
  const sameMonth = mon.getMonth() === sun.getMonth();
  const sameYear = mon.getFullYear() === sun.getFullYear();
  if (sameMonth) {
    return `${mon.getMonth() + 1}월 ${mon.getDate()} ~ ${sun.getDate()}일 · ${mon.getFullYear()}`;
  }
  if (sameYear) {
    return `${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getMonth() + 1}월 ${sun.getDate()}일 · ${mon.getFullYear()}`;
  }
  return `${mon.getFullYear()}년 ${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getFullYear()}년 ${sun.getMonth() + 1}월 ${sun.getDate()}일`;
}

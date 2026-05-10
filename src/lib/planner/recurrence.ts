/**
 * 반복 일정 expand — 시리즈 마스터를 가상 인스턴스 배열로 펼침.
 *
 * 정책:
 * - daily / weekly / monthly / yearly 4종 freq 지원.
 * - interval (매 N단위), byday (weekly 한정), until / count 종료 조건.
 * - exdates (개별 건너뜀) 처리.
 * - monthly 31일 같은 edge: 해당 월 마지막 날로 클램프.
 *
 * 호출 위치:
 * - taskStore.listScheduled(date), eventStore.listByDate(date) — 단일 날짜 expand.
 * - usePlannerRange — 주/월 범위 expand.
 *
 * 성능:
 * - LocalStorage 기반이라 마스터 수가 수십~수백 정도 → expand 비용 무시 가능.
 * - 안전장치: count/until 없으면 기본 최대 365회까지만 (무한 루프 방지).
 */
import type {
  PlannerEvent,
  PlannerTask,
  RecurrenceRule,
  RecurrenceInstance,
  WeekdayCode,
} from '@/types/planner';
import { WEEKDAY_ORDER } from '@/types/planner';

const MAX_OCCURRENCES_FALLBACK = 365;
const DAY_MS = 86_400_000;

/** Date → WeekdayCode. */
const dateToWeekday = (d: Date): WeekdayCode => WEEKDAY_ORDER[d.getDay()]!;

/** 두 날짜가 같은 일(local time) 인지. */
const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Date 의 시:분:초:ms 를 다른 Date 에 복사 (시간 보존하며 날짜만 이동). */
const copyTimeOfDay = (target: Date, source: Date): void => {
  target.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
};

/** 월 이동 시 31일 → 30일/28일 등 클램프. */
const addMonthsClamped = (base: Date, months: number): Date => {
  const result = new Date(base);
  const targetMonth = base.getMonth() + months;
  result.setDate(1); // 임시로 1일로 — overflow 방지
  result.setMonth(targetMonth);
  // 해당 월의 마지막 날
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(base.getDate(), lastDayOfTargetMonth));
  copyTimeOfDay(result, base);
  return result;
};

const addYears = (base: Date, years: number): Date => {
  const result = new Date(base);
  result.setFullYear(base.getFullYear() + years);
  return result;
};

/** 주의 시작(일요일 00:00)에서 특정 weekday 만큼 이동. */
const dayWithWeekday = (weekStart: Date, weekday: WeekdayCode, baseTime: Date): Date => {
  const dayIdx = WEEKDAY_ORDER.indexOf(weekday);
  const result = new Date(weekStart);
  result.setDate(weekStart.getDate() + dayIdx);
  copyTimeOfDay(result, baseTime);
  return result;
};

/**
 * 시리즈 마스터를 [rangeStart, rangeEnd) 범위에서 발생할 인스턴스로 펼침.
 *
 * @param master  startAt/endAt 와 recurrence 가진 항목.
 * @param rangeStart 범위 시작 (포함).
 * @param rangeEnd   범위 끝 (제외).
 */
export function expandRecurrence<T extends PlannerEvent | PlannerTask>(
  master: T,
  rangeStart: Date,
  rangeEnd: Date,
): Array<RecurrenceInstance<T>> {
  if (!('recurrence' in master) || !master.recurrence) return [];
  const rec = master.recurrence;
  const start = master.startAt;
  const end = (master as PlannerEvent).endAt ?? (master as PlannerTask).endAt;
  if (!start || !end) return [];

  const masterStart = new Date(start);
  const masterEnd = new Date(end);
  const durationMs = masterEnd.getTime() - masterStart.getTime();
  const interval = Math.max(1, rec.interval ?? 1);
  const exdateSet = new Set(rec.exdates ?? []);

  const untilMs = rec.until ? new Date(rec.until).getTime() : null;
  // count === 0 도 명시적 0회 의미 (사용자가 모두 끄려는 의도) — `??` 는 null/undefined 만 fallback.
  const maxCount = rec.count == null ? MAX_OCCURRENCES_FALLBACK : Math.max(0, rec.count);
  // until 이 시작보다 과거이면 0건이 정상 — 무한 루프나 계산 낭비 방지.
  if (untilMs !== null && untilMs < masterStart.getTime()) {
    return [];
  }

  const results: Array<RecurrenceInstance<T>> = [];
  let emittedCount = 0;
  const tooLate = (occ: Date) => occ.getTime() >= rangeEnd.getTime();
  const inRange = (occ: Date) =>
    occ.getTime() >= rangeStart.getTime() - DAY_MS && // 살짝 여유 (자정 경계)
    occ.getTime() < rangeEnd.getTime();

  const tryEmit = (occStart: Date) => {
    if (emittedCount >= maxCount) return false;
    if (untilMs !== null && occStart.getTime() > untilMs) return false;
    const iso = occStart.toISOString();
    if (exdateSet.has(iso)) {
      emittedCount += 1;
      return true; // count 는 소비, emit 안 함
    }
    if (inRange(occStart)) {
      const occEnd = new Date(occStart.getTime() + durationMs);
      results.push({
        id: `${master.id}@${iso}`,
        master,
        occurrenceStartIso: iso,
        occurrenceEndIso: occEnd.toISOString(),
      });
    }
    emittedCount += 1;
    return true;
  };

  if (rec.freq === 'daily') {
    let occ = new Date(masterStart);
    let safety = 0;
    while (safety < MAX_OCCURRENCES_FALLBACK * 2) {
      if (tooLate(occ) && !inRange(occ)) break;
      if (!tryEmit(occ)) break;
      occ = new Date(occ.getTime() + interval * DAY_MS);
      safety += 1;
    }
  } else if (rec.freq === 'weekly') {
    // byday 없으면 시리즈 시작 요일만 반복.
    const days: WeekdayCode[] = (rec.byday && rec.byday.length > 0)
      ? [...rec.byday].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
      : [dateToWeekday(masterStart)];

    // 마스터 시작이 속한 주의 일요일 00:00.
    const weekCursor = new Date(masterStart);
    weekCursor.setDate(masterStart.getDate() - masterStart.getDay());
    weekCursor.setHours(0, 0, 0, 0);

    let safety = 0;
    while (safety < MAX_OCCURRENCES_FALLBACK * 2) {
      let anyInWindow = false;
      for (const wd of days) {
        const occ = dayWithWeekday(weekCursor, wd, masterStart);
        // 시리즈 시작 이전 occurrence 는 skip (단, 같은 날이면 emit).
        if (occ.getTime() < masterStart.getTime() && !isSameDay(occ, masterStart)) continue;
        if (untilMs !== null && occ.getTime() > untilMs) {
          safety = MAX_OCCURRENCES_FALLBACK * 3; // outer 종료
          break;
        }
        if (occ.getTime() >= rangeEnd.getTime() && !inRange(occ)) {
          // 범위 넘어가지만 다음 주 더 멀어질 뿐
          safety = MAX_OCCURRENCES_FALLBACK * 3;
          break;
        }
        if (!tryEmit(occ)) {
          safety = MAX_OCCURRENCES_FALLBACK * 3;
          break;
        }
        anyInWindow = true;
      }
      if (!anyInWindow && weekCursor.getTime() > rangeEnd.getTime()) break;
      // 다음 주(들).
      weekCursor.setDate(weekCursor.getDate() + 7 * interval);
      safety += 1;
    }
  } else if (rec.freq === 'monthly') {
    let i = 0;
    let safety = 0;
    while (safety < MAX_OCCURRENCES_FALLBACK * 2) {
      const occ = addMonthsClamped(masterStart, i * interval);
      if (tooLate(occ) && !inRange(occ)) break;
      if (!tryEmit(occ)) break;
      i += 1;
      safety += 1;
    }
  } else if (rec.freq === 'yearly') {
    let i = 0;
    let safety = 0;
    while (safety < MAX_OCCURRENCES_FALLBACK * 2) {
      const occ = addYears(masterStart, i * interval);
      if (tooLate(occ) && !inRange(occ)) break;
      if (!tryEmit(occ)) break;
      i += 1;
      safety += 1;
    }
  }

  return results;
}

/** 단일 occurrence 가 시리즈에서 분리 가능한지 — 즉 master 가 recurrence 갖고 있는지. */
export const isRecurringMaster = (item: { recurrence?: RecurrenceRule }): boolean =>
  Boolean(item.recurrence);

/** 가상 인스턴스 id 인지 — '@' 포함 여부로 판별. */
export const isInstanceId = (id: string): boolean => id.includes('@');

/** 가상 인스턴스 id 를 master id + occurrence ISO 로 분해. */
export const parseInstanceId = (id: string): { masterId: string; occurrenceIso: string } | null => {
  const at = id.indexOf('@');
  if (at < 0) return null;
  return {
    masterId: id.slice(0, at),
    occurrenceIso: id.slice(at + 1),
  };
};

/** 사람이 읽는 반복 라벨. UI 칩·뱃지용. */
export function formatRecurrenceLabel(rec: RecurrenceRule): string {
  const interval = rec.interval ?? 1;
  if (rec.freq === 'daily') return interval === 1 ? '매일' : `${interval}일마다`;
  if (rec.freq === 'weekly') {
    if (rec.byday && rec.byday.length > 0 && rec.byday.length < 7) {
      const labels = rec.byday.map((d) => ({ SU: '일', MO: '월', TU: '화', WE: '수', TH: '목', FR: '금', SA: '토' }[d]));
      return `매주 ${labels.join('·')}`;
    }
    return interval === 1 ? '매주' : `${interval}주마다`;
  }
  if (rec.freq === 'monthly') return interval === 1 ? '매달' : `${interval}달마다`;
  return interval === 1 ? '매년' : `${interval}년마다`;
}

/**
 * Smart Lists — 시간 기반 필터 4종.
 *
 * 사이드바 "플래너" 박스에 노출. 모두 캘린더 기준 (롤링 X).
 * - Today     : 오늘 시간배정 + 오늘 계획(plannedFor=todayKey) + (예외) 시간/계획 모두 없는 인박스 항목
 * - Tomorrow  : 내일 시간배정 + 내일 계획
 * - This Week : 이번주(월~일) 시간배정 + 이번주 어느 날이든 계획
 * - This Month: 이번달(1일~말일) 시간배정 + 이번달 어느 날이든 계획
 *
 * 대기함(시간 미배정 + 계획 미정)은 별도 사이드바 박스로 분리됨 — 여기 포함 X.
 */
import type { PlannerTask } from '@/types/planner';

export type SmartListId = 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth';

export interface SmartListDef {
  id: SmartListId;
  label: string;
  emoji: string;
  hint?: string;
  match: (task: PlannerTask, now?: Date) => boolean;
}

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d: Date): Date => {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const localDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** 이번주 월요일 00:00 (한국 기준 — 월요일 시작). */
export const startOfWeek = (d: Date): Date => {
  const result = startOfDay(d);
  const weekday = result.getDay(); // 0=일,1=월,...,6=토
  const diff = weekday === 0 ? -6 : 1 - weekday;
  result.setDate(result.getDate() + diff);
  return result;
};

/** 이번주 다음주 월요일 00:00 (exclusive end). */
export const endOfWeek = (d: Date): Date => {
  const start = startOfWeek(d);
  start.setDate(start.getDate() + 7);
  return start;
};

/** 이번달 1일 00:00. */
export const startOfMonth = (d: Date): Date => {
  const result = startOfDay(d);
  result.setDate(1);
  return result;
};

/** 다음달 1일 00:00 (exclusive end). */
export const endOfMonth = (d: Date): Date => {
  const result = startOfMonth(d);
  result.setMonth(result.getMonth() + 1);
  return result;
};

const isActive = (t: PlannerTask): boolean => !t.done && !t.canceled && !t.someday;

const inRange = (iso: string | undefined, start: Date, end: Date): boolean => {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  return ts >= start.getTime() && ts < end.getTime();
};

const plannedInRange = (key: string | undefined, start: Date, end: Date): boolean => {
  if (!key) return false;
  const cursor = new Date(start);
  while (cursor < end) {
    if (localDateKey(cursor) === key) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
};

export const SMART_LISTS: Record<SmartListId, SmartListDef> = {
  today: {
    id: 'today',
    label: '오늘',
    emoji: '⭐',
    hint: '오늘 시간배정 + 오늘 하기로 한 항목',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      if (t.startAt) return isSameDay(new Date(t.startAt), now);
      const todayKey = localDateKey(now);
      return t.plannedFor === todayKey;
    },
  },
  tomorrow: {
    id: 'tomorrow',
    label: '내일',
    emoji: '☀️',
    hint: '내일 시간배정 + 내일 하기로 한 항목',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (t.startAt) return isSameDay(new Date(t.startAt), tomorrow);
      const tomorrowKey = localDateKey(tomorrow);
      return t.plannedFor === tomorrowKey;
    },
  },
  thisWeek: {
    id: 'thisWeek',
    label: '이번주',
    emoji: '📅',
    hint: '이번주(월~일) 시간배정 + 이번주에 하기로 한 항목',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      if (t.startAt) return inRange(t.startAt, start, end);
      return plannedInRange(t.plannedFor, start, end);
    },
  },
  thisMonth: {
    id: 'thisMonth',
    label: '이번달',
    emoji: '🗓',
    hint: '이번달 시간배정 + 이번달에 하기로 한 항목',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      if (t.startAt) return inRange(t.startAt, start, end);
      return plannedInRange(t.plannedFor, start, end);
    },
  },
};

export const SMART_LIST_ORDER: SmartListId[] = ['today', 'tomorrow', 'thisWeek', 'thisMonth'];

/** 사이드바 "대기함" 박스 멤버십 — 시간/계획/리스트/목표 어디에도 안 묶인 task. */
export const isWaiting = (t: PlannerTask): boolean =>
  isActive(t) && !t.startAt && !t.plannedFor && !t.listId && !t.goalId;

/**
 * 플래너 탭에 드롭했을 때 plannedFor 로 찍힐 dateKey.
 * - today/tomorrow: 그 날
 * - thisWeek: 오늘이 이번주 안에 있으면 오늘, 아니면 이번주 월요일
 * - thisMonth: 오늘이 이번달이면 오늘, 아니면 이번달 1일
 */
export const plannedKeyForSmartList = (id: SmartListId, now: Date = new Date()): string => {
  if (id === 'today') return localDateKey(now);
  if (id === 'tomorrow') {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return localDateKey(t);
  }
  if (id === 'thisWeek') {
    return localDateKey(startOfWeek(now));
  }
  return localDateKey(startOfMonth(now));
};

/**
 * Smart Lists — 시스템 가상 필터 (TickTick / Todoist 패턴).
 *
 * 사용자가 만든 list 위에 항상 노출. 가장 자주 쓰는 흐름:
 * - Today  : 오늘 시간배정 + 인박스(미배정) 합쳐서
 * - Tomorrow: 내일 시간배정
 * - Next 7 : 앞으로 7일 시간배정
 * - Inbox  : 시간 미배정만 (현 인박스)
 * - All    : 모두 (완료/취소 제외)
 */
import type { PlannerTask } from '@/types/planner';

export type SmartListId = 'today' | 'tomorrow' | 'next7' | 'inbox' | 'all';

export interface SmartListDef {
  id: SmartListId;
  label: string;
  emoji: string;
  /** 한국어 hint (빈 상태 등). */
  hint?: string;
  /** task 가 이 smart list 에 속하는지. */
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

const isActive = (t: PlannerTask): boolean => !t.done && !t.canceled && !t.someday;

export const SMART_LISTS: Record<SmartListId, SmartListDef> = {
  today: {
    id: 'today',
    label: '오늘',
    emoji: '⭐',
    hint: '오늘 시간배정된 항목 + 인박스',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      if (!t.startAt) return true; // 인박스도 포함
      return isSameDay(new Date(t.startAt), now);
    },
  },
  tomorrow: {
    id: 'tomorrow',
    label: '내일',
    emoji: '☀️',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      if (!t.startAt) return false;
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return isSameDay(new Date(t.startAt), tomorrow);
    },
  },
  next7: {
    id: 'next7',
    label: '다음 7일',
    emoji: '📅',
    match: (t, now = new Date()) => {
      if (!isActive(t)) return false;
      if (!t.startAt) return false;
      const today = startOfDay(now);
      const future = new Date(today);
      future.setDate(today.getDate() + 7);
      const ts = new Date(t.startAt).getTime();
      return ts >= today.getTime() && ts < future.getTime();
    },
  },
  inbox: {
    id: 'inbox',
    label: '인박스',
    emoji: '📥',
    hint: '시간 미배정',
    match: (t) => isActive(t) && !t.startAt,
  },
  all: {
    id: 'all',
    label: '전체',
    emoji: '📋',
    match: (t) => isActive(t),
  },
};

export const SMART_LIST_ORDER: SmartListId[] = ['today', 'tomorrow', 'next7', 'inbox', 'all'];

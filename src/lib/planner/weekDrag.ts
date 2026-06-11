import type { PlannerTask } from '@/types/planner';
import { nextHalfHourSlot } from './timeSlots';
import { combineDayAndTime, parseDayKey, toDayKey, toHhMm } from './timeKeys';

type TaskPatch = Partial<Omit<PlannerTask, 'id' | 'createdAt'>>;

const dayKeyFromIso = (dayIso: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayIso)) return parseDayKey(dayIso) ? dayIso : '';
  const date = new Date(dayIso);
  return Number.isNaN(date.getTime()) ? '' : toDayKey(date);
};

export const defaultWeekScheduleTime = (dayKeyOrIso: string, now: Date = new Date()): string => {
  const dayKey = dayKeyFromIso(dayKeyOrIso);
  if (dayKey && dayKey === toDayKey(now)) {
    return toHhMm(nextHalfHourSlot(now));
  }
  return '09:00';
};

export const buildLocalIsoForDayTime = (dayKeyOrIso: string, time: string): string => {
  const dayKey = dayKeyFromIso(dayKeyOrIso) || toDayKey(new Date());
  const date = combineDayAndTime(dayKey, time) ?? combineDayAndTime(dayKey, '09:00');
  return date!.toISOString();
};

export const buildWeekSchedulePatch = (
  dayKeyOrIso: string,
  time: string,
  durationMin: number,
): TaskPatch => {
  const startAt = buildLocalIsoForDayTime(dayKeyOrIso, time);
  const safeDurationMin = Math.max(15, Number.isFinite(durationMin) ? durationMin : 60);
  const endAt = new Date(new Date(startAt).getTime() + safeDurationMin * 60_000).toISOString();

  return {
    startAt,
    endAt,
    plannedFor: undefined,
    laneOrder: undefined,
    todoOrder: undefined,
  };
};

export const buildWeekTodoMovePatch = (dayKey: string): TaskPatch => ({
  plannedFor: dayKey,
  startAt: undefined,
  endAt: undefined,
  laneOrder: undefined,
  todoOrder: undefined,
});

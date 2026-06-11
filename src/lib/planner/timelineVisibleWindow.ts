import { intervalOverlapsRange, localDayBounds } from './timeRange';

export interface TimelineWindowItem {
  startAt?: string;
  endAt?: string;
}

export interface TimelineVisibleWindowOptions {
  compact: boolean;
  dateIso: string;
  items: TimelineWindowItem[];
  compactStartHour?: number;
  compactEndHour?: number;
  fullStartHour?: number;
  fullEndHour?: number;
}

const minutesFromDayStart = (valueMs: number, dayStartMs: number) =>
  (valueMs - dayStartMs) / 60_000;

/**
 * Compact timelines normally show the working-day window, but scheduled blocks
 * that overlap the current date just outside that window must still be visible.
 * This keeps overnight events from disappearing on the next day's timeline.
 */
export const getTimelineVisibleWindow = ({
  compact,
  dateIso,
  items,
  compactStartHour = 7,
  compactEndHour = 23,
  fullStartHour = 0,
  fullEndHour = 24,
}: TimelineVisibleWindowOptions): { startHour: number; endHour: number } => {
  if (!compact) return { startHour: fullStartHour, endHour: fullEndHour };

  const { start: dayStart, end: dayEnd } = localDayBounds(dateIso);
  const dayStartMs = dayStart.getTime();
  let startHour = compactStartHour;
  let endHour = compactEndHour;

  for (const item of items) {
    if (!item.startAt) continue;
    const endAt = item.endAt ?? item.startAt;
    if (!intervalOverlapsRange(item.startAt, endAt, dayStart, dayEnd)) continue;

    const rawStartMs = new Date(item.startAt).getTime();
    const rawEndMs = new Date(endAt).getTime();
    if (!Number.isFinite(rawStartMs) || !Number.isFinite(rawEndMs) || rawEndMs <= rawStartMs) continue;

    const displayStartMin = minutesFromDayStart(Math.max(rawStartMs, dayStartMs), dayStartMs);
    const displayEndMin = minutesFromDayStart(Math.min(rawEndMs, dayEnd.getTime()), dayStartMs);
    if (displayEndMin <= displayStartMin) continue;

    if (displayStartMin < compactStartHour * 60) {
      startHour = Math.min(startHour, Math.floor(displayStartMin / 60));
    }
    if (displayEndMin > compactEndHour * 60) {
      endHour = Math.max(endHour, Math.ceil(displayEndMin / 60));
    }
  }

  return {
    startHour: Math.max(fullStartHour, startHour),
    endHour: Math.min(fullEndHour, Math.max(startHour + 1, endHour)),
  };
};

export const DEFAULT_TIMELINE_OVERNIGHT_DRAG_MINUTES = 12 * 60;

export interface TimelineDragSelectionInput {
  startMin: number;
  endMin: number;
  minVisibleMinute: number;
  maxVisibleMinute: number;
  minDurationMin?: number;
  maxOvernightMinute?: number;
}

export interface TimelineDragSelection {
  startMin: number;
  endMin: number;
  durationMin: number;
}

export const buildTimelineDragSelection = ({
  startMin,
  endMin,
  minVisibleMinute,
  maxVisibleMinute,
  minDurationMin = 15,
  maxOvernightMinute,
}: TimelineDragSelectionInput): TimelineDragSelection => {
  const minDuration = Math.max(1, Math.round(minDurationMin));
  const dayStart = Math.min(minVisibleMinute, maxVisibleMinute);
  const dayEnd = Math.max(minVisibleMinute, maxVisibleMinute);
  const latestStart = Math.max(dayStart, dayEnd - minDuration);
  const rawStart = Math.min(startMin, endMin);
  const rawEnd = Math.max(startMin, endMin);
  const endLimit = Math.max(
    dayEnd,
    maxOvernightMinute ?? dayEnd + DEFAULT_TIMELINE_OVERNIGHT_DRAG_MINUTES,
  );

  const boundedStart = Math.min(latestStart, Math.max(dayStart, rawStart));
  const boundedEnd = Math.min(endLimit, Math.max(rawEnd, boundedStart + minDuration));

  return {
    startMin: boundedStart,
    endMin: boundedEnd,
    durationMin: boundedEnd - boundedStart,
  };
};

export const formatTimelineMinuteLabel = (minute: number): string => {
  const minutesPerDay = 24 * 60;
  const dayOffset = Math.floor(minute / minutesPerDay);
  const minuteOfDay = ((minute % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const hour = Math.floor(minuteOfDay / 60);
  const min = minuteOfDay % 60;
  const label = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  return dayOffset > 0 ? `다음날 ${label}` : label;
};

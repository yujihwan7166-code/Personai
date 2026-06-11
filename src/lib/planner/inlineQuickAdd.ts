import { parseNaturalLanguage } from '@/lib/planner/parseNaturalLanguage';
import type { PlannerTask, Priority, TaskListColor } from '@/types/planner';

export const DEFAULT_INLINE_QUICK_ADD_DURATION_MIN = 30;

const hasInlineScheduleToken = (text: string): boolean =>
  /(오늘|내일|모레|today|tomorrow|이번주|다음주|\b\d{1,2}:\d{2}\b|\b\d{1,2}(?:am|pm)\b|(?:오전|오후)\s*\d{1,2}\s*시|\b\d{1,2}\s*시\s*\d{1,2}\s*분?|\d{1,2}\s*월\s*\d{1,2}\s*일)/i.test(text);

const parseInlineDurationMin = (text: string): number | undefined => {
  const hourMinute = text.match(/(\d+)시간\s*(\d+)분/);
  if (hourMinute) return Number(hourMinute[1]) * 60 + Number(hourMinute[2]);
  const hour = text.match(/(\d+(?:\.\d+)?)시간/);
  if (hour) return Math.round(Number(hour[1]) * 60);
  const minute = text.match(/(\d+)분(?!\s*전)/);
  if (minute) return Number(minute[1]);
  return undefined;
};

const stripInlineMetadata = (text: string): string =>
  text
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/!([1-3])\b/g, '')
    .replace(/\d+시간\s*\d+분|\d+(?:\.\d+)?시간|\d+분(?!\s*전)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const buildInlineQuickAddTaskInput = (
  rawTitle: string,
  startIso: string,
  durationMin?: number,
  options?: {
    color?: TaskListColor;
    priority?: Priority;
  },
) => {
  const trimmed = rawTitle.trim();
  const parsed = parseNaturalLanguage(trimmed, new Date(startIso));
  const explicitDuration = parseInlineDurationMin(trimmed);
  const fallbackDuration = explicitDuration ?? durationMin ?? DEFAULT_INLINE_QUICK_ADD_DURATION_MIN;
  const endAt = new Date(new Date(startIso).getTime() + fallbackDuration * 60_000).toISOString();
  const hasNaturalSchedule = hasInlineScheduleToken(trimmed);

  return {
    title: stripInlineMetadata(hasNaturalSchedule ? trimmed : parsed.cleanTitle || trimmed) || trimmed,
    startAt: startIso,
    endAt,
    recurrence: parsed.recurrence,
    tags: parsed.tags,
    priority: options?.priority !== undefined
      ? (options.priority === 0 ? undefined : options.priority)
      : parsed.priority,
    color: options?.color,
  } satisfies Partial<PlannerTask>;
};

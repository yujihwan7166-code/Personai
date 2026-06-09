import type { PlannerEvent, PlannerTask } from '@/types/planner';

export const PLANNER_REMINDER_OPTIONS: ReadonlyArray<{ minutes: number | null; label: string }> = [
  { minutes: null, label: '없음' },
  { minutes: 0, label: '시작 시각' },
  { minutes: 5, label: '5분 전' },
  { minutes: 10, label: '10분 전' },
  { minutes: 30, label: '30분 전' },
  { minutes: 60, label: '1시간 전' },
  { minutes: 1440, label: '하루 전' },
];

export const DEFAULT_FLOATING_TASK_REMINDER_TIME = '09:00';

export const normalizeReminderMinutes = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = [...new Set(value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0 && item <= 30 * 24 * 60)
    .map((item) => Math.round(item)))]
    .sort((a, b) => a - b);
  return normalized.length > 0 ? normalized : undefined;
};

export const formatReminderMinute = (minutes: number): string => {
  if (minutes === 0) return '시작 시각';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes % 1440 === 0) return `${minutes / 1440}일 전`;
  if (minutes % 60 === 0) return `${minutes / 60}시간 전`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}시간 ${rest}분 전`;
};

export const formatReminderSummary = (reminderMinutes?: number[]): string => {
  const normalized = normalizeReminderMinutes(reminderMinutes);
  if (!normalized) return '없음';
  if (normalized.length === 1) return formatReminderMinute(normalized[0]);
  return normalized.map(formatReminderMinute).join(', ');
};

export const floatingTaskBaseIso = (plannedFor?: string): string | undefined => {
  if (!plannedFor) return undefined;
  const [hour, minute] = DEFAULT_FLOATING_TASK_REMINDER_TIME.split(':').map(Number);
  const base = new Date(`${plannedFor}T00:00:00`);
  if (Number.isNaN(base.getTime())) return undefined;
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};

export const reminderBaseIsoForTask = (task: Pick<PlannerTask, 'startAt' | 'plannedFor'>): string | undefined =>
  task.startAt ?? floatingTaskBaseIso(task.plannedFor);

export const reminderBaseIsoForEvent = (event: Pick<PlannerEvent, 'startAt'>): string | undefined =>
  event.startAt;

export const reminderFireIso = (baseIso: string, minutesBefore: number): string =>
  new Date(new Date(baseIso).getTime() - minutesBefore * 60_000).toISOString();

export interface PlannerReminderOccurrence {
  itemId: string;
  title: string;
  kindLabel: string;
  baseIso: string;
  fireIso: string;
  minutesBefore: number;
}

export const reminderOccurrencesForTask = (
  task: Pick<PlannerTask, 'id' | 'title' | 'startAt' | 'plannedFor' | 'reminderMinutes'>,
  kindLabel = '할 일',
): PlannerReminderOccurrence[] => {
  const baseIso = reminderBaseIsoForTask(task);
  const minutes = normalizeReminderMinutes(task.reminderMinutes);
  if (!baseIso || !minutes) return [];
  return minutes.map((minutesBefore) => ({
    itemId: task.id,
    title: task.title,
    kindLabel,
    baseIso,
    fireIso: reminderFireIso(baseIso, minutesBefore),
    minutesBefore,
  }));
};

export const reminderOccurrencesForEvent = (
  event: Pick<PlannerEvent, 'id' | 'title' | 'startAt' | 'reminderMinutes'>,
  kindLabel = '일정',
): PlannerReminderOccurrence[] => {
  const baseIso = reminderBaseIsoForEvent(event);
  const minutes = normalizeReminderMinutes(event.reminderMinutes);
  if (!baseIso || !minutes) return [];
  return minutes.map((minutesBefore) => ({
    itemId: event.id,
    title: event.title,
    kindLabel,
    baseIso,
    fireIso: reminderFireIso(baseIso, minutesBefore),
    minutesBefore,
  }));
};

export const isNotificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
};

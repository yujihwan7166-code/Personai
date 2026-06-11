/**
 * Planner item reminders.
 *
 * Browser Notifications are intentionally permission-gated and only work while
 * the app is open in this local-first version. The data model is already shaped
 * for future persistent/PWA delivery: each item stores `reminderMinutes`.
 */
import { useEffect } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import {
  floatingTaskBaseIso,
  formatReminderMinute,
  notificationPermission,
  reminderOccurrencesForEvent,
  reminderOccurrencesForTask,
} from '@/lib/planner/reminders';
import type { PlannerTask } from '@/types/planner';

const NOTIFIED_KEY = 'planner.notified-reminders.v2';
const CHECK_INTERVAL = 15_000;
const LOOKAHEAD_MS = 5_000;
const LOOKBACK_MS = CHECK_INTERVAL + 5_000;
const FUTURE_WINDOW_DAYS = 31;
const HINT_KEY = 'planner.reminder-permission-hint.v1';

type NotifiedMap = Record<string, number>;

const readNotified = (): NotifiedMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(NOTIFIED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as NotifiedMap
      : {};
  } catch {
    return {};
  }
};

const writeNotified = (map: NotifiedMap): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
  } catch { /* silent */ }
};

const pruneNotified = (map: NotifiedMap): NotifiedMap => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
  return Object.fromEntries(Object.entries(map).filter(([, firedAt]) => firedAt >= cutoff));
};

const occurrenceKey = (itemId: string, baseIso: string, minutesBefore: number): string =>
  `${itemId}|${baseIso}|${minutesBefore}`;

const shouldFire = (fireIso: string, now: number): boolean => {
  const fireMs = new Date(fireIso).getTime();
  return Number.isFinite(fireMs)
    && fireMs <= now + LOOKAHEAD_MS
    && fireMs >= now - LOOKBACK_MS;
};

const canShowNotification = (): boolean =>
  typeof window !== 'undefined' && notificationPermission() === 'granted';

const formatReminderLead = (minutesBefore: number): string =>
  minutesBefore === 0 ? '지금' : formatReminderMinute(minutesBefore).replace(/전$/, '후');

const showPlannerNotification = (title: string, body: string, tag: string) => {
  const notification = new Notification(title, {
    body,
    tag,
    renotify: false,
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

const plannedTaskInWindow = (task: PlannerTask, rangeStart: Date, rangeEnd: Date): boolean => {
  if (!task.plannedFor || task.startAt) return false;
  const baseIso = floatingTaskBaseIso(task.plannedFor);
  if (!baseIso) return false;
  const baseMs = new Date(baseIso).getTime();
  return baseMs >= rangeStart.getTime() && baseMs < rangeEnd.getTime();
};

const maybeHintOnce = (): void => {
  if (typeof window === 'undefined') return;
  if (notificationPermission() !== 'default') return;
  try {
    if (window.localStorage.getItem(HINT_KEY)) return;
    window.localStorage.setItem(HINT_KEY, '1');
    import('@/lib/notify').then(({ notify }) => {
      notify.info('알림을 켜려면 일정 설정창의 알림 옵션을 눌러 권한을 허용해주세요', { duration: 4200 });
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
};

export const usePlannerNotifications = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      const now = Date.now();
      const rangeStart = new Date(now - 24 * 60 * 60_000);
      const rangeEnd = new Date(now + FUTURE_WINDOW_DAYS * 24 * 60 * 60_000);

      const scheduledTasks = taskStore
        .listScheduledRange(rangeStart, rangeEnd)
        .filter((task) => !task.done && !task.canceled && !task.someday);
      const floatingTasks = taskStore
        .list()
        .filter((task) => !task.done && !task.canceled && !task.someday && plannedTaskInWindow(task, rangeStart, rangeEnd));
      const events = eventStore.listByRange(rangeStart, rangeEnd);

      const occurrences = [
        ...scheduledTasks.flatMap((task) => reminderOccurrencesForTask(task, '할 일')),
        ...floatingTasks.flatMap((task) => reminderOccurrencesForTask(task, '할 일')),
        ...events.flatMap((event) => reminderOccurrencesForEvent(event, '일정')),
      ];

      if (occurrences.length > 0 && !canShowNotification()) {
        maybeHintOnce();
        return;
      }

      const notified = pruneNotified(readNotified());
      let changed = false;

      for (const occurrence of occurrences) {
        if (!shouldFire(occurrence.fireIso, now)) continue;
        const key = occurrenceKey(occurrence.itemId, occurrence.baseIso, occurrence.minutesBefore);
        if (notified[key]) continue;
        const lead = formatReminderLead(occurrence.minutesBefore);
        const title = occurrence.minutesBefore === 0
          ? `${lead} ${occurrence.kindLabel} 시작`
          : `${lead} ${occurrence.kindLabel}`;
        showPlannerNotification(title, occurrence.title, key);
        notified[key] = now;
        changed = true;
      }

      if (changed) writeNotified(notified);
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL);
    return () => window.clearInterval(id);
  }, []);
};

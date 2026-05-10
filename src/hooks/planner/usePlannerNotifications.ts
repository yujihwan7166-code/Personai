/**
 * 플래너 시간 블록 알림 — 시작 시점 + 5분 전 브라우저 알림.
 *
 * 정책:
 * - 알림 권한 있을 때만 (없으면 silent — 사용자가 포모도로/메모 등에서 이미 권한 받은 상태에서만 작동).
 * - 한 번 알린 occurrence 는 중복 방지 (sessionStorage 기록).
 * - 1분마다 체크 (인터벌 60s).
 */
import { useEffect } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import type { PlannerTask, PlannerEvent } from '@/types/planner';

const NOTIFIED_KEY = 'planner.notified.v1';
const CHECK_INTERVAL = 60_000;
const REMINDER_BEFORE_MIN = 5;

const readNotified = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
};

const writeNotified = (set: Set<string>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch { /* silent */ }
};

const canNotify = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  Notification.permission === 'granted';

const HINT_KEY = 'planner.notif-hint.v1';

const maybeHintOnce = (hasUpcoming: boolean): void => {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return; // 거절 = 안내해도 의미 없음
  if (!hasUpcoming) return; // 알릴 게 없으면 안내도 노이즈
  try {
    if (window.localStorage.getItem(HINT_KEY)) return; // 1회만
    window.localStorage.setItem(HINT_KEY, '1');
    // 동적 import 로 notify 끌어옴 — circular 방지.
    import('@/lib/notify').then(({ notify }) => {
      notify.info('일정 알림을 받으려면 브라우저 알림 권한이 필요해요', { duration: 4500 });
    }).catch(() => { /* silent */ });
  } catch { /* localStorage 비활성 */ }
};

export const usePlannerNotifications = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      if (!canNotify()) {
        // 권한 없음 + 곧 시작할 항목 있음 → 1회 안내.
        const now = Date.now();
        const todayIso = new Date().toISOString();
        const upcoming = [
          ...eventStore.listByDate(todayIso),
          ...taskStore.listScheduled(todayIso),
        ].some((it) => {
          if (!it.startAt) return false;
          const diff = new Date(it.startAt).getTime() - now;
          return diff > 0 && diff <= 60 * 60_000; // 1시간 안
        });
        maybeHintOnce(upcoming);
        return;
      }
      const now = Date.now();
      const todayIso = new Date().toISOString();

      // 오늘 + 내일 까지 — 자정 경계 케이스 대비.
      const todayItems = [
        ...eventStore.listByDate(todayIso),
        ...taskStore.listScheduled(todayIso),
      ];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowItems = [
        ...eventStore.listByDate(tomorrowDate.toISOString()),
        ...taskStore.listScheduled(tomorrowDate.toISOString()),
      ];

      const notified = readNotified();
      let changed = false;

      const consider = (item: PlannerEvent | PlannerTask, kindLabel: string) => {
        if (!item.startAt) return;
        const startMs = new Date(item.startAt).getTime();
        const diff = startMs - now;
        // 5분 전 ± 1분 윈도우.
        const reminderKey = `reminder:${item.id}:${item.startAt}`;
        if (
          diff <= REMINDER_BEFORE_MIN * 60_000 + 30_000 &&
          diff > REMINDER_BEFORE_MIN * 60_000 - 30_000 &&
          !notified.has(reminderKey)
        ) {
          new Notification(`⏰ 5분 후 ${kindLabel}`, {
            body: item.title,
            tag: reminderKey,
          });
          notified.add(reminderKey);
          changed = true;
        }
        // 시작 시점 ± 30초.
        const startKey = `start:${item.id}:${item.startAt}`;
        if (Math.abs(diff) < 30_000 && !notified.has(startKey)) {
          new Notification(`▶ 지금 ${kindLabel} 시작`, {
            body: item.title,
            tag: startKey,
          });
          notified.add(startKey);
          changed = true;
        }
      };

      for (const item of todayItems) {
        if ('done' in item && item.done) continue;
        if ('canceled' in item && item.canceled) continue;
        const kindLabel = 'priority' in item ? '할 일' : '일정';
        consider(item, kindLabel);
      }
      for (const item of tomorrowItems) {
        if ('done' in item && item.done) continue;
        if ('canceled' in item && item.canceled) continue;
        const kindLabel = 'priority' in item ? '할 일' : '일정';
        consider(item, kindLabel);
      }

      if (changed) writeNotified(notified);
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL);
    return () => window.clearInterval(id);
  }, []);
};

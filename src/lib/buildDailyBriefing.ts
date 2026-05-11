/**
 * 데일리 브리핑 데이터 빌더 — 사용자 store 들에서 오늘 컨텍스트 모음.
 *
 * 정적 (AI 호출 X) — 빠르고 비용 0. AI 멘트는 모달에서 옵션으로 호출 가능.
 */
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { ddayStore } from '@/services/planner/ddayStore';

export interface BriefingData {
  /** 사람 친화 인사 라인 (예: "좋은 아침이에요 · 5월 11일 (일)"). */
  greeting: string;
  /** 시간순 오늘 일정. */
  timed: Array<{ kind: 'event' | 'task'; title: string; startAt: string; endAt?: string; done?: boolean }>;
  /** 시간 미배정 오늘 할 일. */
  inbox: Array<{ id: string; title: string; priority?: number }>;
  /** 어제 미완료 할 일. */
  overdue: Array<{ id: string; title: string }>;
  /** 오늘 습관 (미체크 streak 위험 포함). */
  habits: Array<{ id: string; title: string; done: boolean; streakAtRisk: boolean }>;
  /** 가까운 D-day (오늘 또는 7일 안). */
  upcomingDday: Array<{ label: string; daysLeft: number }>;
  /** 핵심 추천 1개 — "가장 먼저 할 일" 자동 결정. */
  pickFirst?: { kind: 'event' | 'task' | 'habit'; title: string; reason: string };
}

const greetingFor = (now: Date): string => {
  const hour = now.getHours();
  const part = hour < 5 ? '편안한 밤'
    : hour < 12 ? '좋은 아침'
    : hour < 17 ? '좋은 오후'
    : hour < 22 ? '좋은 저녁'
    : '편안한 밤';
  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  return `${part}이에요 · ${dateLabel}`;
};

const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const buildDailyBriefing = (): BriefingData => {
  const now = new Date();
  const todayKey = localDateKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  // ── 시간 잡힌 항목 ──
  const events = eventStore.listByDate(now.toISOString());
  const scheduledTasks = taskStore.listScheduled(now.toISOString())
    .filter((t) => !t.canceled && !t.someday);
  const timed = [
    ...events.map((e) => ({ kind: 'event' as const, title: e.title, startAt: e.startAt, endAt: e.endAt })),
    ...scheduledTasks.map((t) => ({ kind: 'task' as const, title: t.title, startAt: t.startAt!, endAt: t.endAt, done: t.done })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  // ── 인박스 (오늘 plannedFor 또는 아무 곳 안 잡힘) ──
  const allTasks = taskStore.list();
  const inbox = allTasks
    .filter((t) => !t.startAt && !t.done && !t.canceled && !t.someday)
    .filter((t) => !t.goalId || t.plannedFor === todayKey)
    .slice(0, 10)
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority }));

  // ── 어제 미완료 (plannedFor=어제이고 미완료) ──
  const overdue = allTasks
    .filter((t) => !t.done && !t.canceled && !t.someday)
    .filter((t) => t.plannedFor === yesterdayKey)
    .slice(0, 5)
    .map((t) => ({ id: t.id, title: t.title }));

  // ── 오늘 습관 + streak 위험 ──
  const activeHabits = habitStore.listActive();
  const habits = activeHabits.slice(0, 8).map((h) => {
    const todayCheckins = habitCheckinStore.range(h.id, todayKey, todayKey);
    const done = todayCheckins.length > 0;
    // streak 위험 — 어제는 했고 오늘 아직 안 했으면 위험 (간단한 판단)
    const yesterdayCheckins = habitCheckinStore.range(h.id, yesterdayKey, yesterdayKey);
    const streakAtRisk = !done && yesterdayCheckins.length > 0;
    return { id: h.id, title: h.title, done, streakAtRisk };
  });

  // ── 가까운 D-day (7일 안) ──
  const ddays = ddayStore.list();
  const upcomingDday = ddays
    .map((d) => {
      const dDate = new Date(`${d.dateIso}T00:00:00`);
      const todayMid = new Date(now);
      todayMid.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((dDate.getTime() - todayMid.getTime()) / 86_400_000);
      return { label: d.label, daysLeft };
    })
    .filter((d) => d.daysLeft >= 0 && d.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  // ── 가장 먼저 할 일 ──
  // 우선순위: 1) 임박한 일정/할일(2시간 안), 2) 우선순위 높은 인박스, 3) 어제 미완료, 4) streak 위험 습관
  let pickFirst: BriefingData['pickFirst'];
  const nowMs = now.getTime();
  const imminent = timed.find((it) => {
    const startMs = new Date(it.startAt).getTime();
    const done = it.kind === 'task' ? it.done : false;
    return !done && startMs >= nowMs && startMs - nowMs <= 2 * 3600_000;
  });
  if (imminent) {
    const dt = new Date(imminent.startAt);
    const hm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    pickFirst = {
      kind: imminent.kind,
      title: imminent.title,
      reason: `곧 ${hm} 에 시작해요`,
    };
  } else {
    const highInbox = inbox.find((t) => (t.priority ?? 0) >= 2);
    if (highInbox) {
      pickFirst = { kind: 'task', title: highInbox.title, reason: '우선순위 높음' };
    } else if (overdue.length > 0) {
      pickFirst = { kind: 'task', title: overdue[0].title, reason: '어제 못 끝낸 일' };
    } else if (habits.find((h) => h.streakAtRisk)) {
      const h = habits.find((x) => x.streakAtRisk)!;
      pickFirst = { kind: 'habit', title: h.title, reason: 'streak 끊길 위험' };
    } else if (inbox.length > 0) {
      pickFirst = { kind: 'task', title: inbox[0].title, reason: '먼저 손대볼 만한 것' };
    }
  }

  return {
    greeting: greetingFor(now),
    timed,
    inbox,
    overdue,
    habits,
    upcomingDday,
    pickFirst,
  };
};

/**
 * 데일리 브리핑 데이터 빌더 — planner / journal store 에서 모음.
 *
 * 모달 열 때 1회 호출 (정적). AI 호출 X.
 */
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { ddayStore } from '@/services/planner/ddayStore';
import { journalStore } from '@/services/journalStore';
import type { JournalEntry } from '@/types/journal';

export interface BriefingData {
  greeting: string;
  date: string;
  /** 시간순 오늘 일정·할일. */
  timed: Array<{ kind: 'event' | 'task'; title: string; startAt: string; endAt?: string; done?: boolean }>;
  /** 시간 미배정 오늘 할 일. */
  inbox: Array<{ id: string; title: string; priority?: number }>;
  /** 어제 미완료 할 일. */
  overdue: Array<{ id: string; title: string }>;
  /** 오늘 습관. */
  habits: Array<{ id: string; title: string; done: boolean; streakAtRisk: boolean }>;
  /** 가까운 D-day (7일 안). */
  upcomingDday: Array<{ label: string; daysLeft: number }>;
  /** "가장 먼저" 추천 1개. */
  pickFirst?: { kind: 'event' | 'task' | 'habit'; title: string; reason: string };
  /** 최근 일기 (오늘 또는 어제 가장 최근 1건). */
  recentJournal?: JournalEntry;
  /** 이번 달 일정·할일 있는 날 (달력 위젯 점 표시용). */
  monthMarks: Record<string, { events: number; tasks: number }>;
}

const greetingFor = (now: Date): string => {
  const hour = now.getHours();
  if (hour < 5) return '편안한 밤이에요';
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 17) return '좋은 오후예요';
  if (hour < 22) return '좋은 저녁이에요';
  return '편안한 밤이에요';
};

const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function buildBriefingData(): BriefingData {
  const now = new Date();
  const todayKey = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  // ── 시간 잡힌 항목 ──
  const events = eventStore.listByDate(now.toISOString());
  const scheduledTasks = taskStore.listScheduled(now.toISOString())
    .filter((t) => !t.canceled && !t.someday);
  const timed = [
    ...events.map((e) => ({ kind: 'event' as const, title: e.title, startAt: e.startAt, endAt: e.endAt })),
    ...scheduledTasks.map((t) => ({ kind: 'task' as const, title: t.title, startAt: t.startAt!, endAt: t.endAt, done: t.done })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  // ── 인박스 ──
  const allTasks = taskStore.list();
  const inbox = allTasks
    .filter((t) => !t.startAt && !t.done && !t.canceled && !t.someday)
    .filter((t) => !t.goalId || t.plannedFor === todayKey)
    .slice(0, 10)
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority }));

  // ── 어제 미완료 ──
  const overdue = allTasks
    .filter((t) => !t.done && !t.canceled && !t.someday)
    .filter((t) => t.plannedFor === yesterdayKey)
    .slice(0, 5)
    .map((t) => ({ id: t.id, title: t.title }));

  // ── 습관 ──
  const activeHabits = habitStore.listActive();
  const habits = activeHabits.slice(0, 10).map((h) => {
    const todayCheckins = habitCheckinStore.range(h.id, todayKey, todayKey);
    const done = todayCheckins.length > 0;
    const yesterdayCheckins = habitCheckinStore.range(h.id, yesterdayKey, yesterdayKey);
    const streakAtRisk = !done && yesterdayCheckins.length > 0;
    return { id: h.id, title: h.title, done, streakAtRisk };
  });

  // ── D-day ──
  const ddays = ddayStore.list();
  const upcomingDday = ddays
    .map((d) => {
      const dDate = new Date(`${d.dateIso}T00:00:00`);
      const todayMid = new Date(now);
      todayMid.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((dDate.getTime() - todayMid.getTime()) / 86_400_000);
      return { label: d.label, daysLeft };
    })
    .filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // ── 가장 먼저 ──
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
    pickFirst = { kind: imminent.kind, title: imminent.title, reason: `곧 ${hm} 에 시작해요` };
  } else {
    const highInbox = inbox.find((t) => (t.priority ?? 0) >= 2);
    if (highInbox) {
      pickFirst = { kind: 'task', title: highInbox.title, reason: '우선순위 높음' };
    } else if (overdue.length > 0) {
      pickFirst = { kind: 'task', title: overdue[0].title, reason: '어제 못 끝낸 일' };
    } else if (habits.find((h) => h.streakAtRisk)) {
      const h = habits.find((x) => x.streakAtRisk)!;
      pickFirst = { kind: 'habit', title: h.title, reason: '연속 기록 끊길 위험' };
    } else if (inbox.length > 0) {
      pickFirst = { kind: 'task', title: inbox[0].title, reason: '먼저 손대볼 만한 것' };
    }
  }

  // ── 최근 일기 (오늘 → 어제 순서로 가장 최근 1건) ──
  const todayJournals = journalStore.listByDate(todayKey);
  const yesterdayJournals = todayJournals.length === 0 ? journalStore.listByDate(yesterdayKey) : [];
  const recentJournal = todayJournals[0] ?? yesterdayJournals[0] ?? undefined;

  // ── 이번 달 일정·할일 있는 날 (달력 위젯 점) ──
  const monthMarks: Record<string, { events: number; tasks: number }> = {};
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  for (let d = monthStart.getDate(); d <= monthEnd.getDate(); d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), d);
    const key = localDateKey(date);
    const evs = eventStore.listByDate(date.toISOString());
    const tsks = taskStore.listScheduled(date.toISOString()).filter((t) => !t.canceled);
    if (evs.length > 0 || tsks.length > 0) {
      monthMarks[key] = { events: evs.length, tasks: tsks.length };
    }
  }

  return {
    greeting: greetingFor(now),
    date: dateLabel,
    timed,
    inbox,
    overdue,
    habits,
    upcomingDday,
    pickFirst,
    recentJournal,
    monthMarks,
  };
}

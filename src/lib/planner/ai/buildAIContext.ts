/**
 * 현재 플래너 view 의 데이터를 → AI 가 읽을 텍스트 컨텍스트로 변환.
 *
 * 정책:
 * - day: 오늘의 일정·할일·습관 체크 상태
 * - week: 7일 일정 카운트 + 미완료 할일 합계
 * - month: 그 달 카운트 + 진행 중 목표
 * - year: 연간 요약 (최소)
 * - goals: 활성 목표 + 진척률
 * - habits: 활성 습관 + 최근 7일 streak
 *
 * 토큰 절약을 위해 짧게. 한 번 호출에 1k 토큰 넘지 않도록.
 */
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import type { PlannerView } from '@/components/planner/ViewToggle';

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildDayContext = (anchorIso: string): string => {
  const anchor = new Date(anchorIso);
  const dateKey = localDateKey(anchor);
  const lines: string[] = [];

  // 일정 (시간 있는 것)
  const events = eventStore.listByDate(anchor.toISOString());
  const scheduledTasks = taskStore.listScheduled(anchor.toISOString())
    .filter((t) => !t.canceled && !t.someday);

  const timed = [
    ...events.map((e) => ({ kind: 'event' as const, title: e.title, startAt: e.startAt, endAt: e.endAt })),
    ...scheduledTasks.map((t) => ({ kind: 'task' as const, title: t.title, startAt: t.startAt!, endAt: t.endAt, done: t.done })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  if (timed.length === 0) {
    lines.push('시간 잡힌 항목 없음');
  } else {
    lines.push('시간 잡힌 항목:');
    for (const it of timed) {
      const range = it.endAt ? `${fmtTime(it.startAt)}-${fmtTime(it.endAt)}` : fmtTime(it.startAt);
      const tag = it.kind === 'event' ? '[일정]' : (it as { done?: boolean }).done ? '[할일✓]' : '[할일]';
      lines.push(`- ${range} ${tag} ${it.title}`);
    }
  }

  // 할 일 (시간 미배정 + 오늘 plannedFor)
  const inboxTodo = taskStore.list().filter((t) => {
    if (t.startAt) return false;
    if (t.done || t.canceled || t.someday) return false;
    if (t.goalId && t.plannedFor !== dateKey) return false;
    return true;
  });
  if (inboxTodo.length > 0) {
    lines.push('');
    lines.push('대기/할 일 (시간 미배정):');
    for (const t of inboxTodo.slice(0, 15)) {
      const pri = t.priority ? ` (우선순위 ${t.priority})` : '';
      lines.push(`- ${t.title}${pri}`);
    }
    if (inboxTodo.length > 15) {
      lines.push(`- ... 외 ${inboxTodo.length - 15}개`);
    }
  }

  // 오늘의 습관
  const habits = habitStore.listActive();
  if (habits.length > 0) {
    lines.push('');
    lines.push('오늘의 습관:');
    for (const h of habits.slice(0, 10)) {
      const checkins = habitCheckinStore.range(h.id, dateKey, dateKey);
      const done = checkins.length > 0;
      lines.push(`- ${h.title} ${done ? '✓' : '·'}`);
    }
  }

  return lines.join('\n');
};

const buildWeekContext = (anchorIso: string): string => {
  const anchor = new Date(anchorIso);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const events = eventStore.listByRange(start, end);
  const tasks = taskStore.listScheduledRange(start, end)
    .filter((t) => !t.canceled && !t.someday);
  const undoneScheduled = tasks.filter((t) => !t.done).length;

  const lines: string[] = [];
  lines.push(`이번 주 (${localDateKey(start)} ~ ${localDateKey(new Date(end.getTime() - 1))}):`);
  lines.push(`- 일정: ${events.length}개`);
  lines.push(`- 시간 배정 할 일: ${tasks.length}개 (미완료 ${undoneScheduled}개)`);

  const inboxTodo = taskStore.list().filter((t) => !t.startAt && !t.done && !t.canceled && !t.someday);
  lines.push(`- 대기 할 일: ${inboxTodo.length}개`);

  return lines.join('\n');
};

const buildMonthContext = (anchorIso: string): string => {
  const anchor = new Date(anchorIso);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

  const events = eventStore.listByRange(start, end);
  const tasks = taskStore.listScheduledRange(start, end).filter((t) => !t.canceled && !t.someday);

  const lines: string[] = [];
  lines.push(`이번 달 (${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월):`);
  lines.push(`- 일정: ${events.length}개`);
  lines.push(`- 시간 배정 할 일: ${tasks.length}개`);

  return lines.join('\n');
};

/**
 * view 별 맞춤 컨텍스트. 토큰 절약 위해 view 가 보고 있는 범위만 포함.
 * 사용자 질문 직전에 호출 — 항상 최신 store 상태 반영.
 */
export const buildAIContext = (view: PlannerView, anchorIso: string): string => {
  const today = new Date();
  const headerLines = [
    `현재 시각: ${today.toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })}`,
    `사용자가 보고 있는 화면: ${VIEW_LABEL[view]} (기준일 ${localDateKey(new Date(anchorIso))})`,
  ];

  let body = '';
  switch (view) {
    case 'day':
      body = buildDayContext(anchorIso);
      break;
    case 'week':
      body = buildWeekContext(anchorIso);
      break;
    case 'month':
      body = buildMonthContext(anchorIso);
      break;
    case 'year':
      body = `${new Date(anchorIso).getFullYear()}년 — 상세 데이터는 사용자가 더 좁은 view 로 가야 합니다.`;
      break;
    case 'goals': {
      const lines: string[] = ['활성 목표 보기 모드 — 사용자가 목표·진척을 보고 있음.'];
      body = lines.join('\n');
      break;
    }
    case 'habits': {
      const habits = habitStore.listActive();
      const lines: string[] = ['활성 습관:'];
      for (const h of habits.slice(0, 20)) {
        lines.push(`- ${h.title}`);
      }
      body = lines.join('\n');
      break;
    }
    default:
      body = '';
  }

  return `${headerLines.join('\n')}\n\n${body}`;
};

const VIEW_LABEL: Record<PlannerView, string> = {
  day: '일 (오늘)',
  week: '주',
  month: '월',
  year: '년',
  goals: '목표',
  habits: '습관',
};

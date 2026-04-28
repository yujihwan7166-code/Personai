/**
 * Planner — 통합 SPA (Step 1)
 *
 * 사이드바 + 메인 split. 4 도구(목표·습관·할 일·캘린더)를 단일 화면에서.
 * 기존 /goals /habits /tasks /calendar 페이지는 그대로 두고 병렬.
 *
 * 뷰 전환:
 *   today / inbox / calendar / goal:<id> / habit:<id>
 * URL 쿼리 ?view=today / ?goal=g_xx / ?habit=h_xx 동기화.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Trash2, Check, Search,
  Target, Repeat, ListChecks, Calendar as CalIcon, Inbox, Sun,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  // store + hooks
  useGoals, useTasks, useHabits, useEvents,
  useGoalProgress, useHabitStreak, useTodayTaskRows,
  // mutations
  addGoal, updateGoal, removeGoalCascade,
  addTask, updateTask, removeTask, toggleTaskDone, getTask,
  addHabit, archiveHabit, removeHabit, toggleHabitDay,
  addEvent, updateEvent, removeEvent,
  // helpers
  buildCalendarForDay,
  todayKey, dayKeyOf, dayKeyBefore, matchesCadence, formatKst,
  computeCurrentStreak,
  // types
  type Goal, type Task, type Habit, type ManualEvent, type DayKey,
  type GoalCategory, type GoalMetric, type HabitCadence, type Priority,
  type ID, type CalendarRow,
} from '@/lib/planner';
import { GOAL_TEMPLATES, CATEGORY_META } from '@/lib/planner/templates';

// ──────────────────────────────────────────
// View type
// ──────────────────────────────────────────
type View =
  | { kind: 'today' }
  | { kind: 'inbox' }
  | { kind: 'calendar' }
  | { kind: 'goal'; id: ID }
  | { kind: 'habit'; id: ID };

const CATEGORIES: GoalCategory[] = ['work', 'health', 'learning', 'relationship', 'finance', 'personal'];
const CAT_LABEL: Record<GoalCategory, string> = {
  work: '업무', health: '건강', learning: '학습',
  relationship: '관계', finance: '재정', personal: '개인',
};

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────
const Planner = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [decomposeFor, setDecomposeFor] = useState<Goal | null>(null);

  // URL → view
  const view: View = useMemo(() => {
    const goalId = params.get('goal');
    const habitId = params.get('habit');
    const v = params.get('view');
    if (goalId) return { kind: 'goal', id: goalId };
    if (habitId) return { kind: 'habit', id: habitId };
    if (v === 'inbox') return { kind: 'inbox' };
    if (v === 'calendar') return { kind: 'calendar' };
    return { kind: 'today' };
  }, [params]);

  const setView = (v: View) => {
    const next = new URLSearchParams();
    if (v.kind === 'today') next.set('view', 'today');
    else if (v.kind === 'inbox') next.set('view', 'inbox');
    else if (v.kind === 'calendar') next.set('view', 'calendar');
    else if (v.kind === 'goal') next.set('goal', v.id);
    else if (v.kind === 'habit') next.set('habit', v.id);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-pln-base flex">
      <Sidebar
        view={view}
        onView={setView}
        onBack={() => navigate('/')}
        onCreateGoal={() => setCreatingGoal(true)}
        onCreateHabit={() => setCreatingHabit(true)}
      />
      <main className="flex-1 min-w-0">
        {view.kind === 'today' && <TodayView onView={setView} />}
        {view.kind === 'inbox' && <InboxView />}
        {view.kind === 'calendar' && <CalendarView />}
        {view.kind === 'goal' && <GoalView goalId={view.id} onView={setView} />}
        {view.kind === 'habit' && <HabitView habitId={view.id} onView={setView} />}
      </main>

      {creatingGoal && (
        <GoalCreateModal
          onClose={() => setCreatingGoal(false)}
          onCreated={(g) => {
            setCreatingGoal(false);
            setDecomposeFor(g);
          }}
        />
      )}
      {decomposeFor && (
        <GoalDecomposeModal
          goal={decomposeFor}
          onClose={() => {
            const g = decomposeFor;
            setDecomposeFor(null);
            setView({ kind: 'goal', id: g.id });
          }}
        />
      )}
      {creatingHabit && <HabitCreateModal onClose={() => setCreatingHabit(false)} />}
    </div>
  );
};

export default Planner;

// ──────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────
function Sidebar({
  view, onView, onBack, onCreateGoal, onCreateHabit,
}: {
  view: View;
  onView: (v: View) => void;
  onBack: () => void;
  onCreateGoal: () => void;
  onCreateHabit: () => void;
}) {
  const goals = useGoals().filter((g) => g.status === 'active');
  const habits = useHabits().filter((h) => !h.archivedAt);
  const allTasks = useTasks();
  const todayRows = useTodayTaskRows();

  const inboxCount = allTasks.filter((t) => !t.done && !t.scheduledAt && !t.dueAt).length;
  const todayCount = todayRows.length;

  return (
    <aside className="w-[252px] shrink-0 border-r border-pln-line bg-pln-sunken/40 flex flex-col">
      {/* 상단 */}
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-md flex items-center justify-center text-plnk-muted hover:bg-pln-card hover:text-plnk-DEFAULT transition-colors"
          aria-label="뒤로"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <span className="text-[12px] font-semibold text-plnk-DEFAULT tracking-tight">플래너</span>
        <div className="flex-1" />
        <button className="w-7 h-7 rounded-md flex items-center justify-center text-plnk-muted hover:bg-pln-card hover:text-plnk-DEFAULT transition-colors" aria-label="검색 (예정)">
          <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-5">
        {/* 빠른 액션 영역 */}
        <SectionGroup>
          <NavRow
            icon={<Sun className="w-3.5 h-3.5" strokeWidth={1.75} />}
            label="오늘"
            count={todayCount}
            active={view.kind === 'today'}
            onClick={() => onView({ kind: 'today' })}
          />
          <NavRow
            icon={<Inbox className="w-3.5 h-3.5" strokeWidth={1.75} />}
            label="인박스"
            count={inboxCount}
            active={view.kind === 'inbox'}
            onClick={() => onView({ kind: 'inbox' })}
          />
          <NavRow
            icon={<CalIcon className="w-3.5 h-3.5" strokeWidth={1.75} />}
            label="캘린더"
            active={view.kind === 'calendar'}
            onClick={() => onView({ kind: 'calendar' })}
          />
        </SectionGroup>

        {/* 목표 */}
        <SectionGroup>
          <SectionLabel
            icon={<Target className="w-3 h-3" strokeWidth={2} />}
            label="목표"
            count={goals.length}
            onAdd={onCreateGoal}
          />
          {goals.length === 0 ? (
            <p className="px-2.5 py-1 text-[11px] text-plnk-faint">없음</p>
          ) : (
            goals.map((g) => (
              <GoalNavRow
                key={g.id}
                goal={g}
                active={view.kind === 'goal' && view.id === g.id}
                onClick={() => onView({ kind: 'goal', id: g.id })}
              />
            ))
          )}
        </SectionGroup>

        {/* 습관 */}
        <SectionGroup>
          <SectionLabel
            icon={<Repeat className="w-3 h-3" strokeWidth={2} />}
            label="습관"
            count={habits.length}
            onAdd={onCreateHabit}
          />
          {habits.length === 0 ? (
            <p className="px-2.5 py-1 text-[11px] text-plnk-faint">없음</p>
          ) : (
            habits.map((h) => (
              <HabitNavRow
                key={h.id}
                habit={h}
                active={view.kind === 'habit' && view.id === h.id}
                onClick={() => onView({ kind: 'habit', id: h.id })}
              />
            ))
          )}
        </SectionGroup>
      </nav>
    </aside>
  );
}

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-px">{children}</div>;
}

function SectionLabel({
  icon, label, count, onAdd,
}: { icon: React.ReactNode; label: string; count?: number; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 text-plnk-muted">
      <span className="text-plnk-faint">{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-[0.18em]">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] font-mono tabular-nums text-plnk-faint">{count}</span>
      )}
      <div className="flex-1" />
      {onAdd && (
        <button
          onClick={onAdd}
          className="w-4 h-4 rounded-sm flex items-center justify-center text-plnk-faint hover:text-plnk-DEFAULT hover:bg-pln-card transition-colors"
          aria-label="추가"
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function NavRow({
  icon, label, count, active, onClick,
}: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors',
        active
          ? 'bg-plac-subtle text-plac-DEFAULT font-medium'
          : 'text-plnk-dim hover:bg-pln-card',
      )}
    >
      <span className={cn(active ? 'text-plac-DEFAULT' : 'text-plnk-muted')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('text-[10.5px] font-mono tabular-nums', active ? 'text-plac-DEFAULT' : 'text-plnk-faint')}>
          {count}
        </span>
      )}
    </button>
  );
}

function GoalNavRow({ goal, active, onClick }: { goal: Goal; active: boolean; onClick: () => void }) {
  const prog = useGoalProgress(goal.id);
  const meta = CATEGORY_META[goal.category];
  const pct = Math.round(prog.progress * 100);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors group',
        active
          ? 'bg-plac-subtle text-plac-DEFAULT font-medium'
          : 'text-plnk-dim hover:bg-pln-card',
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      <span className="flex-1 text-left truncate">{goal.title}</span>
      <span className={cn('text-[10.5px] font-mono tabular-nums shrink-0', active ? 'text-plac-DEFAULT' : 'text-plnk-faint')}>
        {pct}%
      </span>
    </button>
  );
}

function HabitNavRow({ habit, active, onClick }: { habit: Habit; active: boolean; onClick: () => void }) {
  const streak = useHabitStreak(habit.id);
  const today = todayKey();
  const doneToday = !!habit.history[today];
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors',
        active
          ? 'bg-plac-subtle text-plac-DEFAULT font-medium'
          : 'text-plnk-dim hover:bg-pln-card',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          doneToday ? 'bg-plac-ok' : 'bg-pln-rule',
        )}
      />
      <span className="flex-1 text-left truncate">
        {habit.emoji && <span className="mr-1">{habit.emoji}</span>}
        {habit.title}
      </span>
      <span className={cn('text-[10.5px] font-mono tabular-nums shrink-0', active ? 'text-plac-DEFAULT' : 'text-plnk-faint')}>
        {streak.current}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────
// Today view
// ──────────────────────────────────────────
function TodayView({ onView }: { onView: (v: View) => void }) {
  const todayRows = useTodayTaskRows();
  const goals = useGoals().filter((g) => g.status === 'active');
  const habits = useHabits().filter((h) => !h.archivedAt && matchesCadence(h.cadence, todayKey()));
  const today = todayKey();

  const todayCalendar = useMemo(() => buildCalendarForDay(today), [today]);
  const manualEvents = todayCalendar.filter((r): r is ManualEvent => r.kind === 'manual');

  return (
    <div className="max-w-[820px] mx-auto px-10 py-12">
      <ViewHeader eyebrow={formatKst(Date.now())} title="오늘" />

      <div className="space-y-10">
        {/* 일정 */}
        <ViewSection title="일정" count={manualEvents.length} actionLabel="캘린더" onAction={() => onView({ kind: 'calendar' })}>
          {manualEvents.length === 0 ? (
            <Empty>일정 없음</Empty>
          ) : (
            <div className="space-y-1">
              {manualEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-pln-line last:border-b-0">
                  <span className="block w-1 h-4 shrink-0 rounded-sm" style={{ backgroundColor: e.color || '#5E6AD2' }} />
                  {!e.allDay && (
                    <span className="text-[11px] font-mono tabular-nums text-plnk-muted shrink-0">
                      {formatKst(e.start, { withTime: true }).slice(11, 16)}
                    </span>
                  )}
                  <span className="flex-1 text-[13.5px] text-plnk-DEFAULT truncate">{e.title}</span>
                  {e.allDay && <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-faint">종일</span>}
                </div>
              ))}
            </div>
          )}
        </ViewSection>

        {/* 할 일 */}
        <ViewSection title="할 일" count={todayRows.length} actionLabel="인박스" onAction={() => onView({ kind: 'inbox' })}>
          {todayRows.length === 0 ? (
            <Empty>할 일 없음</Empty>
          ) : (
            <div>
              {todayRows.map((r) => (
                <TodayTaskRow key={r.id} row={r} />
              ))}
            </div>
          )}
        </ViewSection>

        {/* 습관 */}
        <ViewSection title="습관" count={habits.length}>
          {habits.length === 0 ? (
            <Empty>오늘 할 습관 없음</Empty>
          ) : (
            <div>
              {habits.map((h) => (
                <TodayHabitRow key={h.id} habit={h} onView={onView} />
              ))}
            </div>
          )}
        </ViewSection>

        {/* 활성 목표 */}
        {goals.length > 0 && (
          <ViewSection title="진행 중인 목표" count={goals.length}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.slice(0, 6).map((g) => (
                <button
                  key={g.id}
                  onClick={() => onView({ kind: 'goal', id: g.id })}
                  className="text-left p-4 rounded-md bg-pln-card border border-pln-line hover:border-plnk-faint transition-colors group"
                >
                  <GoalMiniCard goal={g} />
                </button>
              ))}
            </div>
          </ViewSection>
        )}
      </div>
    </div>
  );
}

function TodayTaskRow({ row }: { row: ReturnType<typeof useTodayTaskRows>[number] }) {
  if (row.kind === 'virtual_habit_task') {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-pln-line">
        <button
          onClick={() => toggleHabitDay(row.habitId, row.dayKey)}
          className={cn(
            'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
            row.done ? 'bg-plac-ok border-plac-ok' : 'border-pln-rule hover:border-plac-DEFAULT',
          )}
          aria-label="완료"
        >
          {row.done && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
        </button>
        {row.emoji && <span className="text-[13px]">{row.emoji}</span>}
        <span className={cn('text-[13.5px] flex-1 truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
          {row.title}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-faint">습관</span>
      </div>
    );
  }
  // 실 task
  const t = row;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-pln-line group">
      <button
        onClick={() => toggleTaskDone(t.id)}
        className={cn(
          'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
          t.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plac-DEFAULT',
        )}
        aria-label="완료 토글"
      >
        {t.done && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
      </button>
      {t.priority === 'high' && !t.done && (
        <span className="text-[10px] font-mono text-plac-warn shrink-0">!</span>
      )}
      <span className={cn('text-[13.5px] flex-1 truncate', t.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
        {t.title}
      </span>
      {t.dueAt && dayKeyOf(t.dueAt) === todayKey() && !t.done && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-plac-warn">마감</span>
      )}
    </div>
  );
}

function TodayHabitRow({ habit, onView }: { habit: Habit; onView: (v: View) => void }) {
  const today = todayKey();
  const doneToday = !!habit.history[today];
  const streak = useHabitStreak(habit.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasDone = doneToday;
    toggleHabitDay(habit.id, today);
    if (!wasDone) {
      const nextHabit = { ...habit, history: { ...habit.history, [today]: true as const } };
      const newStreak = computeCurrentStreak(nextHabit);
      if (newStreak === 30 || newStreak === 100 || newStreak === 365) {
        notify.success(`${newStreak}일 연속`);
      }
    }
  };

  return (
    <button
      onClick={() => onView({ kind: 'habit', id: habit.id })}
      className="w-full flex items-center gap-3 py-2 border-b border-pln-line hover:bg-pln-card transition-colors text-left"
    >
      <span
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        className={cn(
          'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
          doneToday ? 'bg-plac-ok border-plac-ok' : 'border-pln-rule hover:border-plac-DEFAULT',
        )}
      >
        {doneToday && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
      </span>
      {habit.emoji && <span className="text-[13px]">{habit.emoji}</span>}
      <span className={cn('text-[13.5px] flex-1 truncate', doneToday ? 'text-plnk-muted' : 'text-plnk-DEFAULT')}>
        {habit.title}
      </span>
      <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted shrink-0">{streak.current}일</span>
    </button>
  );
}

function GoalMiniCard({ goal }: { goal: Goal }) {
  const prog = useGoalProgress(goal.id);
  const meta = CATEGORY_META[goal.category];
  const pct = Math.round(prog.progress * 100);
  const days = Math.ceil((goal.dueAt - Date.now()) / (24 * 3600 * 1000));
  return (
    <>
      <div className="flex items-baseline justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-plnk-muted">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {CAT_LABEL[goal.category]}
        </span>
        <span className={cn('text-[10px] font-mono tabular-nums', days <= 7 ? 'text-plac-warn' : 'text-plnk-faint')}>
          {days < 0 ? `D+${-days}` : `D-${days}`}
        </span>
      </div>
      <div className="text-[13.5px] font-medium text-plnk-DEFAULT mb-3 truncate">{goal.title}</div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-display text-[24px] font-semibold text-plnk-DEFAULT tabular-nums leading-none">{pct}<span className="text-[12px] text-plnk-muted ml-0.5">%</span></span>
      </div>
      <div className="h-px bg-pln-line">
        <div className="h-px bg-plac-DEFAULT transition-all" style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

// ──────────────────────────────────────────
// Inbox view (모든 task)
// ──────────────────────────────────────────
const DAY = 24 * 3600 * 1000;
const WEEK_AHEAD = 7 * DAY;
const PRIO_ORDER: Record<Priority, number> = { high: 0, med: 1, low: 2 };

function relevantTime(t: Task): number | null {
  return t.scheduledAt ?? t.dueAt ?? null;
}
function groupOf(t: Task): 'today' | 'thisweek' | 'unscheduled' | 'completed' {
  const today = todayKey();
  if (t.done) return 'completed';
  const when = relevantTime(t);
  if (when == null) return 'unscheduled';
  if (dayKeyOf(when) === today) return 'today';
  if (when - Date.now() <= WEEK_AHEAD && when - Date.now() >= 0) return 'thisweek';
  if (when < Date.now()) return 'today';
  return 'unscheduled';
}

function InboxView() {
  const allTasks = useTasks();
  const goals = useGoals().filter((g) => g.status === 'active');
  const [filterGoalId, setFilterGoalId] = useState<ID | 'all'>('all');
  const [editFor, setEditFor] = useState<Task | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (filterGoalId === 'all') return allTasks;
    return allTasks.filter((t) => t.goalId === filterGoalId);
  }, [allTasks, filterGoalId]);

  const grouped = useMemo(() => {
    const g = { today: [] as Task[], thisweek: [] as Task[], unscheduled: [] as Task[], completed: [] as Task[] };
    for (const t of filtered) g[groupOf(t)].push(t);
    g.today.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
    g.thisweek.sort((a, b) => (relevantTime(a) ?? 0) - (relevantTime(b) ?? 0));
    g.unscheduled.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
    g.completed.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
    return g;
  }, [filtered]);

  const activeCount = grouped.today.length + grouped.thisweek.length + grouped.unscheduled.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editFor) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'n') {
        e.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editFor]);

  return (
    <div className="max-w-[820px] mx-auto px-10 py-12">
      <ViewHeader eyebrow="모든 할 일" title="인박스" />

      <QuickAddTaskBar inputRef={quickRef} goals={goals} defaultGoalId={filterGoalId === 'all' ? undefined : filterGoalId} />

      {goals.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-[11.5px] my-5">
          <FilterChip active={filterGoalId === 'all'} onClick={() => setFilterGoalId('all')}>
            전체 <span className="font-mono tabular-nums text-plnk-faint ml-1">{allTasks.filter((t) => !t.done).length}</span>
          </FilterChip>
          {goals.map((g) => {
            const count = allTasks.filter((t) => t.goalId === g.id && !t.done).length;
            return (
              <FilterChip key={g.id} active={filterGoalId === g.id} onClick={() => setFilterGoalId(g.id)}>
                <span className="truncate max-w-[180px]">{g.title}</span>
                <span className="font-mono tabular-nums text-plnk-faint ml-1">{count}</span>
              </FilterChip>
            );
          })}
        </div>
      )}

      {activeCount === 0 && grouped.completed.length === 0 ? (
        <Empty>비어 있음. n 키로 빠른 추가</Empty>
      ) : (
        <div className="space-y-8 mt-4">
          {grouped.today.length > 0 && (
            <Group title="오늘" count={grouped.today.length}>
              {grouped.today.map((t) => <InboxTaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} highlightDueToday />)}
            </Group>
          )}
          {grouped.thisweek.length > 0 && (
            <Group title="이번 주" count={grouped.thisweek.length}>
              {grouped.thisweek.map((t) => <InboxTaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} showWhen />)}
            </Group>
          )}
          {grouped.unscheduled.length > 0 && (
            <Group title="미정" count={grouped.unscheduled.length}>
              {grouped.unscheduled.map((t) => <InboxTaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />)}
            </Group>
          )}
          {grouped.completed.length > 0 && (
            <Group title="지난 7일 완료" count={grouped.completed.length} muted>
              {grouped.completed.slice(0, 20).map((t) => <InboxTaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />)}
            </Group>
          )}
        </div>
      )}

      {editFor && <TaskEditModal task={editFor} onClose={() => setEditFor(null)} />}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'pb-0.5 transition-colors',
        active ? 'text-plnk-DEFAULT border-b border-plnk-DEFAULT' : 'text-plnk-muted hover:text-plnk-DEFAULT',
      )}
    >
      {children}
    </button>
  );
}

function Group({ title, count, muted, children }: { title: string; count: number; muted?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={cn(
        'text-[10px] font-mono uppercase tracking-[0.2em] mb-2 pb-2 border-b border-pln-line flex items-baseline justify-between',
        muted ? 'text-plnk-faint' : 'text-plnk-muted',
      )}>
        <span>{title}</span>
        <span className="tabular-nums">{count}</span>
      </h2>
      <div>{children}</div>
    </section>
  );
}

function InboxTaskRow({
  task, onEdit, highlightDueToday, showWhen,
}: { task: Task; onEdit: () => void; highlightDueToday?: boolean; showWhen?: boolean }) {
  const goals = useGoals();
  const goal = task.goalId ? goals.find((g) => g.id === task.goalId) : null;
  const today = todayKey();
  const isDueToday = highlightDueToday && task.dueAt && dayKeyOf(task.dueAt) === today;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot = task;
    removeTask(task.id);
    notify.info('삭제됨', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
          addTask({
            title: snapshot.title, notes: snapshot.notes,
            scheduledAt: snapshot.scheduledAt, dueAt: snapshot.dueAt,
            priority: snapshot.priority, goalId: snapshot.goalId,
            habitId: snapshot.habitId, parentTaskId: snapshot.parentTaskId,
            source: snapshot.source,
          });
        },
      },
    });
  };

  return (
    <div
      onClick={onEdit}
      className="flex items-center gap-3 py-2 border-b border-pln-line cursor-pointer group hover:bg-pln-card/60 transition-colors"
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggleTaskDone(task.id); }}
        className={cn(
          'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
          task.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plac-DEFAULT',
        )}
        aria-label="완료 토글"
      >
        {task.done && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
      </button>
      {task.priority === 'high' && !task.done && (
        <span className="font-mono text-[10px] text-plac-warn shrink-0">!</span>
      )}
      <span className={cn('text-[13.5px] flex-1 truncate', task.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
        {task.title}
      </span>
      {isDueToday && !task.done && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-plac-warn shrink-0">마감</span>
      )}
      {showWhen && (task.scheduledAt || task.dueAt) && !task.done && (
        <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted shrink-0">
          {formatKst((task.scheduledAt ?? task.dueAt)!).slice(5)}
        </span>
      )}
      {goal && !task.done && (
        <span className="text-[10.5px] text-plnk-muted truncate max-w-[140px] shrink-0">{goal.title}</span>
      )}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-plnk-faint hover:text-plac-warn shrink-0 transition-opacity"
        aria-label="지우기"
      >
        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function QuickAddTaskBar({
  inputRef, goals, defaultGoalId,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  goals: { id: ID; title: string }[];
  defaultGoalId?: ID;
}) {
  const [title, setTitle] = useState('');
  const [whenChip, setWhenChip] = useState<'today' | 'tomorrow' | 'week' | 'none'>('today');
  const [priority, setPriority] = useState<Priority>('med');
  const [goalId, setGoalId] = useState<ID | undefined>(defaultGoalId);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setGoalId(defaultGoalId); }, [defaultGoalId]);

  const submit = () => {
    if (!title.trim()) return;
    const now = Date.now();
    let scheduledAt: number | undefined;
    if (whenChip === 'today') scheduledAt = now;
    else if (whenChip === 'tomorrow') scheduledAt = now + DAY;
    else if (whenChip === 'week') scheduledAt = now + 3 * DAY;
    addTask({ title: title.trim(), scheduledAt, priority, goalId, source: 'manual' });
    setTitle('');
    notify.saved();
  };

  return (
    <div className={cn(
      'rounded-md border bg-pln-card transition-colors',
      expanded ? 'border-plac-DEFAULT shadow-[0_0_0_3px_rgba(94,106,210,0.08)]' : 'border-pln-line',
    )}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Plus className="w-4 h-4 text-plnk-muted shrink-0" strokeWidth={1.75} />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            if (!next || !next.closest('[data-quickadd]')) {
              if (!title.trim()) setExpanded(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) submit();
            if (e.key === 'Escape') { setTitle(''); setExpanded(false); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="할 일 추가... (n 키)"
          className="flex-1 bg-transparent text-[13.5px] text-plnk-DEFAULT placeholder:text-plnk-faint outline-none"
        />
        {title.trim() && (
          <button onClick={submit} className="text-[12px] font-medium text-plac-DEFAULT hover:opacity-70">
            추가 ↵
          </button>
        )}
      </div>
      {expanded && (
        <div data-quickadd className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2.5 border-t border-pln-line text-[11.5px]">
          <Chips label="언제" options={[
            { k: 'today', label: '오늘' }, { k: 'tomorrow', label: '내일' },
            { k: 'week', label: '이번 주' }, { k: 'none', label: '미정' },
          ]} value={whenChip} onChange={setWhenChip} />
          <Chips label="우선" options={[
            { k: 'low' as Priority, label: '낮' }, { k: 'med' as Priority, label: '보통' },
            { k: 'high' as Priority, label: '높' },
          ]} value={priority} onChange={setPriority} />
          {goals.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-plnk-muted text-[10px] uppercase tracking-wider">연결</span>
              <FilterChip active={!goalId} onClick={() => setGoalId(undefined)}>없음</FilterChip>
              {goals.slice(0, 5).map((g) => (
                <FilterChip key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                  <span className="truncate max-w-[120px]">{g.title}</span>
                </FilterChip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chips<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { k: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-plnk-muted text-[10px] uppercase tracking-wider">{label}</span>
      {options.map((c) => (
        <FilterChip key={c.k} active={value === c.k} onClick={() => onChange(c.k)}>
          {c.label}
        </FilterChip>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
// Goal view (단일 목표 detail)
// ──────────────────────────────────────────
function GoalView({ goalId, onView }: { goalId: ID; onView: (v: View) => void }) {
  const goals = useGoals();
  const allTasks = useTasks();
  const allHabits = useHabits();
  const goal = goals.find((g) => g.id === goalId);
  const prog = useGoalProgress(goalId);
  const [percentVal, setPercentVal] = useState(
    goal?.metric.kind === 'percent' ? goal.metric.manual : 0,
  );

  if (!goal) {
    return (
      <div className="max-w-[820px] mx-auto px-10 py-12">
        <p className="text-[13px] text-plnk-faint">목표를 찾을 수 없어요</p>
      </div>
    );
  }

  const tasks = allTasks.filter((t) => t.goalId === goalId);
  const habits = allHabits.filter((h) => h.goalId === goalId && !h.archivedAt);
  const meta = CATEGORY_META[goal.category];
  const pct = Math.round(prog.progress * 100);
  const days = Math.ceil((goal.dueAt - Date.now()) / (24 * 3600 * 1000));

  const handleDelete = () => {
    if (!window.confirm(`"${goal.title}" 지울까요? 연결된 항목은 그대로 남고 연결만 풀립니다.`)) return;
    removeGoalCascade(goalId);
    onView({ kind: 'today' });
  };

  return (
    <div className="max-w-[820px] mx-auto px-10 py-12">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
          {CAT_LABEL[goal.category]}
        </span>
        <span className={cn('text-[10px] font-mono tabular-nums', days <= 7 ? 'text-plac-warn' : 'text-plnk-faint')}>
          {days < 0 ? `D+${-days}` : `D-${days}`}
        </span>
        <span className="text-[10px] font-mono text-plnk-faint">마감 {formatKst(goal.dueAt)}</span>
      </div>

      <h1 className="font-display text-[36px] sm:text-[40px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em] mb-7">
        {goal.title}
      </h1>

      {/* 진척바 */}
      <div className="border-y border-pln-line py-6 mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">진척</span>
          <span className="font-display text-[44px] font-semibold text-plnk-DEFAULT tabular-nums leading-none">
            {pct}<span className="text-[18px] text-plnk-muted ml-0.5">%</span>
          </span>
        </div>
        <div className="h-1 bg-pln-line rounded-full overflow-hidden">
          <div className="h-full bg-plac-DEFAULT transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {goal.metric.kind === 'percent' && (
          <input
            type="range"
            min={0}
            max={100}
            value={percentVal}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setPercentVal(v);
              updateGoal(goalId, { metric: { kind: 'percent', manual: v } });
            }}
            className="w-full mt-4 accent-plac-DEFAULT"
          />
        )}
        <div className="mt-3 text-[11.5px] text-plnk-muted flex items-center gap-3">
          {goal.metric.kind === 'count' ? (
            <span className="tabular-nums">{prog.doneTasks} / {goal.metric.target}</span>
          ) : '수동 슬라이더'}
          {prog.habitsCount > 0 && (
            <>
              <span className="text-plnk-faint">·</span>
              <span className="tabular-nums">습관 {prog.habitsCount} · 30일 {Math.round(prog.avgHabitRate30d * 100)}%</span>
            </>
          )}
        </div>
      </div>

      {/* 연결 task */}
      <Group title="할 일" count={`${prog.doneTasks}/${tasks.length}`}>
        {tasks.length === 0 ? <Empty>아직 없음</Empty> : (
          tasks.map((t) => <GoalTaskLine key={t.id} task={t} />)
        )}
        <button
          onClick={() => {
            const title = window.prompt(`"${goal.title}" 에 추가할 할 일?`);
            if (title?.trim()) addTask({ title: title.trim(), goalId, source: 'manual', priority: 'med' });
          }}
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-plac-DEFAULT hover:opacity-70"
        >
          <Plus className="w-3 h-3" strokeWidth={2} /> 할 일 추가
        </button>
      </Group>

      <div className="mt-10">
        <Group title="습관" count={`${habits.length}개 · 30일 ${Math.round(prog.avgHabitRate30d * 100)}%`}>
          {habits.length === 0 ? <Empty>아직 없음</Empty> : (
            habits.map((h) => <GoalHabitLine key={h.id} habit={h} onView={onView} />)
          )}
        </Group>
      </div>

      <div className="mt-12 pt-6 border-t border-pln-line flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
        </button>
        <button
          onClick={() => { updateGoal(goalId, { status: 'archived' }); onView({ kind: 'today' }); }}
          className="text-[12px] text-plnk-muted hover:text-plnk-DEFAULT"
        >
          보관함으로
        </button>
      </div>
    </div>
  );
}

function GoalTaskLine({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-pln-line">
      <button
        onClick={() => toggleTaskDone(task.id)}
        className={cn(
          'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0',
          task.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plac-DEFAULT',
        )}
      >
        {task.done && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
      </button>
      <span className={cn('text-[13px] flex-1', task.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
        {task.title}
      </span>
      <button
        onClick={() => { if (getTask(task.id)) removeTask(task.id); }}
        className="text-plnk-faint hover:text-plac-warn opacity-0 hover:opacity-100"
        aria-label="지우기"
      >
        <X className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function GoalHabitLine({ habit, onView }: { habit: Habit; onView: (v: View) => void }) {
  const cells: { done: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKeyBefore(i);
    cells.push({ done: !!habit.history[k] });
  }
  return (
    <button
      onClick={() => onView({ kind: 'habit', id: habit.id })}
      className="w-full flex items-center gap-3 py-2 border-b border-pln-line text-left hover:bg-pln-card/60 transition-colors"
    >
      {habit.emoji && <span className="text-[13px]">{habit.emoji}</span>}
      <span className="text-[13px] text-plnk-DEFAULT flex-1 truncate">{habit.title}</span>
      <div className="flex gap-[1.5px]">
        {cells.map((c, i) => (
          <span key={i} className={cn('w-1 h-3', c.done ? 'bg-plac-ok' : 'bg-pln-line')} />
        ))}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────
// Habit view (단일 습관 detail)
// ──────────────────────────────────────────
function HabitView({ habitId, onView }: { habitId: ID; onView: (v: View) => void }) {
  const habits = useHabits();
  const goals = useGoals();
  const habit = habits.find((h) => h.id === habitId);
  const streak = useHabitStreak(habitId);

  const grid = useMemo(() => {
    if (!habit) return [];
    const out: { done: boolean; isCadence: boolean }[][] = [];
    let week: { done: boolean; isCadence: boolean }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = dayKeyBefore(i);
      week.push({ done: !!habit.history[d], isCadence: matchesCadence(habit.cadence, d) });
      if (week.length === 7) { out.push(week); week = []; }
    }
    if (week.length > 0) out.push(week);
    return out;
  }, [habit]);

  if (!habit) {
    return (
      <div className="max-w-[820px] mx-auto px-10 py-12">
        <p className="text-[13px] text-plnk-faint">습관을 찾을 수 없어요</p>
      </div>
    );
  }

  const linkedGoal = habit.goalId ? goals.find((g) => g.id === habit.goalId) : null;
  const totalDone = Object.keys(habit.history).length;

  const handleDelete = () => {
    if (!window.confirm(`"${habit.title}" 지울까요? 기록도 함께 사라집니다.`)) return;
    removeHabit(habitId);
    onView({ kind: 'today' });
  };

  return (
    <div className="max-w-[820px] mx-auto px-10 py-12">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">습관</span>
        <span className="text-[10px] font-mono text-plnk-faint">
          {cadenceLabel(habit.cadence)}
          {habit.scheduleAt && ` · ${String(habit.scheduleAt.hour).padStart(2, '0')}:${String(habit.scheduleAt.min).padStart(2, '0')}`}
        </span>
        {linkedGoal && (
          <button
            onClick={() => onView({ kind: 'goal', id: linkedGoal.id })}
            className="text-[10px] font-mono text-plac-DEFAULT hover:opacity-70 inline-flex items-center gap-1"
          >
            🎯 {linkedGoal.title} <ChevronRight className="w-2.5 h-2.5" strokeWidth={2} />
          </button>
        )}
      </div>

      <h1 className="font-display text-[36px] sm:text-[40px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em] mb-7">
        {habit.emoji && <span className="mr-2">{habit.emoji}</span>}
        {habit.title}
      </h1>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden mb-10">
        <Stat label="연속" value={streak.current} suffix="일" />
        <Stat label="30일 율" value={Math.round(streak.rate30d * 100)} suffix="%" />
        <Stat label="총 완료" value={totalDone} suffix="일" />
      </div>

      {/* 365일 잔디 */}
      <div className="mb-12">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-3">최근 1년</h4>
        <div className="flex gap-[2px] overflow-x-auto pb-2">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((c, di) => (
                <span
                  key={di}
                  className={cn(
                    'w-2 h-2 rounded-[1px]',
                    c.done ? 'bg-plac-ok' : c.isCadence ? 'bg-pln-line' : 'bg-pln-base',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-pln-line flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
        </button>
        <button
          onClick={() => { archiveHabit(habitId); onView({ kind: 'today' }); }}
          className="text-[12px] text-plnk-muted hover:text-plnk-DEFAULT"
        >
          보관함으로
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="bg-pln-card px-4 py-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-plnk-muted">{label}</div>
      <div className="font-display text-[28px] font-semibold text-plnk-DEFAULT tabular-nums leading-tight mt-1">
        {value}<span className="text-[14px] text-plnk-muted ml-0.5">{suffix}</span>
      </div>
    </div>
  );
}

function cadenceLabel(c: HabitCadence): string {
  if (c.kind === 'daily') return '매일';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return c.days.map((d) => names[d]).join('·');
}

// ──────────────────────────────────────────
// Calendar view (간단한 월뷰만 — 추후 확장)
// ──────────────────────────────────────────
const KST_OFFSET = 9 * 3600 * 1000;
function dayKeyToDate(d: DayKey): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function startOfMonth(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
}
function shiftMonth(d: Date, delta: number): Date {
  const kst = new Date(d.getTime() + KST_OFFSET);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + delta, kst.getUTCDate()));
}
function isSameMonth(a: Date, b: Date): boolean {
  const ak = new Date(a.getTime() + KST_OFFSET);
  const bk = new Date(b.getTime() + KST_OFFSET);
  return ak.getUTCFullYear() === bk.getUTCFullYear() && ak.getUTCMonth() === bk.getUTCMonth();
}
function monthGridDays(focused: Date): DayKey[] {
  const first = startOfMonth(focused);
  const firstWeekday = first.getUTCDay();
  const start = new Date(first.getTime() - firstWeekday * 24 * 3600 * 1000);
  const out: DayKey[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function CalendarView() {
  const [focused, setFocused] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  useTasks(); useHabits(); useEvents();

  const today = todayKey();
  const focusedKst = new Date(focused.getTime() + KST_OFFSET);
  const yearLabel = focusedKst.getUTCFullYear();
  const monthLabel = focusedKst.getUTCMonth() + 1;
  const days = monthGridDays(focused);

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">캘린더</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-display text-[56px] font-semibold text-plnk-DEFAULT leading-none tabular-nums tracking-[-0.04em]">
              {String(monthLabel).padStart(2, '0')}월
            </span>
            <span className="font-display text-[18px] text-plnk-muted tabular-nums">{yearLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFocused(shiftMonth(focused, -1))} className="text-plnk-muted hover:text-plnk-DEFAULT" aria-label="이전">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button onClick={() => setFocused(new Date())} className="text-[11.5px] text-plnk-muted hover:text-plnk-DEFAULT border-b border-plnk-muted hover:border-plnk-DEFAULT pb-0.5">
            오늘
          </button>
          <button onClick={() => setFocused(shiftMonth(focused, 1))} className="text-plnk-muted hover:text-plnk-DEFAULT rotate-180" aria-label="다음">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="border border-pln-line rounded-md overflow-hidden">
        <div className="grid grid-cols-7 border-b border-pln-line bg-pln-sunken/40">
          {WEEK.map((l, i) => (
            <div
              key={i}
              className={cn(
                'py-2 text-center text-[10px] font-mono uppercase tracking-[0.2em] border-r border-pln-line last:border-r-0',
                i === 0 ? 'text-plac-warn' : 'text-plnk-muted',
              )}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => (
            <CalendarDayCell
              key={d + '-' + i}
              day={d}
              isToday={d === today}
              inCurrentMonth={isSameMonth(dayKeyToDate(d), focused)}
              weekday={i % 7}
              isLastInRow={i % 7 === 6}
              isLastRow={i >= 35}
              onClick={() => setSelectedDay(d)}
            />
          ))}
        </div>
      </div>

      {selectedDay && <DayPanel day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
}

function CalendarDayCell({
  day, isToday, inCurrentMonth, weekday, isLastInRow, isLastRow, onClick,
}: {
  day: DayKey; isToday: boolean; inCurrentMonth: boolean;
  weekday: number; isLastInRow: boolean; isLastRow: boolean; onClick: () => void;
}) {
  const rows = useMemo(() => buildCalendarForDay(day), [day]);
  const dayNum = parseInt(day.slice(8, 10), 10);
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative min-h-[110px] p-2 text-left transition-colors hover:bg-pln-card',
        !isLastInRow && 'border-r border-pln-line',
        !isLastRow && 'border-b border-pln-line',
        !inCurrentMonth && 'bg-pln-base/40',
      )}
    >
      <div className={cn(
        'text-[12px] font-mono tabular-nums mb-2 inline-flex items-center justify-center',
        isToday && 'w-5 h-5 rounded-full bg-plac-DEFAULT text-pln-card font-semibold',
        !isToday && inCurrentMonth && (weekday === 0 ? 'text-plac-warn' : 'text-plnk-DEFAULT'),
        !isToday && !inCurrentMonth && 'text-plnk-faint',
      )}>
        {dayNum}
      </div>
      <div className="space-y-1">
        {rows.slice(0, 3).map((r, i) => <CellStrip key={i} row={r} />)}
        {rows.length > 3 && <div className="text-[9.5px] font-mono text-plnk-muted">+{rows.length - 3}</div>}
      </div>
    </button>
  );
}

function CellStrip({ row }: { row: CalendarRow }) {
  if (row.kind === 'virtual_task') {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn('block w-1 h-3 rounded-sm shrink-0', row.isDue ? 'bg-plac-warn' : 'bg-plac-DEFAULT')} />
        <span className={cn('text-[10.5px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.title}
        </span>
      </div>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block w-1 h-3 rounded-sm shrink-0 bg-plac-ok" />
        <span className={cn('text-[10.5px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.emoji && <span className="mr-0.5">{row.emoji}</span>}{row.title}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="block w-1 h-3 rounded-sm shrink-0" style={{ backgroundColor: row.color || '#5E6AD2' }} />
      <span className="text-[10.5px] truncate text-plnk-dim">{row.title}</span>
    </div>
  );
}

// ──────────────────────────────────────────
// 우측 슬라이드 패널 — 선택 날짜
// ──────────────────────────────────────────
function DayPanel({ day, onClose }: { day: DayKey; onClose: () => void }) {
  useEvents(); useTasks(); useHabits();
  const rows = useMemo(() => buildCalendarForDay(day), [day]);
  const [editing, setEditing] = useState<ManualEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const dt = dayKeyToDate(day);
  const wd = WEEK[dt.getUTCDay()];

  return (
    <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-pln-card border-l border-pln-line shadow-[-8px_0_32px_rgba(0,0,0,0.06)] flex flex-col animate-in slide-in-from-right duration-200">
      <div className="shrink-0 px-6 py-4 border-b border-pln-line flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">{wd}요일</p>
          <h3 className="font-display text-[20px] font-semibold text-plnk-DEFAULT mt-1 tabular-nums">{day}</h3>
        </div>
        <button onClick={onClose} className="text-plnk-muted hover:text-plnk-DEFAULT" aria-label="닫기">
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-plnk-faint italic py-8 text-center">일정 없음</p>
        ) : (
          <div className="space-y-1">
            {rows.map((r, i) => (
              <DayPanelRow key={i} row={r} onEditEvent={(e) => setEditing(e)} />
            ))}
          </div>
        )}
        <button
          onClick={() => setCreating(true)}
          className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-plac-DEFAULT hover:opacity-70"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} /> 일정 추가
        </button>
      </div>

      {creating && <EventEditor day={day} onClose={() => setCreating(false)} />}
      {editing && <EventEditor day={day} event={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DayPanelRow({ row, onEditEvent }: { row: CalendarRow; onEditEvent: (e: ManualEvent) => void }) {
  if (row.kind === 'virtual_task' || row.kind === 'virtual_habit') {
    const time = row.kind === 'virtual_task'
      ? formatKst(row.start, { withTime: true }).slice(11, 16)
      : row.start ? formatKst(row.start, { withTime: true }).slice(11, 16) : '';
    const color = row.kind === 'virtual_task' ? (row.isDue ? 'bg-plac-warn' : 'bg-plac-DEFAULT') : 'bg-plac-ok';
    const tag = row.kind === 'virtual_task' ? (row.isDue ? '마감' : '예정') : '습관';
    const title = 'emoji' in row && row.emoji ? `${row.emoji} ${row.title}` : row.title;
    return (
      <div className="flex items-center gap-3 py-2">
        <span className={cn('block w-1 self-stretch shrink-0 rounded-sm', color)} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted shrink-0">{tag}</span>
        <span className={cn('flex-1 text-[12.5px]', row.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
          {title}
        </span>
        {time && <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted">{time}</span>}
      </div>
    );
  }
  return (
    <button
      onClick={() => onEditEvent(row)}
      className="w-full flex items-center gap-3 py-2 text-left hover:bg-pln-base/40 transition-colors px-1 -mx-1 rounded-sm"
    >
      <span className="block w-1 self-stretch shrink-0 rounded-sm" style={{ backgroundColor: row.color || '#5E6AD2' }} />
      <span className="flex-1 text-[12.5px] text-plnk-DEFAULT truncate">{row.title}</span>
      {row.allDay ? (
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted">종일</span>
      ) : (
        <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted">
          {formatKst(row.start, { withTime: true }).slice(11, 16)}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 모달들 — Goal / Habit / Task / Event 편집
// ──────────────────────────────────────────
function GoalCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: Goal) => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('learning');
  const [metricKind, setMetricKind] = useState<'count' | 'percent'>('count');
  const [target, setTarget] = useState(10);
  const [dueDays, setDueDays] = useState(90);

  const submit = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const dueAt = now + dueDays * 24 * 3600 * 1000;
    const metric: GoalMetric = metricKind === 'count' ? { kind: 'count', target } : { kind: 'percent', manual: 0 };
    const g = addGoal({ title: title.trim(), category, startedAt: now, dueAt, status: 'active', metric });
    onCreated(g);
  };

  return (
    <ModalShell onClose={onClose} title="새 목표">
      <Field label="제목">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
          placeholder="책 12권 읽기"
          className="w-full bg-transparent border-b border-pln-rule pb-2 text-[18px] font-display text-plnk-DEFAULT placeholder:text-plnk-faint outline-none focus:border-plac-DEFAULT"
        />
      </Field>
      <Field label="카테고리">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <FilterChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {CAT_LABEL[cat]}
            </FilterChip>
          ))}
        </div>
      </Field>
      <Field label="측정">
        <div className="flex gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden mb-3">
          <SegBtn active={metricKind === 'count'} onClick={() => setMetricKind('count')}>개수 달성</SegBtn>
          <SegBtn active={metricKind === 'percent'} onClick={() => setMetricKind('percent')}>퍼센트</SegBtn>
        </div>
        {metricKind === 'count' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-plnk-muted">목표</span>
            <input
              type="number"
              value={target}
              min={1}
              onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-20 bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums outline-none focus:border-plac-DEFAULT"
            />
            <div className="ml-auto flex gap-2 text-[11px] text-plnk-muted">
              {[10, 30, 100].map((v) => (
                <button key={v} onClick={() => setTarget(v)} className="hover:text-plac-DEFAULT tabular-nums">{v}</button>
              ))}
            </div>
          </div>
        )}
      </Field>
      <Field label="기한">
        <div className="flex gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden">
          {[30, 90, 180, 365].map((d) => (
            <SegBtn key={d} active={dueDays === d} onClick={() => setDueDays(d)}>
              {d === 30 ? '한 달' : d === 90 ? '석 달' : d === 180 ? '반년' : '1년'}
            </SegBtn>
          ))}
        </div>
      </Field>
      <ModalFooter>
        <ModalCancel onClick={onClose}>취소</ModalCancel>
        <ModalPrimary onClick={submit} disabled={!title.trim()}>만들기</ModalPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

function GoalDecomposeModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const tpl = GOAL_TEMPLATES[goal.category];
  const [habitChecks, setHabitChecks] = useState<boolean[]>(tpl.habits.map(() => false));
  const [taskChecks, setTaskChecks] = useState<boolean[]>(tpl.tasks.map(() => false));

  const submit = () => {
    tpl.habits.forEach((h, i) => {
      if (habitChecks[i]) addHabit({ title: h.title, emoji: h.emoji, cadence: h.cadence, scheduleAt: h.scheduleAt, goalId: goal.id });
    });
    tpl.tasks.forEach((t, i) => {
      if (taskChecks[i]) addTask({ title: t.title, goalId: goal.id, source: 'manual', priority: 'med' });
    });
    onClose();
  };

  const checkedCount = habitChecks.filter(Boolean).length + taskChecks.filter(Boolean).length;

  return (
    <ModalShell onClose={onClose} eyebrow="시작 도우미" title={goal.title}>
      <p className="text-[12.5px] text-plnk-muted mb-6 leading-relaxed">
        함께 따라올 수 있는 습관과 할 일이에요. 마음에 드는 것만 골라요.
      </p>
      <div className="mb-7">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-3">습관</h4>
        <div className="border-t border-pln-line">
          {tpl.habits.map((h, i) => (
            <DecomposeRow key={i} checked={habitChecks[i]} onToggle={() => setHabitChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}>
              <span className="text-[13.5px] text-plnk-DEFAULT flex-1">{h.title}</span>
              {h.scheduleAt && (
                <span className="text-[11px] font-mono tabular-nums text-plnk-muted">
                  {String(h.scheduleAt.hour).padStart(2, '0')}:{String(h.scheduleAt.min).padStart(2, '0')}
                </span>
              )}
            </DecomposeRow>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-3">할 일</h4>
        <div className="border-t border-pln-line">
          {tpl.tasks.map((t, i) => (
            <DecomposeRow key={i} checked={taskChecks[i]} onToggle={() => setTaskChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}>
              <span className="text-[13.5px] text-plnk-DEFAULT flex-1">{t.title}</span>
            </DecomposeRow>
          ))}
        </div>
      </div>
      <ModalFooter>
        <ModalCancel onClick={onClose}>건너뛰기</ModalCancel>
        <ModalPrimary onClick={submit} disabled={checkedCount === 0}>
          {checkedCount > 0 ? `${checkedCount}개 추가` : '항목 선택'}
        </ModalPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

function DecomposeRow({
  checked, onToggle, children,
}: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 px-1 py-3 border-b border-pln-line cursor-pointer hover:bg-pln-base/40 transition-colors">
      <span className={cn('w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule')}>
        {checked && <Check className="w-2.5 h-2.5 text-pln-card" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      {children}
    </label>
  );
}

function HabitCreateModal({ onClose }: { onClose: () => void }) {
  const goals = useGoals().filter((g) => g.status === 'active');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [cadenceKind, setCadenceKind] = useState<'daily' | 'weekly'>('daily');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 3, 5]);
  const [hasTime, setHasTime] = useState(false);
  const [hour, setHour] = useState(8);
  const [min, setMin] = useState(0);
  const [goalId, setGoalId] = useState<ID | undefined>(undefined);

  const submit = () => {
    if (!title.trim()) return;
    const cadence: HabitCadence = cadenceKind === 'daily' ? { kind: 'daily' } : { kind: 'weekly', days: weeklyDays };
    addHabit({
      title: title.trim(),
      emoji: emoji.trim() || undefined,
      cadence,
      scheduleAt: hasTime ? { hour, min } : undefined,
      goalId,
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="새 습관">
      <Field label="제목">
        <div className="flex gap-3 items-baseline border-b border-pln-rule pb-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            className="w-8 text-center bg-transparent text-[18px] outline-none placeholder:text-plnk-faint"
            aria-label="이모지(선택)"
          />
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
            placeholder="매일 30분 독서"
            className="flex-1 bg-transparent text-[18px] font-display text-plnk-DEFAULT placeholder:text-plnk-faint outline-none"
          />
        </div>
      </Field>
      <Field label="반복">
        <div className="flex gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden mb-3">
          <SegBtn active={cadenceKind === 'daily'} onClick={() => setCadenceKind('daily')}>매일</SegBtn>
          <SegBtn active={cadenceKind === 'weekly'} onClick={() => setCadenceKind('weekly')}>요일 지정</SegBtn>
        </div>
        {cadenceKind === 'weekly' && (
          <div className="flex gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden">
            {WEEK.map((label, i) => {
              const active = weeklyDays.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setWeeklyDays((arr) => active ? arr.filter((x) => x !== i) : [...arr, i].sort())}
                  className={cn(
                    'flex-1 py-2 text-[11.5px] font-medium transition-colors',
                    active ? 'bg-plac-DEFAULT text-pln-card' : 'bg-pln-card text-plnk-muted hover:text-plnk-DEFAULT',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </Field>
      <Field label="시간">
        <label className="flex items-center gap-2 text-[12.5px] text-plnk-DEFAULT cursor-pointer mb-3">
          <input type="checkbox" checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} className="accent-plac-DEFAULT" />
          시간 지정
        </label>
        {hasTime && (
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10))))} className="w-14 bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums text-center outline-none focus:border-plac-DEFAULT" />
            <span className="text-plnk-muted">:</span>
            <input type="number" min={0} max={59} step={5} value={min} onChange={(e) => setMin(Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10))))} className="w-14 bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums text-center outline-none focus:border-plac-DEFAULT" />
          </div>
        )}
      </Field>
      {goals.length > 0 && (
        <Field label="목표 연결">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!goalId} onClick={() => setGoalId(undefined)}>없음</FilterChip>
            {goals.map((g) => (
              <FilterChip key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                <span className="truncate max-w-[140px]">{g.title}</span>
              </FilterChip>
            ))}
          </div>
        </Field>
      )}
      <ModalFooter>
        <ModalCancel onClick={onClose}>취소</ModalCancel>
        <ModalPrimary onClick={submit} disabled={!title.trim() || (cadenceKind === 'weekly' && weeklyDays.length === 0)}>
          만들기
        </ModalPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const goals = useGoals().filter((g) => g.status === 'active');
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [goalId, setGoalId] = useState<ID | undefined>(task.goalId);
  const [scheduledAt, setScheduledAt] = useState<string>(task.scheduledAt ? new Date(task.scheduledAt + 9 * 3600 * 1000).toISOString().slice(0, 16) : '');
  const [dueAt, setDueAt] = useState<string>(task.dueAt ? new Date(task.dueAt + 9 * 3600 * 1000).toISOString().slice(0, 16) : '');

  const save = () => {
    if (!title.trim()) return;
    const parseLocal = (s: string): number | undefined => {
      if (!s) return undefined;
      const d = new Date(s + 'Z');
      return d.getTime() - 9 * 3600 * 1000;
    };
    updateTask(task.id, {
      title: title.trim(), notes: notes.trim() || undefined,
      priority, goalId,
      scheduledAt: parseLocal(scheduledAt),
      dueAt: parseLocal(dueAt),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm(`"${task.title}" 지울까요?`)) return;
    removeTask(task.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="할 일 편집">
      <Field label="제목">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-pln-rule pb-2 text-[18px] font-display text-plnk-DEFAULT outline-none focus:border-plac-DEFAULT"
        />
      </Field>
      <Field label="메모">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="한 줄 메모"
          className="w-full bg-transparent border-b border-pln-rule pb-2 text-[13.5px] text-plnk-DEFAULT placeholder:text-plnk-faint outline-none focus:border-plac-DEFAULT"
        />
      </Field>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">예정</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full bg-transparent border-b border-pln-rule pb-1 text-[12.5px] outline-none focus:border-plac-DEFAULT" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">마감</label>
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full bg-transparent border-b border-pln-rule pb-1 text-[12.5px] outline-none focus:border-plac-DEFAULT" />
        </div>
      </div>
      <Field label="우선순위">
        <div className="flex gap-px bg-pln-line border border-pln-line rounded-md overflow-hidden">
          {(['low', 'med', 'high'] as Priority[]).map((p) => (
            <SegBtn key={p} active={priority === p} onClick={() => setPriority(p)}>
              {p === 'low' ? '낮음' : p === 'med' ? '보통' : '높음'}
            </SegBtn>
          ))}
        </div>
      </Field>
      {goals.length > 0 && (
        <Field label="목표 연결">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!goalId} onClick={() => setGoalId(undefined)}>없음</FilterChip>
            {goals.map((g) => (
              <FilterChip key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                <span className="truncate max-w-[140px]">{g.title}</span>
              </FilterChip>
            ))}
          </div>
        </Field>
      )}
      <ModalFooter>
        <button onClick={handleDelete} className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1">
          <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
        </button>
        <ModalPrimary onClick={save} disabled={!title.trim()}>저장</ModalPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

function EventEditor({ day, event, onClose }: { day: DayKey; event?: ManualEvent; onClose: () => void }) {
  const isNew = !event;
  const [title, setTitle] = useState(event?.title ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(() => event && !event.allDay ? formatKst(event.start, { withTime: true }).slice(11, 16) : '09:00');
  const [endTime, setEndTime] = useState(() => event?.end ? formatKst(event.end, { withTime: true }).slice(11, 16) : '10:00');
  const [color, setColor] = useState(event?.color ?? '#5E6AD2');
  const colorChoices = ['#5E6AD2', '#10B981', '#F59E0B', '#DC2626', '#A855F7', '#0A0A0A'];

  const save = () => {
    if (!title.trim()) return;
    const parseTime = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      const [y, mo, d] = day.split('-').map(Number);
      return Date.UTC(y, mo - 1, d, h - 9, m);
    };
    const start = allDay ? parseTime('00:00') : parseTime(startTime);
    const end = allDay ? undefined : parseTime(endTime);
    if (isNew) addEvent({ title: title.trim(), start, end, allDay, color });
    else if (event) updateEvent(event.id, { title: title.trim(), start, end, allDay, color });
    onClose();
  };

  const handleDelete = () => {
    if (!event) return;
    if (!window.confirm(`"${event.title}" 지울까요?`)) return;
    removeEvent(event.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title={isNew ? '새 일정' : '일정 편집'}>
      <Field label="제목">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) save(); }}
          className="w-full bg-transparent border-b border-pln-rule pb-2 text-[18px] font-display text-plnk-DEFAULT outline-none focus:border-plac-DEFAULT"
        />
      </Field>
      <label className="flex items-center gap-2 text-[12.5px] text-plnk-DEFAULT cursor-pointer mb-4">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-plac-DEFAULT" />
        종일
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">시작</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums outline-none focus:border-plac-DEFAULT" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">종료</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums outline-none focus:border-plac-DEFAULT" />
          </div>
        </div>
      )}
      <Field label="색">
        <div className="flex gap-2">
          {colorChoices.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn('w-7 h-7 rounded-md transition-transform', color === c && 'ring-2 ring-offset-2 ring-plnk-DEFAULT scale-110')}
              style={{ backgroundColor: c }}
              aria-label="색"
            />
          ))}
        </div>
      </Field>
      <ModalFooter>
        {!isNew ? (
          <button onClick={handleDelete} className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
          </button>
        ) : <span />}
        <ModalPrimary onClick={save} disabled={!title.trim()}>{isNew ? '추가' : '저장'}</ModalPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// 공용
// ──────────────────────────────────────────
function ViewHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-10">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">{eyebrow}</p>
      <h1 className="font-display text-[40px] sm:text-[44px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em] mt-2">
        {title}
      </h1>
    </header>
  );
}

function ViewSection({
  title, count, actionLabel, onAction, children,
}: {
  title: string;
  count: number | string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-pln-line">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">
          {title} <span className="tabular-nums ml-2">{count}</span>
        </h2>
        {actionLabel && onAction && (
          <button onClick={onAction} className="text-[11px] text-plnk-muted hover:text-plac-DEFAULT inline-flex items-center gap-1">
            {actionLabel} <ChevronRight className="w-3 h-3" strokeWidth={2} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] text-plnk-faint italic py-4">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">{label}</label>
      {children}
    </div>
  );
}

function SegBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-3 py-2 text-[12px] font-medium transition-colors',
        active ? 'bg-plac-DEFAULT text-pln-card' : 'bg-pln-card text-plnk-muted hover:text-plnk-DEFAULT',
      )}
    >
      {children}
    </button>
  );
}

function ModalShell({
  onClose, eyebrow, title, children,
}: { onClose: () => void; eyebrow?: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-plnk-DEFAULT/15 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] bg-pln-card rounded-lg border border-pln-line shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-7 pt-6 pb-4 border-b border-pln-line flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {eyebrow && <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-1">{eyebrow}</p>}
            {title && <h3 className="font-display text-[20px] font-semibold text-plnk-DEFAULT tracking-tight leading-snug">{title}</h3>}
          </div>
          <button onClick={onClose} className="text-plnk-muted hover:text-plnk-DEFAULT">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 px-7 py-4 border-t border-pln-line bg-pln-base flex items-center justify-between gap-4 -mx-7 -mb-6 mt-8">
      {children}
    </div>
  );
}

function ModalCancel({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[12.5px] text-plnk-muted hover:text-plnk-DEFAULT">
      {children}
    </button>
  );
}

function ModalPrimary({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-md bg-plac-DEFAULT text-pln-card text-[12.5px] font-medium hover:bg-plac-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// 실제 사용 외 import 방지
void Calendar;
void ListChecks;

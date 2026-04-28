/**
 * ✅ Tasks — 할 일 페이지 (Phase 1.3)
 *
 * 그룹: 오늘 / 이번 주 / 미정 / 완료(7일).
 * 가상 habit todo 가 오늘 그룹 최상단.
 * 빠른 추가 바 + 목표 필터 + Undo 토스트 + 단축키.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Check, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  useTasks, addTask, updateTask, removeTask, toggleTaskDone, getTask,
  useGoals,
  useTodayTaskRows,
  toggleHabitDay,
  todayKey, dayKeyOf, formatKst,
  type Task, type Priority, type ID, type VirtualHabitTask,
} from '@/lib/planner';

// ──────────────────────────────────────────
// 그룹화 헬퍼
// ──────────────────────────────────────────
const DAY = 24 * 3600 * 1000;
const WEEK_AHEAD = 7 * DAY;

function relevantTime(t: Task): number | null {
  return t.scheduledAt ?? t.dueAt ?? null;
}

function groupOf(t: Task): 'today' | 'thisweek' | 'unscheduled' | 'completed' {
  const today = todayKey();
  if (t.done) {
    if (t.doneAt && Date.now() - t.doneAt < 7 * DAY) return 'completed';
    return 'completed';
  }
  const when = relevantTime(t);
  if (when == null) return 'unscheduled';
  if (dayKeyOf(when) === today) return 'today';
  if (when - Date.now() <= WEEK_AHEAD && when - Date.now() >= 0) return 'thisweek';
  if (when < Date.now()) return 'today'; // 지난 미완료 → 오늘로
  return 'unscheduled';
}

// ──────────────────────────────────────────
const Tasks = () => {
  const navigate = useNavigate();
  const allTasks = useTasks();
  const todayRows = useTodayTaskRows();
  const goals = useGoals().filter((g) => g.status === 'active');
  const [filterGoalId, setFilterGoalId] = useState<ID | 'all'>('all');
  const [editFor, setEditFor] = useState<Task | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  // 가상 habit todo (오늘 그룹 최상단)
  const virtualHabits = todayRows.filter(
    (r): r is VirtualHabitTask => r.kind === 'virtual_habit_task',
  );

  // 실 task 들 — 필터 적용
  const filtered = useMemo(() => {
    if (filterGoalId === 'all') return allTasks;
    return allTasks.filter((t) => t.goalId === filterGoalId);
  }, [allTasks, filterGoalId]);

  // 그룹화
  const grouped = useMemo(() => {
    const g = { today: [] as Task[], thisweek: [] as Task[], unscheduled: [] as Task[], completed: [] as Task[] };
    for (const t of filtered) g[groupOf(t)].push(t);
    // 오늘: 마감 오늘이 위, 그 다음 우선순위
    const PRIO_ORDER: Record<Priority, number> = { high: 0, med: 1, low: 2 };
    g.today.sort((a, b) => {
      const ad = a.dueAt && dayKeyOf(a.dueAt) === todayKey() ? 0 : 1;
      const bd = b.dueAt && dayKeyOf(b.dueAt) === todayKey() ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
    });
    g.thisweek.sort((a, b) => (relevantTime(a) ?? 0) - (relevantTime(b) ?? 0));
    g.unscheduled.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
    g.completed.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
    return g;
  }, [filtered]);

  const activeCount = grouped.today.length + grouped.thisweek.length + grouped.unscheduled.length;

  // 단축키
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
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-[920px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800 leading-tight">✅ 할 일</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              활성 {activeCount}{grouped.completed.length > 0 ? ` · 완료 ${grouped.completed.length}` : ''}
            </p>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 border border-slate-200">
            n 키로 추가
          </kbd>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-[920px] mx-auto px-5 py-4 space-y-4">
        <QuickAddBar inputRef={quickRef} goals={goals} defaultGoalId={filterGoalId === 'all' ? undefined : filterGoalId} />

        {/* 목표 필터 칩 */}
        {goals.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterGoalId('all')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                filterGoalId === 'all'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200',
              )}
            >
              전체
              <span className="text-[9.5px] text-slate-400">{allTasks.filter(t => !t.done).length}</span>
            </button>
            {goals.map((g) => {
              const count = allTasks.filter((t) => t.goalId === g.id && !t.done).length;
              const active = filterGoalId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setFilterGoalId(g.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border max-w-[180px]',
                    active
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200',
                  )}
                >
                  <span>{g.emoji || '🎯'}</span>
                  <span className="truncate">{g.title}</span>
                  <span className="text-[9.5px] text-slate-400 shrink-0">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 그룹별 리스트 */}
        {activeCount === 0 && grouped.completed.length === 0 ? (
          <EmptyState onCreate={() => quickRef.current?.focus()} />
        ) : (
          <>
            {/* 오늘 — 가상 habit + 실 task */}
            {(virtualHabits.length > 0 || grouped.today.length > 0) && (
              <Section title="오늘" count={virtualHabits.length + grouped.today.length}>
                {virtualHabits.map((vh) => (
                  <VirtualHabitRow key={vh.id} row={vh} />
                ))}
                {grouped.today.map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} highlightDueToday />
                ))}
              </Section>
            )}

            {grouped.thisweek.length > 0 && (
              <Section title="이번 주" count={grouped.thisweek.length}>
                {grouped.thisweek.map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} showWhen />
                ))}
              </Section>
            )}

            {grouped.unscheduled.length > 0 && (
              <Section title="미정" count={grouped.unscheduled.length}>
                {grouped.unscheduled.map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />
                ))}
              </Section>
            )}

            {grouped.completed.length > 0 && (
              <Section title="완료 (지난 7일)" count={grouped.completed.length} muted>
                {grouped.completed.slice(0, 20).map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />
                ))}
              </Section>
            )}
          </>
        )}
      </main>

      {editFor && (
        <TaskEditModal
          task={editFor}
          onClose={() => setEditFor(null)}
        />
      )}
    </div>
  );
};

export default Tasks;

// ──────────────────────────────────────────
// EmptyState
// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-[18px] font-bold text-slate-800 mb-2">오늘 할 일을 적어볼까요</h2>
      <p className="text-[13px] text-slate-500 mb-6 max-w-md mx-auto">
        제목만 적어도 OK. 시간·우선순위·목표 연결은 나중에 추가해도 됩니다.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
      >
        <Plus className="w-4 h-4" />
        새 할 일
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// QuickAddBar
// ──────────────────────────────────────────
function QuickAddBar({
  inputRef, goals, defaultGoalId,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  goals: { id: ID; title: string; emoji?: string }[];
  defaultGoalId?: ID;
}) {
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [whenChip, setWhenChip] = useState<'today' | 'tomorrow' | 'week' | 'none'>('today');
  const [priority, setPriority] = useState<Priority>('med');
  const [goalId, setGoalId] = useState<ID | undefined>(defaultGoalId);

  useEffect(() => { setGoalId(defaultGoalId); }, [defaultGoalId]);

  const submit = () => {
    if (!title.trim()) return;
    const now = Date.now();
    let scheduledAt: number | undefined;
    if (whenChip === 'today') scheduledAt = now;
    else if (whenChip === 'tomorrow') scheduledAt = now + DAY;
    else if (whenChip === 'week') scheduledAt = now + 3 * DAY;
    addTask({
      title: title.trim(),
      scheduledAt,
      priority,
      goalId,
      source: 'manual',
    });
    setTitle('');
    notify.saved();
  };

  return (
    <div className={cn(
      'rounded-xl bg-white border transition-all',
      expanded ? 'border-indigo-200 shadow-sm' : 'border-slate-200',
    )}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Plus className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={(e) => {
            // 포커스가 옵션 영역으로 가지 않으면 접음
            const next = e.relatedTarget as HTMLElement | null;
            if (!next || !next.closest('[data-quickadd]')) {
              if (!title.trim()) setExpanded(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) submit();
            if (e.key === 'Escape') {
              setTitle('');
              setExpanded(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="새 할 일... (Enter 로 추가)"
          className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-300 outline-none"
        />
        {title.trim() && (
          <button
            onClick={submit}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700"
          >
            추가
          </button>
        )}
      </div>
      {expanded && (
        <div data-quickadd className="px-3 pb-3 pt-1 flex flex-wrap items-center gap-3 text-[11px] border-t border-slate-100">
          {/* 시간 */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">언제</span>
            {([
              { k: 'today', label: '오늘' },
              { k: 'tomorrow', label: '내일' },
              { k: 'week', label: '이번 주' },
              { k: 'none', label: '미정' },
            ] as const).map((c) => (
              <button
                key={c.k}
                onClick={() => setWhenChip(c.k)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-medium border',
                  whenChip === c.k
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-500 border-slate-200',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* 우선순위 */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">우선</span>
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                  priority === p
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-500 border-slate-200',
                )}
              >
                <PrioDot p={p} />
                {p === 'low' ? '낮' : p === 'med' ? '보통' : '높'}
              </button>
            ))}
          </div>
          {/* 목표 */}
          {goals.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-400">목표</span>
              <button
                onClick={() => setGoalId(undefined)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-medium border',
                  !goalId ? 'bg-slate-50 text-slate-700 border-slate-300' : 'bg-white text-slate-400 border-slate-200',
                )}
              >
                없음
              </button>
              {goals.slice(0, 5).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoalId(g.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border max-w-[140px]',
                    goalId === g.id
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-500 border-slate-200',
                  )}
                >
                  <span>{g.emoji || '🎯'}</span>
                  <span className="truncate">{g.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrioDot({ p }: { p: Priority }) {
  const tone =
    p === 'high' ? 'bg-rose-500' :
    p === 'med' ? 'bg-amber-400' :
    'bg-slate-300';
  return <span className={cn('inline-block w-1.5 h-1.5 rounded-full', tone)} />;
}

// ──────────────────────────────────────────
// Section
// ──────────────────────────────────────────
function Section({ title, count, muted, children }: { title: string; count: number; muted?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={cn(
        'text-[11px] font-bold mb-1.5 px-0.5',
        muted ? 'text-slate-400' : 'text-slate-600',
      )}>
        {title} <span className="text-slate-400 font-normal">· {count}</span>
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

// ──────────────────────────────────────────
// VirtualHabitRow — 오늘 해야 할 습관 가상 todo
// ──────────────────────────────────────────
function VirtualHabitRow({ row }: { row: VirtualHabitTask }) {
  const handleToggle = () => {
    toggleHabitDay(row.habitId, row.dayKey);
  };
  return (
    <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-slate-200 overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" aria-hidden />
      <button
        onClick={handleToggle}
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
          row.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400',
        )}
        aria-label="완료"
      >
        {row.done && <Check className="w-3 h-3 text-white" />}
      </button>
      <span className="text-[14px]">{row.emoji || '🌱'}</span>
      <span className={cn(
        'text-[12.5px] flex-1 truncate',
        row.done ? 'text-slate-400 line-through' : 'text-slate-700',
      )}>
        {row.title}
      </span>
      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold shrink-0">
        🌱 습관
      </span>
    </div>
  );
}

// ──────────────────────────────────────────
// TaskRow
// ──────────────────────────────────────────
function TaskRow({
  task, onEdit, highlightDueToday, showWhen,
}: {
  task: Task;
  onEdit: () => void;
  highlightDueToday?: boolean;
  showWhen?: boolean;
}) {
  const goals = useGoals();
  const goal = task.goalId ? goals.find((g) => g.id === task.goalId) : null;
  const today = todayKey();
  const isDueToday = highlightDueToday && task.dueAt && dayKeyOf(task.dueAt) === today;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskDone(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot = task;
    removeTask(task.id);
    notify.info(`"${snapshot.title}" 삭제됨`, {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
          // 새 id 부여 (원본 id 복원은 부담) — 사용자 입장에선 같은 항목 복귀
          addTask({
            title: snapshot.title,
            notes: snapshot.notes,
            scheduledAt: snapshot.scheduledAt,
            dueAt: snapshot.dueAt,
            priority: snapshot.priority,
            goalId: snapshot.goalId,
            habitId: snapshot.habitId,
            parentTaskId: snapshot.parentTaskId,
            source: snapshot.source,
          });
        },
      },
    });
  };

  return (
    <div
      onClick={onEdit}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border transition-all cursor-pointer group',
        task.done ? 'border-slate-100' : 'border-slate-200 hover:border-indigo-200',
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
          task.done
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-slate-300 hover:border-indigo-400',
        )}
        aria-label="완료 토글"
      >
        {task.done && <Check className="w-3 h-3 text-white" />}
      </button>
      <PrioDot p={task.priority} />
      <div className="min-w-0 flex-1">
        <div className={cn(
          'text-[12.5px] truncate',
          task.done ? 'text-slate-400 line-through' : 'text-slate-800 font-medium',
        )}>
          {task.title}
        </div>
        {task.notes && (
          <div className="text-[10.5px] text-slate-400 truncate mt-0.5">{task.notes}</div>
        )}
      </div>
      {/* 마감 오늘 강조 */}
      {isDueToday && !task.done && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 shrink-0">
          오늘 마감
        </span>
      )}
      {/* showWhen */}
      {showWhen && (task.scheduledAt || task.dueAt) && !task.done && (
        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
          {formatKst((task.scheduledAt ?? task.dueAt)!).slice(5)}
        </span>
      )}
      {/* 목표 칩 */}
      {goal && !task.done && (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 max-w-[120px] shrink-0">
          <span>{goal.emoji || '🎯'}</span>
          <span className="truncate">{goal.title}</span>
        </span>
      )}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-opacity shrink-0"
        aria-label="삭제"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// TaskEditModal
// ──────────────────────────────────────────
function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const goals = useGoals().filter((g) => g.status === 'active');
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [goalId, setGoalId] = useState<ID | undefined>(task.goalId);
  const [scheduledAt, setScheduledAt] = useState<string>(
    task.scheduledAt ? new Date(task.scheduledAt + 9 * 3600 * 1000).toISOString().slice(0, 16) : '',
  );
  const [dueAt, setDueAt] = useState<string>(
    task.dueAt ? new Date(task.dueAt + 9 * 3600 * 1000).toISOString().slice(0, 16) : '',
  );

  const save = () => {
    if (!title.trim()) return;
    const parseLocal = (s: string): number | undefined => {
      if (!s) return undefined;
      // datetime-local (KST 표시값) → UTC ms
      const d = new Date(s + 'Z');
      return d.getTime() - 9 * 3600 * 1000;
    };
    updateTask(task.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      goalId,
      scheduledAt: parseLocal(scheduledAt),
      dueAt: parseLocal(dueAt),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm(`"${task.title}" 삭제할까요?`)) return;
    removeTask(task.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="할 일 편집">
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">제목</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">메모</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="한 줄 메모 (선택)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-indigo-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">예정</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11.5px] outline-none focus:border-indigo-300"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">마감</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11.5px] outline-none focus:border-indigo-300"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">우선순위</label>
          <div className="flex gap-1.5">
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border',
                  priority === p
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200',
                )}
              >
                <PrioDot p={p} />
                {p === 'low' ? '낮음' : p === 'med' ? '보통' : '높음'}
              </button>
            ))}
          </div>
        </div>
        {goals.length > 0 && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">목표 연결</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setGoalId(undefined)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                  !goalId ? 'bg-slate-50 text-slate-700 border-slate-300' : 'bg-white text-slate-400 border-slate-200',
                )}
              >
                연결 안 함
              </button>
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoalId(g.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border max-w-[160px]',
                    goalId === g.id
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white text-slate-600 border-slate-200',
                  )}
                >
                  <span>{g.emoji || '🎯'}</span>
                  <span className="truncate">{g.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleDelete}
          className="text-[12px] text-rose-500 hover:text-rose-700 font-medium inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          삭제
        </button>
        <button
          onClick={save}
          disabled={!title.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
        >
          저장
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// 공용 모달 셸
// ──────────────────────────────────────────
function ModalShell({
  onClose, title, children,
}: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-slate-800 flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/70 backdrop-blur-sm flex items-center justify-between gap-3 -mx-5 -mb-4 mt-5">
      {children}
    </div>
  );
}

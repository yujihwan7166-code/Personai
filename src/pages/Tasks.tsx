/**
 * Tasks — 할 일 (markdown / mono 톤)
 * 시스템 emoji X · 체크박스는 텍스트 같은 [ ] 정사각.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  useTasks, addTask, updateTask, removeTask, toggleTaskDone,
  useGoals,
  useTodayTaskRows,
  toggleHabitDay,
  todayKey, dayKeyOf, formatKst,
  type Task, type Priority, type ID, type VirtualHabitTask,
} from '@/lib/planner';

const DAY = 24 * 3600 * 1000;
const WEEK_AHEAD = 7 * DAY;

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

const PRIO_ORDER: Record<Priority, number> = { high: 0, med: 1, low: 2 };

const Tasks = () => {
  const navigate = useNavigate();
  const allTasks = useTasks();
  const todayRows = useTodayTaskRows();
  const goals = useGoals().filter((g) => g.status === 'active');
  const [filterGoalId, setFilterGoalId] = useState<ID | 'all'>('all');
  const [editFor, setEditFor] = useState<Task | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const virtualHabits = todayRows.filter(
    (r): r is VirtualHabitTask => r.kind === 'virtual_habit_task',
  );

  const filtered = useMemo(() => {
    if (filterGoalId === 'all') return allTasks;
    return allTasks.filter((t) => t.goalId === filterGoalId);
  }, [allTasks, filterGoalId]);

  const grouped = useMemo(() => {
    const g = { today: [] as Task[], thisweek: [] as Task[], unscheduled: [] as Task[], completed: [] as Task[] };
    for (const t of filtered) g[groupOf(t)].push(t);
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
    <div className="min-h-screen bg-pln-base">
      <header className="border-b border-pln-line bg-pln-base">
        <div className="max-w-[820px] mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-plnk-muted hover:text-plnk-DEFAULT"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">할 일</span>
          <div className="flex-1" />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-plnk-muted border border-pln-line">
            n
          </kbd>
        </div>
      </header>

      <main className="max-w-[820px] mx-auto px-6 py-10 space-y-7">
        <div>
          <h1 className="font-display text-[40px] sm:text-[44px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em]">
            오늘 할 일
          </h1>
          <p className="mt-3 text-[14px] text-plnk-muted">
            {activeCount === 0 && grouped.completed.length === 0
              ? '비어 있음.'
              : `진행 ${activeCount} · 완료 ${grouped.completed.length}`}
          </p>
        </div>

        <QuickAddBar
          inputRef={quickRef}
          goals={goals}
          defaultGoalId={filterGoalId === 'all' ? undefined : filterGoalId}
        />

        {goals.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap text-[11.5px]">
            <button
              onClick={() => setFilterGoalId('all')}
              className={cn(
                'pb-0.5 transition-colors',
                filterGoalId === 'all'
                  ? 'text-plnk-DEFAULT border-b border-plnk-DEFAULT'
                  : 'text-plnk-muted hover:text-plnk-DEFAULT',
              )}
            >
              전체 <span className="font-mono tabular-nums text-plnk-faint">{allTasks.filter((t) => !t.done).length}</span>
            </button>
            {goals.map((g) => {
              const count = allTasks.filter((t) => t.goalId === g.id && !t.done).length;
              const active = filterGoalId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setFilterGoalId(g.id)}
                  className={cn(
                    'pb-0.5 transition-colors max-w-[220px] truncate',
                    active
                      ? 'text-plnk-DEFAULT border-b border-plnk-DEFAULT'
                      : 'text-plnk-muted hover:text-plnk-DEFAULT',
                  )}
                  title={g.title}
                >
                  {g.title} <span className="font-mono tabular-nums text-plnk-faint">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeCount === 0 && grouped.completed.length === 0 ? (
          <EmptyState onCreate={() => quickRef.current?.focus()} />
        ) : (
          <div className="space-y-7">
            {(virtualHabits.length > 0 || grouped.today.length > 0) && (
              <Section title="오늘" count={virtualHabits.length + grouped.today.length}>
                {virtualHabits.map((vh) => <VirtualHabitRow key={vh.id} row={vh} />)}
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
                {grouped.unscheduled.map((t) => <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />)}
              </Section>
            )}
            {grouped.completed.length > 0 && (
              <Section title="지난 7일 완료" count={grouped.completed.length} muted>
                {grouped.completed.slice(0, 20).map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={() => setEditFor(t)} />
                ))}
              </Section>
            )}
          </div>
        )}
      </main>

      {editFor && <TaskEditModal task={editFor} onClose={() => setEditFor(null)} />}
    </div>
  );
};

export default Tasks;

// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-t border-b border-pln-line py-20 text-center">
      <p className="font-display text-[22px] text-plnk-DEFAULT mb-2 tracking-tight">
        오늘은 무얼 할까요.
      </p>
      <p className="text-[13px] text-plnk-muted mb-8 max-w-md mx-auto">
        제목만 적어도 됩니다. 시간·우선순위·연결은 나중에 천천히.
      </p>
      <button
        onClick={onCreate}
        className="text-[13px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT pb-0.5 hover:opacity-70"
      >
        시작하기 →
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
function QuickAddBar({
  inputRef, goals, defaultGoalId,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  goals: { id: ID; title: string }[];
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
    addTask({ title: title.trim(), scheduledAt, priority, goalId, source: 'manual' });
    setTitle('');
    notify.saved();
  };

  return (
    <div className={cn(
      'border-y transition-colors',
      expanded ? 'border-plnk-DEFAULT bg-pln-card' : 'border-pln-line',
    )}>
      <div className="flex items-center gap-3 py-3">
        <span className="font-mono text-plnk-muted text-[14px]">{title.trim() ? '[ ]' : '+'}</span>
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
            if (e.key === 'Escape') {
              setTitle('');
              setExpanded(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="새 할 일... (Enter)"
          className="flex-1 bg-transparent text-[14px] text-plnk-DEFAULT placeholder:text-plnk-faint outline-none"
        />
        {title.trim() && (
          <button onClick={submit} className="text-[12px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT pb-0.5">
            추가
          </button>
        )}
      </div>
      {expanded && (
        <div data-quickadd className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 border-t border-pln-line text-[11.5px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-plnk-muted text-[10px] uppercase tracking-wider">언제</span>
            {([
              { k: 'today', label: '오늘' },
              { k: 'tomorrow', label: '내일' },
              { k: 'week', label: '이번 주' },
              { k: 'none', label: '미정' },
            ] as const).map((c) => (
              <InlineBtn key={c.k} active={whenChip === c.k} onClick={() => setWhenChip(c.k)}>{c.label}</InlineBtn>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-plnk-muted text-[10px] uppercase tracking-wider">우선</span>
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <InlineBtn key={p} active={priority === p} onClick={() => setPriority(p)}>
                {p === 'low' ? '낮' : p === 'med' ? '보통' : '높'}
              </InlineBtn>
            ))}
          </div>
          {goals.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-plnk-muted text-[10px] uppercase tracking-wider">연결</span>
              <InlineBtn active={!goalId} onClick={() => setGoalId(undefined)}>없음</InlineBtn>
              {goals.slice(0, 5).map((g) => (
                <InlineBtn key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                  <span className="truncate max-w-[120px]">{g.title}</span>
                </InlineBtn>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InlineBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

// ──────────────────────────────────────────
function Section({ title, count, muted, children }: { title: string; count: number; muted?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={cn(
        'text-[10px] font-mono uppercase tracking-[0.2em] mb-3 pb-2 border-b border-pln-line flex items-baseline justify-between',
        muted ? 'text-plnk-faint' : 'text-plnk-muted',
      )}>
        <span>{title}</span>
        <span className="tabular-nums">{count}</span>
      </h2>
      <div>{children}</div>
    </section>
  );
}

// ──────────────────────────────────────────
function VirtualHabitRow({ row }: { row: VirtualHabitTask }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-pln-line group">
      <button
        onClick={() => toggleHabitDay(row.habitId, row.dayKey)}
        className={cn(
          'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
          row.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plnk-DEFAULT',
        )}
        aria-label="완료"
      >
        {row.done && <span className="block w-1.5 h-1.5 bg-pln-card" />}
      </button>
      {row.emoji && <span className="text-[13px]">{row.emoji}</span>}
      <span className={cn('text-[13.5px] flex-1 truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
        {row.title}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-faint">습관</span>
    </div>
  );
}

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
    notify.info(`삭제됨`, {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
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
      className="flex items-center gap-3 py-2 border-b border-pln-line cursor-pointer group hover:bg-pln-card/60 transition-colors px-1 -mx-1"
    >
      <button
        onClick={handleToggle}
        className={cn(
          'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
          task.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plnk-DEFAULT',
        )}
        aria-label="완료 토글"
      >
        {task.done && <span className="block w-1.5 h-1.5 bg-pln-card" />}
      </button>

      {task.priority === 'high' && !task.done && (
        <span className="font-mono text-[10px] text-plac-warn shrink-0">!</span>
      )}

      <div className="min-w-0 flex-1">
        <div className={cn(
          'text-[13.5px] truncate',
          task.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT',
        )}>
          {task.title}
        </div>
        {task.notes && <div className="text-[11px] text-plnk-muted truncate mt-0.5">{task.notes}</div>}
      </div>

      {isDueToday && !task.done && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-plac-warn shrink-0">마감</span>
      )}
      {showWhen && (task.scheduledAt || task.dueAt) && !task.done && (
        <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted shrink-0">
          {formatKst((task.scheduledAt ?? task.dueAt)!).slice(5)}
        </span>
      )}
      {goal && !task.done && (
        <span className="text-[10.5px] text-plnk-muted truncate max-w-[140px] shrink-0">
          {goal.title}
        </span>
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
    if (!window.confirm(`"${task.title}" 지울까요?`)) return;
    removeTask(task.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} eyebrow="편집">
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
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-transparent border-b border-pln-rule pb-1 text-[12.5px] outline-none focus:border-plac-DEFAULT"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">마감</label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full bg-transparent border-b border-pln-rule pb-1 text-[12.5px] outline-none focus:border-plac-DEFAULT"
          />
        </div>
      </div>
      <Field label="우선순위">
        <div className="flex gap-px bg-pln-line border border-pln-line">
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
            <ChipBtn active={!goalId} onClick={() => setGoalId(undefined)}>없음</ChipBtn>
            {goals.map((g) => (
              <ChipBtn key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                <span className="truncate max-w-[140px]">{g.title}</span>
              </ChipBtn>
            ))}
          </div>
        </Field>
      )}

      <ModalFooter>
        <button onClick={handleDelete} className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1">
          <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
        </button>
        <FooterPrimary onClick={save} disabled={!title.trim()}>저장</FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// 공용
// ──────────────────────────────────────────
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
        active ? 'bg-plnk-DEFAULT text-pln-card' : 'bg-pln-card text-plnk-muted hover:text-plnk-DEFAULT',
      )}
    >
      {children}
    </button>
  );
}

function ChipBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 text-[11.5px] border transition-colors',
        active
          ? 'bg-plnk-DEFAULT text-pln-card border-plnk-DEFAULT'
          : 'bg-pln-card text-plnk-muted border-pln-rule hover:text-plnk-DEFAULT',
      )}
    >
      {children}
    </button>
  );
}

function ModalShell({
  onClose, eyebrow, title, children,
}: { onClose: () => void; eyebrow: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-plnk-DEFAULT/15 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] bg-pln-card rounded-lg border border-pln-line shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-7 pt-6 pb-4 border-b border-pln-line flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-1">{eyebrow}</p>
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

function FooterPrimary({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[13px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT pb-0.5 hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children} →
    </button>
  );
}

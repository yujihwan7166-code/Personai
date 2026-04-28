/**
 * Goals — 모노크롬 에디토리얼 톤
 * - 시스템 이모지 X (사용자 입력 emoji 만)
 * - 라운드 최소·그림자 X·그라데이션 X
 * - 진척률 큰 숫자가 카드 중심
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGoals, addGoal, updateGoal,
  useGoalProgress, removeGoalCascade,
  useTasks, useHabits, addTask, addHabit, toggleTaskDone, getTask, removeTask,
  type Goal, type GoalCategory, type GoalMetric, type Task, type Habit,
  formatKst,
} from '@/lib/planner';
import { GOAL_TEMPLATES, CATEGORY_META } from '@/lib/planner/templates';

const CATEGORIES: GoalCategory[] = ['work', 'health', 'learning', 'relationship', 'finance', 'personal'];
const CAT_LABEL: Record<GoalCategory, string> = {
  work: '업무', health: '건강', learning: '학습',
  relationship: '관계', finance: '재정', personal: '개인',
};

const Goals = () => {
  const navigate = useNavigate();
  const goals = useGoals();
  const [createOpen, setCreateOpen] = useState(false);
  const [decomposeFor, setDecomposeFor] = useState<Goal | null>(null);
  const [detailFor, setDetailFor] = useState<Goal | null>(null);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const archivedCount = goals.filter((g) => g.status !== 'active').length;

  const handleCreated = (goal: Goal) => {
    setCreateOpen(false);
    setDecomposeFor(goal);
  };

  return (
    <div className="min-h-screen bg-pln-base">
      <header className="border-b border-pln-line bg-pln-base">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-plnk-muted hover:text-plnk-DEFAULT transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">목표</span>
          <div className="flex-1" />
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT hover:opacity-70 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} /> 새 목표
          </button>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-[40px] sm:text-[44px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em]">
            지금 진행 중인 일들
          </h1>
          <p className="mt-3 text-[14px] text-plnk-muted">
            {activeGoals.length === 0
              ? '아직 정해둔 게 없어요.'
              : `${activeGoals.length}가지${archivedCount > 0 ? ` · 보관함 ${archivedCount}` : ''}`}
          </p>
        </div>

        {activeGoals.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onClick={() => setDetailFor(g)} />
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <GoalCreateModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
      {decomposeFor && (
        <GoalDecomposeModal goal={decomposeFor} onClose={() => setDecomposeFor(null)} />
      )}
      {detailFor && (
        <GoalDetailModal
          goal={detailFor}
          onClose={() => setDetailFor(null)}
          onDeleted={() => setDetailFor(null)}
        />
      )}
    </div>
  );
};

export default Goals;

// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-t border-b border-pln-line py-20 text-center">
      <p className="font-display text-[22px] text-plnk-DEFAULT mb-2 tracking-tight">
        목표 한 가지부터.
      </p>
      <p className="text-[13px] text-plnk-muted mb-8 max-w-md mx-auto">
        정해두면 그에 맞는 할 일과 습관이 함께 따라옵니다.
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
function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const prog = useGoalProgress(goal.id);
  const meta = CATEGORY_META[goal.category];
  const days = Math.ceil((goal.dueAt - Date.now()) / (24 * 3600 * 1000));
  const ddayClass =
    days < 0 ? 'text-plnk-faint' :
    days <= 1 ? 'text-plac-warn' :
    days <= 7 ? 'text-plnk-dim' :
    'text-plnk-muted';

  const pct = Math.round(prog.progress * 100);

  return (
    <button
      onClick={onClick}
      className="text-left bg-pln-card rounded-lg border border-pln-line hover:border-plnk-faint hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all p-6 group relative overflow-hidden"
    >
      {/* 좌측 카테고리 컬러 dot */}
      <div className="absolute left-0 top-6 w-1 h-12 rounded-r" style={{ backgroundColor: meta.color }} />

      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-plnk-muted">
          {CAT_LABEL[goal.category]}
        </span>
        <span className={cn('text-[10px] font-mono tabular-nums', ddayClass)}>
          {days < 0 ? `D+${-days}` : `D-${days}`}
        </span>
      </div>

      <h3 className="font-display text-[20px] font-semibold text-plnk-DEFAULT leading-snug tracking-tight pr-2 mb-6">
        {goal.title}
      </h3>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[44px] font-semibold text-plnk-DEFAULT tabular-nums leading-none">
            {pct}
          </span>
          <span className="text-[14px] text-plnk-muted">%</span>
        </div>
        <div className="text-right text-[10.5px] text-plnk-muted">
          {goal.metric.kind === 'count' ? (
            <span className="tabular-nums">{prog.doneTasks} / {goal.metric.target}</span>
          ) : '수동'}
          {prog.habitsCount > 0 && (
            <div className="tabular-nums">습관 {prog.habitsCount} · {Math.round(prog.avgHabitRate30d * 100)}%</div>
          )}
        </div>
      </div>

      <div className="h-px mt-4 bg-pln-line">
        <div className="h-px bg-plac-DEFAULT transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

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
    const metric: GoalMetric =
      metricKind === 'count' ? { kind: 'count', target } : { kind: 'percent', manual: 0 };
    const g = addGoal({
      title: title.trim(),
      category,
      startedAt: now,
      dueAt,
      status: 'active',
      metric,
    });
    onCreated(g);
  };

  return (
    <ModalShell onClose={onClose} eyebrow="새 목표">
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
        <div className="flex flex-wrap gap-px bg-pln-line border border-pln-line">
          {CATEGORIES.map((cat) => (
            <SegBtn key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {CAT_LABEL[cat]}
            </SegBtn>
          ))}
        </div>
      </Field>

      <Field label="측정">
        <div className="flex gap-px bg-pln-line border border-pln-line mb-3">
          <SegBtn active={metricKind === 'count'} onClick={() => setMetricKind('count')}>개수 달성</SegBtn>
          <SegBtn active={metricKind === 'percent'} onClick={() => setMetricKind('percent')}>퍼센트 슬라이더</SegBtn>
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
            <span className="text-[11px] text-plnk-muted">개</span>
            <div className="ml-auto flex gap-2 text-[11px] text-plnk-muted">
              {[10, 30, 100].map((v) => (
                <button key={v} onClick={() => setTarget(v)} className="hover:text-plac-DEFAULT tabular-nums">
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>

      <Field label="기한">
        <div className="flex gap-px bg-pln-line border border-pln-line">
          {[30, 90, 180, 365].map((d) => (
            <SegBtn key={d} active={dueDays === d} onClick={() => setDueDays(d)}>
              {d === 30 ? '한 달' : d === 90 ? '석 달' : d === 180 ? '반년' : '1년'}
            </SegBtn>
          ))}
        </div>
      </Field>

      <ModalFooter>
        <FooterCancel onClick={onClose}>취소</FooterCancel>
        <FooterPrimary onClick={submit} disabled={!title.trim()}>만들기</FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
function GoalDecomposeModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const tpl = GOAL_TEMPLATES[goal.category];
  const [habitChecks, setHabitChecks] = useState<boolean[]>(tpl.habits.map(() => false));
  const [taskChecks, setTaskChecks] = useState<boolean[]>(tpl.tasks.map(() => false));

  const submit = () => {
    tpl.habits.forEach((h, i) => {
      if (habitChecks[i]) {
        addHabit({ title: h.title, emoji: h.emoji, cadence: h.cadence, scheduleAt: h.scheduleAt, goalId: goal.id });
      }
    });
    tpl.tasks.forEach((t, i) => {
      if (taskChecks[i]) {
        addTask({ title: t.title, goalId: goal.id, source: 'manual', priority: 'med' });
      }
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
            <DecomposeRow
              key={i}
              checked={habitChecks[i]}
              onToggle={() => setHabitChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
            >
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
            <DecomposeRow
              key={i}
              checked={taskChecks[i]}
              onToggle={() => setTaskChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
            >
              <span className="text-[13.5px] text-plnk-DEFAULT flex-1">{t.title}</span>
            </DecomposeRow>
          ))}
        </div>
      </div>

      <ModalFooter>
        <FooterCancel onClick={onClose}>건너뛰기</FooterCancel>
        <FooterPrimary onClick={submit} disabled={checkedCount === 0}>
          {checkedCount > 0 ? `${checkedCount}개 추가` : '항목 선택'}
        </FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

function DecomposeRow({
  checked, onToggle, children,
}: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 px-1 py-3 border-b border-pln-line cursor-pointer hover:bg-pln-base/40 transition-colors">
      <span
        className={cn(
          'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule',
        )}
      >
        {checked && <span className="block w-1.5 h-1.5 bg-pln-card" />}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      {children}
    </label>
  );
}

// ──────────────────────────────────────────
function GoalDetailModal({
  goal, onClose, onDeleted,
}: { goal: Goal; onClose: () => void; onDeleted: () => void }) {
  const allTasks = useTasks();
  const allHabits = useHabits();
  const prog = useGoalProgress(goal.id);
  const tasks = allTasks.filter((t) => t.goalId === goal.id);
  const habits = allHabits.filter((h) => h.goalId === goal.id && !h.archivedAt);
  const pct = Math.round(prog.progress * 100);

  const [percentVal, setPercentVal] = useState(
    goal.metric.kind === 'percent' ? goal.metric.manual : 0,
  );

  const handlePercentChange = (v: number) => {
    setPercentVal(v);
    if (goal.metric.kind === 'percent') {
      updateGoal(goal.id, { metric: { kind: 'percent', manual: v } });
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`"${goal.title}" 지울까요? 연결된 항목은 그대로 남고 연결만 풀립니다.`)) return;
    removeGoalCascade(goal.id);
    onDeleted();
  };

  return (
    <ModalShell
      onClose={onClose}
      eyebrow={`${CAT_LABEL[goal.category]} · 마감 ${formatKst(goal.dueAt)}`}
      title={goal.title}
    >
      <div className="border-y border-pln-line py-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">진척</span>
          <span className="font-display text-[36px] font-semibold text-plnk-DEFAULT tabular-nums leading-none">
            {pct}<span className="text-[16px] text-plnk-muted ml-0.5">%</span>
          </span>
        </div>
        <div className="h-px bg-pln-line">
          <div className="h-px bg-plac-DEFAULT transition-all" style={{ width: `${pct}%` }} />
        </div>
        {goal.metric.kind === 'percent' && (
          <input
            type="range"
            min={0}
            max={100}
            value={percentVal}
            onChange={(e) => handlePercentChange(parseInt(e.target.value, 10))}
            className="w-full mt-4 accent-plac-DEFAULT"
          />
        )}
      </div>

      <div className="mb-6">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-2">
          할 일 · {prog.doneTasks}/{tasks.length}
        </h4>
        {tasks.length === 0 ? (
          <p className="text-[12px] text-plnk-faint italic">아직 없음</p>
        ) : (
          <div className="border-t border-pln-line">
            {tasks.map((t) => <TaskLine key={t.id} task={t} />)}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-2">
          습관 · {habits.length}개 (30일 평균 {Math.round(prog.avgHabitRate30d * 100)}%)
        </h4>
        {habits.length === 0 ? (
          <p className="text-[12px] text-plnk-faint italic">아직 없음</p>
        ) : (
          <div className="border-t border-pln-line">
            {habits.map((h) => <HabitLine key={h.id} habit={h} />)}
          </div>
        )}
      </div>

      <ModalFooter>
        <button
          onClick={handleDelete}
          className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          지우기
        </button>
        <button
          onClick={() => { updateGoal(goal.id, { status: 'archived' }); onClose(); }}
          className="text-[12px] text-plnk-muted hover:text-plnk-DEFAULT"
        >
          보관함으로
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function TaskLine({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-pln-line">
      <button
        onClick={() => toggleTaskDone(task.id)}
        className={cn(
          'w-4 h-4 border flex items-center justify-center shrink-0',
          task.done ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule',
        )}
      >
        {task.done && <span className="block w-1.5 h-1.5 bg-pln-card" />}
      </button>
      <span className={cn(
        'text-[12.5px] flex-1',
        task.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT',
      )}>
        {task.title}
      </span>
      <button
        onClick={() => { if (getTask(task.id)) removeTask(task.id); }}
        className="text-plnk-faint hover:text-plac-warn"
        aria-label="지우기"
      >
        <X className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function HabitLine({ habit }: { habit: Habit }) {
  const cells: Array<{ done: boolean }> = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000 + 9 * 3600 * 1000);
    if (d.getUTCHours() < 3) d.setUTCDate(d.getUTCDate() - 1);
    const k = d.toISOString().slice(0, 10);
    cells.push({ done: !!habit.history[k] });
  }
  return (
    <div className="flex items-center gap-3 py-2 border-b border-pln-line">
      {habit.emoji && <span className="text-[13px]">{habit.emoji}</span>}
      <span className="text-[12.5px] text-plnk-DEFAULT flex-1 truncate">{habit.title}</span>
      <div className="flex gap-[1.5px]">
        {cells.map((c, i) => (
          <span key={i} className={cn('w-1 h-3', c.done ? 'bg-plac-DEFAULT' : 'bg-pln-line')} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 공용 빌딩 블록
// ──────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">
        {label}
      </label>
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

function FooterCancel({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[12.5px] text-plnk-muted hover:text-plnk-DEFAULT">
      {children}
    </button>
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


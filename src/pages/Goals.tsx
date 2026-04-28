/**
 * 🎯 Goals — 목표 관리 (페이퍼 톤 v1)
 *
 * 빈티지 노트북 / 페이퍼 디자인 시스템 적용:
 * - cream 배경 + page 카드 + ruled line 보더
 * - serif 헤딩 (font-display)
 * - 단방향 paper shadow
 * - 단색 진척바 (그라데이션 X)
 * - 도장 스탬프 효과 (체크 / 마감)
 * - 잉크 청 액센트 (인디고 X)
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Check } from 'lucide-react';
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

const Goals = () => {
  const navigate = useNavigate();
  const goals = useGoals();
  const [createOpen, setCreateOpen] = useState(false);
  const [decomposeFor, setDecomposeFor] = useState<Goal | null>(null);
  const [detailFor, setDetailFor] = useState<Goal | null>(null);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const archivedCount = goals.filter((g) => g.status === 'archived' || g.status === 'completed').length;

  const handleCreated = (goal: Goal) => {
    setCreateOpen(false);
    setDecomposeFor(goal);
  };

  return (
    <div className="min-h-screen bg-paper-cream">
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-10 bg-paper-cream/90 backdrop-blur-[2px] border-b border-paper-ruled">
        <div className="max-w-[920px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-md text-ink-light hover:bg-paper-page transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[18px] font-semibold text-ink leading-tight tracking-tight">
              🎯 목표
            </h1>
            <p className="text-[11.5px] text-ink-muted mt-0.5">
              지금 {activeGoals.length}가지 진행 중{archivedCount > 0 ? ` · 보관함 ${archivedCount}` : ''}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stamp-blue text-paper-page text-[12px] font-semibold hover:bg-[#163756] transition-colors shadow-paper-sm"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            새 목표
          </button>
        </div>
      </header>

      {/* ── 본문 ── */}
      <main className="max-w-[920px] mx-auto px-5 py-6">
        {activeGoals.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <>
            <SummaryBar goals={activeGoals} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {activeGoals.map((g) => (
                <GoalCard key={g.id} goal={g} onClick={() => setDetailFor(g)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── 모달들 ── */}
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
// EmptyState — 페이퍼 톤
// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-5">🎯</div>
      <h2 className="font-display text-[22px] font-semibold text-ink mb-3 tracking-tight">
        첫 분기 목표를 적어볼까요
      </h2>
      <p className="text-[13.5px] text-ink-light mb-7 max-w-md mx-auto leading-relaxed">
        목표 한 가지만 정해도, 연결할 습관과 할 일이 함께 추천됩니다.<br/>
        진척률은 알아서 계산돼요.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-7">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-page border border-paper-ruled text-[12px] text-ink-light hover:border-stamp-blue/40 hover:bg-paper-cream transition-colors"
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-stamp-blue text-paper-page text-[13px] font-semibold hover:bg-[#163756] transition-colors shadow-paper"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        목표 만들기
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// SummaryBar
// ──────────────────────────────────────────
function SummaryBar({ goals }: { goals: Goal[] }) {
  const stats = useMemo(() => {
    if (goals.length === 0) return { nearestDday: null as null | number };
    let nearestDday = Number.MAX_SAFE_INTEGER;
    const now = Date.now();
    for (const g of goals) {
      const days = Math.ceil((g.dueAt - now) / (24 * 3600 * 1000));
      if (days < nearestDday) nearestDday = days;
    }
    return { nearestDday };
  }, [goals]);

  return (
    <div className="rounded-md bg-paper-page border border-paper-ruled px-5 py-3.5 flex items-center gap-6 shadow-paper-sm">
      <div>
        <div className="text-[10.5px] text-ink-muted mb-0.5 uppercase tracking-wider">진행 중</div>
        <div className="font-display text-[20px] font-semibold text-ink tabular-nums">{goals.length}<span className="text-[12px] text-ink-light ml-0.5">가지</span></div>
      </div>
      <div className="w-px h-9 bg-paper-rule2" />
      <div>
        <div className="text-[10.5px] text-ink-muted mb-0.5 uppercase tracking-wider">가장 가까운 마감</div>
        <div className="font-display text-[20px] font-semibold text-ink tabular-nums">
          {stats.nearestDday === null ? '—' : stats.nearestDday < 0 ? '지남' : `D-${stats.nearestDday}`}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// GoalCard
// ──────────────────────────────────────────
function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const prog = useGoalProgress(goal.id);
  const meta = CATEGORY_META[goal.category];
  const days = Math.ceil((goal.dueAt - Date.now()) / (24 * 3600 * 1000));
  const ddayTone =
    days < 0 ? 'text-ink-faint' :
    days <= 1 ? 'text-stamp-red font-semibold' :
    days <= 7 ? 'text-stamp-gold font-semibold' :
    'text-ink-muted';

  const pct = Math.round(prog.progress * 100);

  return (
    <button
      onClick={onClick}
      className="relative text-left rounded-md bg-paper-page border border-paper-ruled hover:border-paper-rule2 hover:-translate-y-0.5 transition-all duration-200 p-4 group overflow-hidden shadow-paper-sm hover:shadow-paper"
    >
      <div className="flex items-start gap-3">
        <span className="text-[26px] leading-none mt-0.5">{goal.emoji || meta.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-semibold text-ink leading-snug tracking-tight truncate">
            {goal.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-[10.5px]">
            <span className="text-ink-muted">
              {meta.emoji} {meta.label}
            </span>
            <span className="text-paper-rule2">·</span>
            <span className={ddayTone}>
              {days < 0 ? `지난 ${-days}일` : `D-${days}`}
            </span>
          </div>
        </div>
      </div>

      {/* 진척바 — 단색 잉크 청, 그라데이션 X */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10.5px] text-ink-muted uppercase tracking-wider">진척</span>
          <span className="font-display text-[18px] font-semibold text-ink tabular-nums leading-none">{pct}<span className="text-[11px] text-ink-light ml-0.5">%</span></span>
        </div>
        <div className="h-1.5 rounded-sm bg-paper-cream border border-paper-ruled overflow-hidden">
          <div
            className="h-full bg-stamp-blue transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 메트릭 */}
      <div className="mt-2 text-[10.5px] text-ink-muted flex items-center gap-1.5">
        {goal.metric.kind === 'count' ? (
          <span className="tabular-nums">{prog.doneTasks} / {goal.metric.target}</span>
        ) : (
          <span>수동 슬라이더</span>
        )}
        {prog.habitsCount > 0 && (
          <>
            <span className="text-paper-rule2">·</span>
            <span>습관 {prog.habitsCount}개 (30일 {Math.round(prog.avgHabitRate30d * 100)}%)</span>
          </>
        )}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────
// GoalCreateModal
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
    <ModalShell onClose={onClose} title="새 목표">
      <div className="space-y-5">
        <Field label="제목">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
            placeholder="예: 책 12권 읽기"
            className="w-full rounded-md bg-paper-page border border-paper-ruled px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint outline-none focus:border-stamp-blue/50 focus:bg-paper-cream/50 transition-colors"
          />
        </Field>

        <Field label="카테고리">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <ChipBtn key={cat} active={active} onClick={() => setCategory(cat)}>
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </ChipBtn>
              );
            })}
          </div>
        </Field>

        <Field label="측정 방식">
          <div className="flex gap-2">
            <SegBtn active={metricKind === 'count'} onClick={() => setMetricKind('count')}>N개 달성</SegBtn>
            <SegBtn active={metricKind === 'percent'} onClick={() => setMetricKind('percent')}>0-100% 슬라이더</SegBtn>
          </div>
          {metricKind === 'count' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11.5px] text-ink-light">목표 개수</span>
              <input
                type="number"
                value={target}
                min={1}
                max={9999}
                onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-20 rounded-md bg-paper-page border border-paper-ruled px-2 py-1 text-[12px] tabular-nums outline-none focus:border-stamp-blue/50"
              />
              <div className="flex gap-1">
                {[10, 30, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTarget(v)}
                    className="text-[10.5px] px-1.5 py-0.5 rounded border border-paper-ruled text-ink-muted hover:border-stamp-blue/40 hover:text-ink-light"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>

        <Field label="마감일">
          <div className="flex gap-1.5">
            {[30, 90, 180, 365].map((d) => (
              <SegBtn key={d} active={dueDays === d} onClick={() => setDueDays(d)} small>
                {d === 30 ? '한 달' : d === 90 ? '분기' : d === 180 ? '반년' : '1년'}
              </SegBtn>
            ))}
          </div>
        </Field>
      </div>

      <ModalFooter>
        <FooterCancel onClick={onClose}>취소</FooterCancel>
        <FooterPrimary onClick={submit} disabled={!title.trim()}>만들기</FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// GoalDecomposeModal
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
    <ModalShell onClose={onClose} title={`"${goal.title}" 시작 도우미`} subtitle="추천 항목을 체크하면 함께 추가됩니다">
      <div className="space-y-5">
        <div>
          <h4 className="font-display text-[12px] font-semibold text-ink-light mb-2 uppercase tracking-wider">
            🌱 추천 습관
          </h4>
          <div className="space-y-1.5">
            {tpl.habits.map((h, i) => (
              <DecomposeRow
                key={i}
                checked={habitChecks[i]}
                onToggle={() => setHabitChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
              >
                <span className="text-[16px]">{h.emoji}</span>
                <span className="text-[12.5px] text-ink flex-1">{h.title}</span>
                {h.scheduleAt && (
                  <span className="text-[10.5px] text-ink-muted font-mono tabular-nums">
                    {String(h.scheduleAt.hour).padStart(2, '0')}:{String(h.scheduleAt.min).padStart(2, '0')}
                  </span>
                )}
              </DecomposeRow>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-[12px] font-semibold text-ink-light mb-2 uppercase tracking-wider">
            ✅ 추천 할 일
          </h4>
          <div className="space-y-1.5">
            {tpl.tasks.map((t, i) => (
              <DecomposeRow
                key={i}
                checked={taskChecks[i]}
                onToggle={() => setTaskChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
              >
                <span className="text-[12.5px] text-ink flex-1">{t.title}</span>
              </DecomposeRow>
            ))}
          </div>
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
    <label
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-all',
        checked
          ? 'bg-paper-cream border-stamp-blue/40'
          : 'bg-paper-page border-paper-ruled hover:border-paper-rule2',
      )}
    >
      <span
        className={cn(
          'w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all',
          checked ? 'bg-stamp-blue border-stamp-blue' : 'border-paper-rule2',
        )}
      >
        {checked && <Check className="w-3 h-3 text-paper-page" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      {children}
    </label>
  );
}

// ──────────────────────────────────────────
// GoalDetailModal
// ──────────────────────────────────────────
function GoalDetailModal({
  goal, onClose, onDeleted,
}: { goal: Goal; onClose: () => void; onDeleted: () => void }) {
  const allTasks = useTasks();
  const allHabits = useHabits();
  const prog = useGoalProgress(goal.id);
  const tasks = allTasks.filter((t) => t.goalId === goal.id);
  const habits = allHabits.filter((h) => h.goalId === goal.id && !h.archivedAt);
  const meta = CATEGORY_META[goal.category];
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
    if (!window.confirm(`"${goal.title}" 목표를 지울까요? 연결된 할 일·습관은 그대로 남고 연결만 풀립니다.`)) return;
    removeGoalCascade(goal.id);
    onDeleted();
  };

  const handleArchive = () => {
    updateGoal(goal.id, { status: 'archived' });
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      title={goal.title}
      subtitle={`${meta.emoji} ${meta.label} · 마감 ${formatKst(goal.dueAt)}`}
    >
      <div className="space-y-6">
        {/* 진척바 */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] text-ink-muted uppercase tracking-wider">진척</span>
            <span className="font-display text-[26px] font-semibold text-ink tabular-nums leading-none">
              {pct}<span className="text-[14px] text-ink-light ml-0.5">%</span>
            </span>
          </div>
          <div className="h-2 rounded-sm bg-paper-cream border border-paper-ruled overflow-hidden">
            <div
              className="h-full bg-stamp-blue transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {goal.metric.kind === 'percent' && (
            <input
              type="range"
              min={0}
              max={100}
              value={percentVal}
              onChange={(e) => handlePercentChange(parseInt(e.target.value, 10))}
              className="w-full mt-3 accent-stamp-blue"
            />
          )}
        </div>

        {/* 연결 task */}
        <div>
          <h4 className="font-display text-[12px] font-semibold text-ink-light mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>✅ 연결된 할 일 · {prog.doneTasks}/{tasks.length}</span>
          </h4>
          {tasks.length === 0 ? (
            <p className="text-[11.5px] text-ink-muted italic">아직 없음</p>
          ) : (
            <div className="space-y-1">{tasks.map((t) => (<TaskLine key={t.id} task={t} />))}</div>
          )}
        </div>

        {/* 연결 habit */}
        <div>
          <h4 className="font-display text-[12px] font-semibold text-ink-light mb-2 uppercase tracking-wider">
            🌱 연결된 습관 · {habits.length}개 (30일 평균 {Math.round(prog.avgHabitRate30d * 100)}%)
          </h4>
          {habits.length === 0 ? (
            <p className="text-[11.5px] text-ink-muted italic">아직 없음</p>
          ) : (
            <div className="space-y-1">{habits.map((h) => (<HabitLine key={h.id} habit={h} />))}</div>
          )}
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={handleDelete}
          className="text-[12px] text-stamp-red hover:opacity-70 font-medium inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          지우기
        </button>
        <button
          onClick={handleArchive}
          className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-paper-ruled text-ink-light hover:bg-paper-cream"
        >
          보관함으로
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function TaskLine({ task }: { task: Task }) {
  const handleToggle = () => {
    toggleTaskDone(task.id);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (getTask(task.id)) removeTask(task.id);
  };
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-paper-cream/60 border border-paper-ruled/60">
      {/* 도장 스탬프 체크박스 */}
      <button
        onClick={handleToggle}
        className={cn(
          'relative w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          task.done
            ? 'bg-stamp-red border-stamp-red rotate-[-3deg]'
            : 'border-paper-rule2 hover:border-stamp-blue/50',
        )}
      >
        {task.done && <Check className="w-3 h-3 text-paper-page" strokeWidth={3} />}
      </button>
      <span className={cn('text-[12px] flex-1', task.done ? 'text-ink-muted line-through decoration-stamp-red/60' : 'text-ink')}>
        {task.title}
      </span>
      <button onClick={handleDelete} className="text-ink-faint hover:text-stamp-red" aria-label="지우기">
        <X className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function HabitLine({ habit }: { habit: Habit }) {
  const cells: Array<{ day: string; done: boolean }> = [];
  const now = Date.now();
  const day = (offset: number) => {
    const d = new Date(now - offset * 86400000 + 9 * 3600 * 1000);
    if (d.getUTCHours() < 3) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  for (let i = 29; i >= 0; i--) {
    const k = day(i);
    cells.push({ day: k, done: !!habit.history[k] });
  }

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-paper-cream/60 border border-paper-ruled/60">
      <span className="text-[14px]">{habit.emoji || '🌱'}</span>
      <span className="text-[12px] text-ink flex-1 truncate">{habit.title}</span>
      <div className="flex gap-[2px]">
        {cells.map((c, i) => (
          <span
            key={i}
            title={`${c.day} ${c.done ? '✓' : '·'}`}
            className={cn(
              'w-1.5 h-3 rounded-[1px]',
              c.done ? 'bg-stamp-sage' : 'bg-paper-ruled',
            )}
          />
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
    <div>
      <label className="text-[11px] font-semibold text-ink-light block mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ChipBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors',
        active
          ? 'bg-paper-cream text-stamp-blue border-stamp-blue/50'
          : 'bg-paper-page text-ink-light border-paper-ruled hover:border-paper-rule2',
      )}
    >
      {children}
    </button>
  );
}

function SegBtn({
  active, onClick, children, small,
}: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md font-medium border transition-colors',
        small ? 'px-3 py-1.5 text-[12px]' : 'flex-1 px-3 py-2 text-[12.5px]',
        active
          ? 'bg-paper-cream text-stamp-blue border-stamp-blue/50'
          : 'bg-paper-page text-ink-light border-paper-ruled hover:border-paper-rule2',
      )}
    >
      {children}
    </button>
  );
}

function ModalShell({
  onClose, title, subtitle, children,
}: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] rounded-md bg-paper-page border border-paper-rule2 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-paper-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-paper-ruled flex items-start gap-3 bg-paper-cream/30">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[16px] font-semibold text-ink truncate tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11.5px] text-ink-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-paper-cream flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 px-5 py-3 border-t border-paper-ruled bg-paper-cream/40 flex items-center justify-between gap-3 -mx-5 -mb-5 mt-6">
      {children}
    </div>
  );
}

function FooterCancel({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[12.5px] text-ink-muted hover:text-ink-light font-medium">
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
      className="px-4 py-2 rounded-md bg-stamp-blue text-paper-page text-[13px] font-semibold hover:bg-[#163756] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-paper-sm"
    >
      {children}
    </button>
  );
}

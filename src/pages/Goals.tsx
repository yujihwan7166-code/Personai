/**
 * 🎯 Goals — 목표 관리 페이지 (Phase 1.1)
 *
 * 카드 그리드 + 진척바(자동 계산) + 분해 도우미 + 카드 클릭 모달.
 * 데이터 의존: Phase 0 (planner store + selector).
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
    <div className="min-h-screen bg-slate-50">
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-[920px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800 leading-tight">🎯 목표</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">분기·연간 목표를 추적합니다 · 활성 {activeGoals.length}{archivedCount > 0 ? ` · 보관 ${archivedCount}` : ''}</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
          >
            <Plus className="w-3.5 h-3.5" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
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
// EmptyState
// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-[18px] font-bold text-slate-800 mb-2">첫 분기 목표를 만들어볼까요</h2>
      <p className="text-[13px] text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
        목표 1개만 정해도, 연결할 습관·할 일이 자동으로 추천됩니다. 진척률은 알아서 계산돼요.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11.5px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all"
      >
        <Plus className="w-4 h-4" />
        목표 만들기
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// SummaryBar — 분기 D-day + 평균 진척
// ──────────────────────────────────────────
function SummaryBar({ goals }: { goals: Goal[] }) {
  const stats = useMemo(() => {
    if (goals.length === 0) return { avgProgress: 0, nearestDday: null as null | number };
    let progressSum = 0;
    let nearestDday = Number.MAX_SAFE_INTEGER;
    const now = Date.now();
    for (const g of goals) {
      // progress 는 hook 안에서 계산, summary 는 단순 평균
      progressSum += 0; // 하단 카드들이 hook 으로 자체 계산하므로 여기선 placeholder
      const days = Math.ceil((g.dueAt - now) / (24 * 3600 * 1000));
      if (days < nearestDday) nearestDday = days;
    }
    return { avgProgress: progressSum / goals.length, nearestDday };
  }, [goals]);

  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/60 border border-slate-100 px-4 py-3 flex items-center gap-4">
      <div className="text-[11px]">
        <div className="text-slate-400 mb-0.5">활성 목표</div>
        <div className="text-[16px] font-bold text-slate-800">{goals.length}개</div>
      </div>
      <div className="w-px h-8 bg-slate-200" />
      <div className="text-[11px]">
        <div className="text-slate-400 mb-0.5">가장 가까운 마감</div>
        <div className="text-[16px] font-bold text-slate-800">
          {stats.nearestDday === null ? '—' : stats.nearestDday < 0 ? '지남' : `D-${stats.nearestDday}`}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// GoalCard — 카드 1장
// ──────────────────────────────────────────
function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const prog = useGoalProgress(goal.id);
  const meta = CATEGORY_META[goal.category];
  const days = Math.ceil((goal.dueAt - Date.now()) / (24 * 3600 * 1000));
  const ddayTone =
    days < 0 ? 'text-slate-400' :
    days <= 1 ? 'text-rose-600 bg-rose-50' :
    days <= 7 ? 'text-amber-700 bg-amber-50' :
    'text-slate-500';

  const pct = Math.round(prog.progress * 100);

  return (
    <button
      onClick={onClick}
      className="relative text-left rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 p-4 group overflow-hidden"
    >
      {/* 좌측 카테고리 띠 */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: meta.color, opacity: 0.6 }} />

      <div className="flex items-start gap-2.5">
        <span className="text-[24px] leading-none mt-0.5">{goal.emoji || meta.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight truncate">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-medium">
              {meta.emoji} {meta.label}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded font-medium', ddayTone)}>
              {days < 0 ? `지난 ${-days}일` : `D-${days}`}
            </span>
          </div>
        </div>
      </div>

      {/* 진척바 */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10.5px] text-slate-500">진척</span>
          <span className="text-[14px] font-bold text-slate-800 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 메트릭 */}
      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
        {goal.metric.kind === 'count' ? (
          <span>{prog.doneTasks} / {goal.metric.target} 항목</span>
        ) : (
          <span>수동 진척 (slider)</span>
        )}
        {prog.habitsCount > 0 && (
          <>
            <span>·</span>
            <span>습관 {prog.habitsCount}개 · 30일 {Math.round(prog.avgHabitRate30d * 100)}%</span>
          </>
        )}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────
// GoalCreateModal — 신규 등록
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
      <div className="space-y-4">
        {/* 제목 */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">제목</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
            placeholder="예: 책 12권 읽기"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">카테고리</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all',
                    active
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200',
                  )}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 측정 방식 */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">측정 방식</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => setMetricKind('count')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all',
                metricKind === 'count'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-white text-slate-600 border-slate-200',
              )}
            >
              N개 달성
            </button>
            <button
              onClick={() => setMetricKind('percent')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all',
                metricKind === 'percent'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-white text-slate-600 border-slate-200',
              )}
            >
              0-100% 슬라이더
            </button>
          </div>
          {metricKind === 'count' && (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11px] text-slate-500">목표 개수</label>
              <input
                type="number"
                value={target}
                min={1}
                max={9999}
                onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-indigo-300"
              />
              <div className="flex gap-1">
                {[10, 30, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTarget(v)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 마감일 */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">마감일</label>
          <div className="flex gap-1">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDueDays(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all',
                  dueDays === d
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200',
                )}
              >
                {d === 30 ? '한 달' : d === 90 ? '분기' : d === 180 ? '반년' : '1년'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ModalFooter>
        <button onClick={onClose} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium">
          취소
        </button>
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
        >
          만들기
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// GoalDecomposeModal — 등록 직후 분해 도우미
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
    <ModalShell onClose={onClose} title={`"${goal.title}" 분해 도우미`} subtitle="추천 항목을 체크하면 함께 추가됩니다">
      <div className="space-y-4">
        {/* 추천 습관 */}
        <div>
          <h4 className="text-[11.5px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            🌱 추천 습관
          </h4>
          <div className="space-y-1.5">
            {tpl.habits.map((h, i) => (
              <label
                key={i}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all',
                  habitChecks[i]
                    ? 'bg-indigo-50/40 border-indigo-300'
                    : 'bg-white border-slate-200 hover:border-indigo-200',
                )}
              >
                <input
                  type="checkbox"
                  checked={habitChecks[i]}
                  onChange={() => setHabitChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-[16px]">{h.emoji}</span>
                <span className="text-[12px] font-medium text-slate-700 flex-1">{h.title}</span>
                {h.scheduleAt && (
                  <span className="text-[10px] text-slate-400">
                    {String(h.scheduleAt.hour).padStart(2, '0')}:{String(h.scheduleAt.min).padStart(2, '0')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 추천 할 일 */}
        <div>
          <h4 className="text-[11.5px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            ✅ 추천 할 일
          </h4>
          <div className="space-y-1.5">
            {tpl.tasks.map((t, i) => (
              <label
                key={i}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all',
                  taskChecks[i]
                    ? 'bg-indigo-50/40 border-indigo-300'
                    : 'bg-white border-slate-200 hover:border-indigo-200',
                )}
              >
                <input
                  type="checkbox"
                  checked={taskChecks[i]}
                  onChange={() => setTaskChecks((arr) => arr.map((v, j) => (j === i ? !v : v)))}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-[12px] font-medium text-slate-700 flex-1">{t.title}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <ModalFooter>
        <button onClick={onClose} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium">
          건너뛰기
        </button>
        <button
          onClick={submit}
          disabled={checkedCount === 0}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
        >
          {checkedCount > 0 ? `${checkedCount}개 추가` : '항목 선택'}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// GoalDetailModal — 카드 클릭 시
// ──────────────────────────────────────────
function GoalDetailModal({
  goal,
  onClose,
  onDeleted,
}: {
  goal: Goal;
  onClose: () => void;
  onDeleted: () => void;
}) {
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
    if (!window.confirm(`"${goal.title}" 목표를 삭제할까요? 연결된 할 일·습관은 유지되고 연결만 해제됩니다.`)) return;
    removeGoalCascade(goal.id);
    onDeleted();
  };

  const handleArchive = () => {
    updateGoal(goal.id, { status: 'archived' });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title={goal.title} subtitle={`${meta.emoji} ${meta.label} · 마감 ${formatKst(goal.dueAt)}`}>
      <div className="space-y-5">
        {/* 진척바 */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[11.5px] font-bold text-slate-700">진척</span>
            <span className="text-[20px] font-bold text-slate-800 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-500"
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
              className="w-full mt-2 accent-indigo-500"
            />
          )}
        </div>

        {/* 연결 task */}
        <div>
          <h4 className="text-[11.5px] font-bold text-slate-700 mb-2 flex items-center justify-between">
            <span>✅ 연결된 할 일 · {prog.doneTasks}/{tasks.length}</span>
          </h4>
          {tasks.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">아직 없음</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>

        {/* 연결 habit */}
        <div>
          <h4 className="text-[11.5px] font-bold text-slate-700 mb-2">
            🌱 연결된 습관 · {habits.length}개 (30일 평균 {Math.round(prog.avgHabitRate30d * 100)}%)
          </h4>
          {habits.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">아직 없음</p>
          ) : (
            <div className="space-y-1">
              {habits.map((h) => (
                <HabitRow key={h.id} habit={h} />
              ))}
            </div>
          )}
        </div>
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
          onClick={handleArchive}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          보관
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function TaskRow({ task }: { task: Task }) {
  const handleToggle = () => {
    toggleTaskDone(task.id);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (getTask(task.id)) removeTask(task.id);
  };
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/60">
      <button
        onClick={handleToggle}
        className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
          task.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400',
        )}
      >
        {task.done && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
      <span className={cn('text-[11.5px] flex-1', task.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
        {task.title}
      </span>
      <button onClick={handleDelete} className="text-slate-300 hover:text-rose-500" aria-label="삭제">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function HabitRow({ habit }: { habit: Habit }) {
  // habit 의 30일 미니 잔디 (cell 30개)
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
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/60">
      <span className="text-[14px]">{habit.emoji || '🌱'}</span>
      <span className="text-[11.5px] text-slate-700 flex-1 truncate">{habit.title}</span>
      <div className="flex gap-[1.5px]">
        {cells.map((c, i) => (
          <span
            key={i}
            title={`${c.day} ${c.done ? '✓' : '·'}`}
            className={cn(
              'w-1.5 h-3 rounded-sm',
              c.done ? 'bg-emerald-400' : 'bg-slate-200',
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 공용 모달 셸
// ──────────────────────────────────────────
function ModalShell({
  onClose,
  title,
  subtitle,
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-slate-800 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
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

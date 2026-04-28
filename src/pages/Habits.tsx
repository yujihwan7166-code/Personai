/**
 * 🌱 Habits — 습관·루틴 페이지 (Phase 1.2)
 *
 * 리스트 행: emoji + 제목 + 30일 잔디 + 현재 streak.
 * 행 클릭 → 365일 잔디 + 편집 + 삭제 모달.
 * 마일스톤 토스트: 30/100/365일 도달 시 한 줄 축하.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  useHabits, addHabit, updateHabit, toggleHabitDay,
  archiveHabit, unarchiveHabit, removeHabit,
  useGoals,
  useHabitStreak,
  computeCurrentStreak,
  todayKey, dayKeyBefore, matchesCadence,
  type Habit, type HabitCadence, type ID,
} from '@/lib/planner';

const Habits = () => {
  const navigate = useNavigate();
  const habits = useHabits();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = habits.filter((h) => !h.archivedAt);
  const archived = habits.filter((h) => !!h.archivedAt);
  const visible = showArchived ? archived : active;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
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
            <h1 className="text-[16px] font-bold text-slate-800 leading-tight">🌱 습관·루틴</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              매일 작은 반복으로 큰 변화 · 활성 {active.length}{archived.length > 0 ? ` · 보관 ${archived.length}` : ''}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-3.5 h-3.5" />
            새 습관
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-[920px] mx-auto px-5 py-6">
        {active.length === 0 && !showArchived ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <>
            {archived.length > 0 && (
              <div className="flex items-center justify-end mb-2">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
                >
                  {showArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                  {showArchived ? '활성 보기' : `보관 ${archived.length}개 보기`}
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              {visible.map((h) => (
                <HabitRow key={h.id} habit={h} onClick={() => setDetailFor(h)} />
              ))}
            </div>
            {visible.length === 0 && showArchived && (
              <p className="text-center text-[12px] text-slate-400 py-12">보관된 습관이 없어요</p>
            )}
          </>
        )}
      </main>

      {/* 모달 */}
      {createOpen && <HabitCreateModal onClose={() => setCreateOpen(false)} />}
      {detailFor && (
        <HabitDetailModal
          habit={detailFor}
          onClose={() => setDetailFor(null)}
        />
      )}
    </div>
  );
};

export default Habits;

// ──────────────────────────────────────────
// EmptyState
// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const suggestions = [
    { emoji: '📖', label: '독서' },
    { emoji: '💪', label: '운동' },
    { emoji: '🧘', label: '명상' },
    { emoji: '💧', label: '물 마시기' },
    { emoji: '✏️', label: '일기' },
  ];
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🌱</div>
      <h2 className="text-[18px] font-bold text-slate-800 mb-2">매일 작은 반복을 시작해볼까요</h2>
      <p className="text-[13px] text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
        하루 한 가지만 꾸준히. 30일 후엔 잔디가 가득 차 있어요.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11.5px] font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all"
      >
        <Plus className="w-4 h-4" />
        습관 만들기
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// HabitRow — 메인 리스트
// ──────────────────────────────────────────
function HabitRow({ habit, onClick }: { habit: Habit; onClick: () => void }) {
  const streak = useHabitStreak(habit.id);
  const today = todayKey();
  const isCadenceToday = matchesCadence(habit.cadence, today);
  const doneToday = !!habit.history[today];

  // 30일 잔디
  const cells = useMemo(() => {
    const arr: { day: string; done: boolean; isCadence: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayKeyBefore(i);
      arr.push({
        day: d,
        done: !!habit.history[d],
        isCadence: matchesCadence(habit.cadence, d),
      });
    }
    return arr;
  }, [habit.history, habit.cadence]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasDone = doneToday;
    toggleHabitDay(habit.id, today);
    // 마일스톤 토스트 — 도달 시 한 번만
    if (!wasDone) {
      // 토글 후 streak 다시 계산 (store 갱신 후 idempotent 함수 호출)
      const nextHabit = { ...habit, history: { ...habit.history, [today]: true as const } };
      const newStreak = computeCurrentStreak(nextHabit);
      if (newStreak === 30) notify.success(`🔥 30일 연속! "${habit.title}"`);
      else if (newStreak === 100) notify.success(`💯 100일 달성! "${habit.title}"`);
      else if (newStreak === 365) notify.success(`🏆 1년 완주! "${habit.title}"`);
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
    >
      {/* 오늘 체크 박스 */}
      <span
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (e.target as HTMLElement).click();
          }
        }}
        title={isCadenceToday ? (doneToday ? '오늘 완료됨' : '오늘 체크') : '오늘은 cadence 비대상'}
        className={cn(
          'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[16px] transition-all',
          !isCadenceToday && 'opacity-30',
          doneToday
            ? 'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)]'
            : 'bg-slate-50 hover:bg-emerald-50 border border-slate-200',
        )}
      >
        {habit.emoji || (doneToday ? '✓' : '')}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-slate-800 truncate">{habit.title}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {cadenceLabel(habit.cadence)}
          {habit.scheduleAt && (
            <> · {String(habit.scheduleAt.hour).padStart(2, '0')}:{String(habit.scheduleAt.min).padStart(2, '0')}</>
          )}
        </div>
      </div>

      {/* 30일 잔디 */}
      <div className="flex gap-[2px] shrink-0" aria-label="최근 30일">
        {cells.map((c, i) => (
          <span
            key={i}
            title={`${c.day} ${c.done ? '✓' : c.isCadence ? '·' : '–'}`}
            className={cn(
              'w-1.5 h-5 rounded-sm',
              c.done ? 'bg-emerald-400' : c.isCadence ? 'bg-slate-200' : 'bg-slate-100',
            )}
          />
        ))}
      </div>

      {/* streak */}
      <div className="shrink-0 text-right">
        <div className="text-[16px] font-extrabold text-slate-800 tabular-nums leading-none">
          {streak.current}
        </div>
        <div className="text-[9px] text-slate-400 mt-0.5">일 연속</div>
      </div>
    </button>
  );
}

function cadenceLabel(c: HabitCadence): string {
  if (c.kind === 'daily') return '매일';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return c.days.map((d) => names[d]).join('·');
}

// ──────────────────────────────────────────
// HabitCreateModal
// ──────────────────────────────────────────
function HabitCreateModal({ onClose }: { onClose: () => void }) {
  const goals = useGoals().filter((g) => g.status === 'active');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🌱');
  const [cadenceKind, setCadenceKind] = useState<'daily' | 'weekly'>('daily');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 3, 5]);
  const [hasTime, setHasTime] = useState(false);
  const [hour, setHour] = useState(8);
  const [min, setMin] = useState(0);
  const [goalId, setGoalId] = useState<ID | undefined>(undefined);

  const submit = () => {
    if (!title.trim()) return;
    const cadence: HabitCadence =
      cadenceKind === 'daily' ? { kind: 'daily' } : { kind: 'weekly', days: weeklyDays };
    addHabit({
      title: title.trim(),
      emoji,
      cadence,
      scheduleAt: hasTime ? { hour, min } : undefined,
      goalId,
    });
    notify.success('습관 추가됨');
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title="새 습관">
      <div className="space-y-4">
        {/* emoji + 제목 */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">제목</label>
          <div className="flex gap-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              className="w-12 text-center rounded-lg border border-slate-200 px-2 py-2 text-[18px] outline-none focus:border-indigo-300"
              aria-label="이모지"
            />
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
              placeholder="예: 매일 30분 독서"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* cadence */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">반복</label>
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setCadenceKind('daily')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all',
                cadenceKind === 'daily'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200',
              )}
            >
              매일
            </button>
            <button
              onClick={() => setCadenceKind('weekly')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all',
                cadenceKind === 'weekly'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200',
              )}
            >
              요일 지정
            </button>
          </div>
          {cadenceKind === 'weekly' && (
            <div className="flex gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((label, i) => {
                const active = weeklyDays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => setWeeklyDays((arr) =>
                      active ? arr.filter((x) => x !== i) : [...arr, i].sort()
                    )}
                    className={cn(
                      'flex-1 py-1.5 rounded text-[11px] font-medium border transition-all',
                      active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 시간 */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
              className="accent-emerald-500"
            />
            시간 지정 (캘린더 자동 표시)
          </label>
          {hasTime && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10))))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-[12px] tabular-nums text-center outline-none focus:border-emerald-300"
              />
              <span className="text-slate-400">:</span>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={min}
                onChange={(e) => setMin(Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10))))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-[12px] tabular-nums text-center outline-none focus:border-emerald-300"
              />
            </div>
          )}
        </div>

        {/* 목표 연결 */}
        {goals.length > 0 && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">목표 연결 (선택)</label>
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
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                    goalId === g.id
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200',
                  )}
                >
                  <span>{g.emoji || '🎯'}</span>
                  <span className="truncate max-w-[140px]">{g.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button onClick={onClose} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium">
          취소
        </button>
        <button
          onClick={submit}
          disabled={!title.trim() || (cadenceKind === 'weekly' && weeklyDays.length === 0)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
        >
          만들기
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// HabitDetailModal — 365일 잔디 + 편집
// ──────────────────────────────────────────
function HabitDetailModal({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const streak = useHabitStreak(habit.id);
  const goals = useGoals();
  const linkedGoal = habit.goalId ? goals.find((g) => g.id === habit.goalId) : null;

  // 365일 잔디 (53주 × 7일)
  const grid = useMemo(() => {
    const out: { day: string; done: boolean; isCadence: boolean }[][] = [];
    let week: { day: string; done: boolean; isCadence: boolean }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = dayKeyBefore(i);
      week.push({
        day: d,
        done: !!habit.history[d],
        isCadence: matchesCadence(habit.cadence, d),
      });
      if (week.length === 7) {
        out.push(week);
        week = [];
      }
    }
    if (week.length > 0) out.push(week);
    return out;
  }, [habit.history, habit.cadence]);

  const totalDone = Object.keys(habit.history).length;

  const handleDelete = () => {
    if (!window.confirm(`"${habit.title}" 습관을 삭제할까요? 기록도 함께 사라집니다.`)) return;
    removeHabit(habit.id);
    onClose();
  };

  const handleToggleArchive = () => {
    if (habit.archivedAt) unarchiveHabit(habit.id);
    else archiveHabit(habit.id);
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      title={`${habit.emoji || '🌱'} ${habit.title}`}
      subtitle={`${cadenceLabel(habit.cadence)}${habit.scheduleAt ? ` · ${String(habit.scheduleAt.hour).padStart(2, '0')}:${String(habit.scheduleAt.min).padStart(2, '0')}` : ''}${linkedGoal ? ` · 🎯 ${linkedGoal.title}` : ''}`}
    >
      <div className="space-y-5">
        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="현재 streak" value={streak.current} suffix="일" tone="emerald" />
          <Stat label="30일 율" value={Math.round(streak.rate30d * 100)} suffix="%" />
          <Stat label="총 완료" value={totalDone} suffix="일" />
        </div>

        {/* 365일 잔디 */}
        <div>
          <h4 className="text-[11.5px] font-bold text-slate-700 mb-2">최근 1년</h4>
          <div className="flex gap-[2px] overflow-x-auto py-1">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((c, di) => (
                  <span
                    key={di}
                    title={`${c.day} ${c.done ? '✓' : c.isCadence ? '·' : '–'}`}
                    className={cn(
                      'w-2 h-2 rounded-sm',
                      c.done ? 'bg-emerald-400' : c.isCadence ? 'bg-slate-200' : 'bg-slate-100',
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[9.5px] text-slate-400">
            <span>적음</span>
            <span className="w-2 h-2 rounded-sm bg-slate-200" />
            <span className="w-2 h-2 rounded-sm bg-emerald-200" />
            <span className="w-2 h-2 rounded-sm bg-emerald-400" />
            <span>많음</span>
          </div>
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
          onClick={handleToggleArchive}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center gap-1"
        >
          {habit.archivedAt ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
          {habit.archivedAt ? '복원' : '보관'}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix: string; tone?: 'emerald' }) {
  return (
    <div className={cn(
      'rounded-xl border px-3 py-2.5',
      tone === 'emerald' ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/60 border-slate-200',
    )}>
      <div className="text-[9px] text-slate-500 mb-0.5">{label}</div>
      <div className="text-[18px] font-extrabold text-slate-800 tabular-nums leading-none">
        {value}<span className="text-[11px] font-medium text-slate-400 ml-0.5">{suffix}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 공용 모달 셸 (Goals 와 동일 패턴)
// ──────────────────────────────────────────
function ModalShell({
  onClose, title, subtitle, children,
}: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
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
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
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

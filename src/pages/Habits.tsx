/**
 * Habits — 잔디가 시각 중심 (행 위주)
 * 시스템 emoji X · 사용자 입력 emoji 만 작게.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  useHabits, addHabit, toggleHabitDay,
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
    <div className="min-h-screen bg-pln-base">
      <header className="border-b border-pln-line bg-pln-base">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-plnk-muted hover:text-plnk-DEFAULT"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">습관</span>
          <div className="flex-1" />
          {archived.length > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[11px] text-plnk-muted hover:text-plnk-DEFAULT"
            >
              {showArchived ? '활성 보기' : `보관함 ${archived.length}`}
            </button>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT hover:opacity-70"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} /> 새 습관
          </button>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-[40px] sm:text-[44px] font-semibold text-plnk-DEFAULT leading-[1.1] tracking-[-0.02em]">
            매일 작은 반복
          </h1>
          <p className="mt-3 text-[14px] text-plnk-muted">
            {active.length === 0
              ? '하루 한 가지부터.'
              : `${active.length}가지 진행 중`}
          </p>
        </div>

        {active.length === 0 && !showArchived ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="border-y border-pln-line">
            {visible.map((h) => (
              <HabitRow key={h.id} habit={h} onClick={() => setDetailFor(h)} />
            ))}
            {visible.length === 0 && showArchived && (
              <p className="text-center text-[12px] text-plnk-faint py-12">보관된 습관이 없어요</p>
            )}
          </div>
        )}
      </main>

      {createOpen && <HabitCreateModal onClose={() => setCreateOpen(false)} />}
      {detailFor && (
        <HabitDetailModal habit={detailFor} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
};

export default Habits;

// ──────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-t border-b border-pln-line py-20 text-center">
      <p className="font-display text-[22px] text-plnk-DEFAULT mb-2 tracking-tight">
        반복할 한 가지를 정해요.
      </p>
      <p className="text-[13px] text-plnk-muted mb-8 max-w-md mx-auto">
        30일 후 누적된 잔디가 곧 변화의 흔적이에요.
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
function HabitRow({ habit, onClick }: { habit: Habit; onClick: () => void }) {
  const streak = useHabitStreak(habit.id);
  const today = todayKey();
  const isCadenceToday = matchesCadence(habit.cadence, today);
  const doneToday = !!habit.history[today];

  const cells = useMemo(() => {
    const arr: { done: boolean; isCadence: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayKeyBefore(i);
      arr.push({
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
    if (!wasDone) {
      const nextHabit = { ...habit, history: { ...habit.history, [today]: true as const } };
      const newStreak = computeCurrentStreak(nextHabit);
      if (newStreak === 30) notify.success(`30일 연속`);
      else if (newStreak === 100) notify.success(`100일 달성`);
      else if (newStreak === 365) notify.success(`1년 완주`);
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-5 py-4 px-1 border-b border-pln-line hover:bg-pln-card/60 transition-colors"
    >
      {/* 오늘 체크 */}
      <span
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        title={isCadenceToday ? (doneToday ? '완료' : '체크') : '오늘은 비대상'}
        className={cn(
          'w-5 h-5 border flex items-center justify-center shrink-0 transition-colors',
          !isCadenceToday && 'opacity-30',
          doneToday ? 'bg-plac-DEFAULT border-plac-DEFAULT' : 'border-pln-rule hover:border-plnk-DEFAULT',
        )}
      >
        {doneToday && <span className="block w-2 h-2 bg-pln-card" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {habit.emoji && <span className="text-[14px]">{habit.emoji}</span>}
          <span className="font-display text-[15px] font-medium text-plnk-DEFAULT truncate">
            {habit.title}
          </span>
        </div>
        <div className="text-[10.5px] font-mono text-plnk-muted mt-1 uppercase tracking-wider">
          {cadenceLabel(habit.cadence)}
          {habit.scheduleAt && (
            <> · <span className="tabular-nums normal-case tracking-normal">
              {String(habit.scheduleAt.hour).padStart(2, '0')}:{String(habit.scheduleAt.min).padStart(2, '0')}
            </span></>
          )}
        </div>
      </div>

      {/* 30일 잔디 — 시각 중심 */}
      <div className="flex gap-[2px] shrink-0">
        {cells.map((c, i) => (
          <span
            key={i}
            className={cn(
              'w-1.5 h-7',
              c.done ? 'bg-plac-DEFAULT' : c.isCadence ? 'bg-pln-line' : 'bg-pln-base',
            )}
          />
        ))}
      </div>

      <div className="shrink-0 text-right min-w-[70px]">
        <div className="font-display text-[28px] font-semibold text-plnk-DEFAULT tabular-nums leading-none">
          {streak.current}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted mt-1">
          연속
        </div>
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
    const cadence: HabitCadence =
      cadenceKind === 'daily' ? { kind: 'daily' } : { kind: 'weekly', days: weeklyDays };
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
    <ModalShell onClose={onClose} eyebrow="새 습관">
      <Field label="제목">
        <div className="flex gap-3 items-baseline border-b border-pln-rule pb-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder=""
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
        <div className="flex gap-px bg-pln-line border border-pln-line mb-3">
          <SegBtn active={cadenceKind === 'daily'} onClick={() => setCadenceKind('daily')}>매일</SegBtn>
          <SegBtn active={cadenceKind === 'weekly'} onClick={() => setCadenceKind('weekly')}>요일 지정</SegBtn>
        </div>
        {cadenceKind === 'weekly' && (
          <div className="flex gap-px bg-pln-line border border-pln-line">
            {['일', '월', '화', '수', '목', '금', '토'].map((label, i) => {
              const active = weeklyDays.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setWeeklyDays((arr) =>
                    active ? arr.filter((x) => x !== i) : [...arr, i].sort(),
                  )}
                  className={cn(
                    'flex-1 py-2 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'bg-plnk-DEFAULT text-pln-card'
                      : 'bg-pln-card text-plnk-muted hover:text-plnk-DEFAULT',
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
          <input
            type="checkbox"
            checked={hasTime}
            onChange={(e) => setHasTime(e.target.checked)}
            className="accent-plac-DEFAULT"
          />
          시간 지정 (캘린더에 자동 표시)
        </label>
        {hasTime && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10))))}
              className="w-14 bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums text-center outline-none focus:border-plac-DEFAULT"
            />
            <span className="text-plnk-muted">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              value={min}
              onChange={(e) => setMin(Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10))))}
              className="w-14 bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums text-center outline-none focus:border-plac-DEFAULT"
            />
          </div>
        )}
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
        <FooterCancel onClick={onClose}>취소</FooterCancel>
        <FooterPrimary
          onClick={submit}
          disabled={!title.trim() || (cadenceKind === 'weekly' && weeklyDays.length === 0)}
        >
          만들기
        </FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
function HabitDetailModal({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const streak = useHabitStreak(habit.id);
  const goals = useGoals();
  const linkedGoal = habit.goalId ? goals.find((g) => g.id === habit.goalId) : null;

  const grid = useMemo(() => {
    const out: { done: boolean; isCadence: boolean }[][] = [];
    let week: { done: boolean; isCadence: boolean }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = dayKeyBefore(i);
      week.push({
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
    if (!window.confirm(`"${habit.title}" 지울까요? 기록도 함께 사라집니다.`)) return;
    removeHabit(habit.id);
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      eyebrow={cadenceLabel(habit.cadence) + (habit.scheduleAt ? ` · ${String(habit.scheduleAt.hour).padStart(2, '0')}:${String(habit.scheduleAt.min).padStart(2, '0')}` : '')}
      title={habit.title}
    >
      <div className="grid grid-cols-3 gap-px bg-pln-line border border-pln-line mb-7">
        <Stat label="연속" value={streak.current} suffix="일" />
        <Stat label="30일 율" value={Math.round(streak.rate30d * 100)} suffix="%" />
        <Stat label="총 완료" value={totalDone} suffix="일" />
      </div>

      <div className="mb-2">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-3">최근 1년</h4>
        <div className="flex gap-[2px] overflow-x-auto pb-2">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((c, di) => (
                <span
                  key={di}
                  className={cn(
                    'w-2 h-2',
                    c.done ? 'bg-plac-DEFAULT' : c.isCadence ? 'bg-pln-line' : 'bg-pln-base',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {linkedGoal && (
        <p className="text-[11.5px] text-plnk-muted">연결된 목표 · {linkedGoal.title}</p>
      )}

      <ModalFooter>
        <button
          onClick={handleDelete}
          className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          지우기
        </button>
        <button
          onClick={() => {
            if (habit.archivedAt) unarchiveHabit(habit.id);
            else archiveHabit(habit.id);
            onClose();
          }}
          className="text-[12px] text-plnk-muted hover:text-plnk-DEFAULT"
        >
          {habit.archivedAt ? '복원' : '보관함으로'}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="bg-pln-card px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-plnk-muted">{label}</div>
      <div className="font-display text-[24px] font-semibold text-plnk-DEFAULT tabular-nums leading-tight mt-1">
        {value}<span className="text-[12px] text-plnk-muted ml-0.5">{suffix}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 공용 (Goals 와 동일 — 페이지마다 재정의해도 OK, 일관성 위해 동일)
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

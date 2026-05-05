/**
 * 우측 detail pane — 선택된 습관의 통계 + 월 캘린더 + 메모.
 */
import { useMemo, useState } from 'react';
import { Calendar, Edit3, Flame, MoreHorizontal, Pin, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit } from '@/types/habit';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { useHabitCheckins } from '@/hooks/planner/useHabitCheckins';
import {
  currentStreak, isScheduledOn, maxStreak, monthCheckinCount,
  nextDue, toDateKey,
} from '@/lib/planner/habitStats';
import { HabitYearHeatmap } from './HabitYearHeatmap';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HabitMonthGrid } from './HabitMonthGrid';

interface HabitDetailPaneProps {
  habit: Habit;
  onEdit: () => void;
  onArchive: () => void;
}

export const HabitDetailPane = ({ habit, onEdit, onArchive }: HabitDetailPaneProps) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const allCheckins = useHabitCheckins(habit.id);
  const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;

  const stats = useMemo(() => {
    return {
      streak: currentStreak(habit, allCheckins),
      max: maxStreak(habit, allCheckins),
      monthCount: monthCheckinCount(habit, viewYear, viewMonth, allCheckins),
    };
  }, [habit, allCheckins, viewYear, viewMonth]);

  // 다음 예정 메시지 — 오늘 미완 시 streak 위기 경고, 완 시 다음 예정.
  const todayKey = toDateKey(today);
  const todayCheckin = allCheckins.find((c) => c.date === todayKey);
  const tpd = Math.max(1, habit.schedule.timesPerDay ?? 1);
  const todayDone = todayCheckin && (todayCheckin.count ?? 0) >= tpd;
  const todayScheduled = isScheduledOn(habit, todayKey);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const next = todayDone ? nextDue(habit, toDateKey(tomorrow)) : todayScheduled ? todayKey : nextDue(habit, todayKey);
  const nextLabel = (() => {
    if (!next) return '예정 없음';
    if (next === todayKey) return '오늘';
    if (next === toDateKey(tomorrow)) return '내일';
    const d = new Date(`${next}T00:00:00`);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  })();

  // 메모 — 월 시작 row 의 note 사용 (단순화). 더 정교한 모델은 이후.
  const monthFirstKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
  const noteRow = allCheckins.find((c) => c.date === monthFirstKey);
  const [noteDraft, setNoteDraft] = useState(noteRow?.note ?? '');
  // habit/month 변경 시 동기화.
  useMemo(() => {
    setNoteDraft(noteRow?.note ?? '');
  }, [noteRow?.note, monthFirstKey]);

  const saveNote = () => {
    habitCheckinStore.setNote(habit.id, monthFirstKey, noteDraft);
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-[hsl(var(--hairline))]">
        <span
          className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[14px] shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }}
        >
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              {habit.title}
            </span>
            {habit.pinned && <Pin className="h-3 w-3 text-foreground/55" />}
          </div>
          {habit.notes && (
            <div className="text-[11.5px] text-foreground/55 truncate">{habit.notes}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="편집"
          className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="메뉴"
              className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
              {habit.pinned ? '핀 해제' : '핀 고정'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onArchive}>보관함으로</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 본문 — 스크롤. 섹션 간격은 각 section 의 pt-3 + border-t 가 담당. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* streak 상태 한 줄 — 위기/완료 시에만 노출 (기본 "다음 예정: 오늘" placeholder 는 가치 없음) */}
        {((todayScheduled && !todayDone && stats.streak >= 3) || todayDone) && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px]',
            todayScheduled && !todayDone && stats.streak >= 3
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          )}>
            {todayScheduled && !todayDone && stats.streak >= 3 ? (
              <>
                <Flame className="h-3.5 w-3.5" />
                <span><b>{stats.streak}일 streak 위기</b> — 오늘 체크하면 유지돼요</span>
              </>
            ) : (
              <>
                <Target className="h-3.5 w-3.5" />
                <span>오늘 완료! 다음은 <b>{nextLabel}</b></span>
              </>
            )}
          </div>
        )}

        {/* Stats — 단일 카드 3분할 (연속·이번 달·베스트) — 동기 위계 */}
        <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card grid grid-cols-3 divide-x divide-[hsl(var(--hairline))]">
          {[
            { Icon: Flame, label: '연속', value: stats.streak, unit: '일', accent: stats.streak >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground/60' },
            { Icon: Calendar, label: '이번 달', value: stats.monthCount, unit: '일', accent: 'text-blue-600 dark:text-blue-400' },
            { Icon: Trophy, label: '베스트', value: stats.max, unit: '일', accent: 'text-amber-600 dark:text-amber-400' },
          ].map(({ Icon, label, value, unit, accent }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center">
              <div className={cn('flex items-center gap-1', accent)}>
                <Icon className="h-3 w-3" />
                <span className="text-[10.5px] font-semibold tracking-wide text-foreground/65">{label}</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className={cn('text-[17px] font-bold tabular-nums leading-none', accent)}>{value}</span>
                <span className="text-[10.5px] text-foreground/50">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 월 캘린더 — 섹션 패턴 (border-t 위, 라벨 + 내용, 카드 wrapper 없음) */}
        <section className="pt-3 border-t border-[hsl(var(--hairline))]">
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-2 px-0.5">
            이번 달
          </div>
          <HabitMonthGrid
            habit={habit}
            year={viewYear}
            month1Indexed={viewMonth}
            onChangeMonth={(y, m) => { setViewYear(y); setViewMonth(m); }}
          />
        </section>

        {/* 365일 히트맵 — 섹션 패턴 */}
        <section className="pt-3 border-t border-[hsl(var(--hairline))]">
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-2 px-0.5">
            연간 패턴
          </div>
          <HabitYearHeatmap habit={habit} checkins={allCheckins} />
        </section>

        {/* 메모 */}
        <div>
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-1.5">
            이번 달 메모
          </div>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="이번 달 기록 — 잘 된 점, 어려웠던 점, 다음 달 다짐"
            rows={3}
            className="w-full px-3 py-2 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none resize-none placeholder:text-foreground/45"
          />
          <div className="mt-1 text-[10.5px] text-foreground/45">자동 저장됨 · 포커스 해제 시</div>
        </div>
      </div>
    </div>
  );
};


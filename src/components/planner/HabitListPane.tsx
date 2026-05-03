/**
 * 좌측 습관 list pane — TickTick 스타일 재디자인.
 *
 * 구조:
 *   상단:    [요일/날짜/진행률링] × 7  ── 각 날의 전체 완료율 도넛
 *   본문:    카드 형태 행 × N        ── 각 행 = 둥근 흰 카드 + 보더
 *   카드 안: emoji circle | 제목 + streak | 7개 dot | ⋯
 */
import { useMemo } from 'react';
import { Flame, MoreHorizontal, Pin, Plus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit, HabitCheckin } from '@/types/habit';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { habitStore } from '@/services/planner/habitStore';
import {
  currentStreak, isScheduledOn, maxStreak, toDateKey,
} from '@/lib/planner/habitStats';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HabitDayDot } from './HabitDayDot';
import { HabitDayProgress } from './HabitDayProgress';

interface HabitListPaneProps {
  habits: Habit[];
  allCheckins: HabitCheckin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const HabitListPane = ({
  habits, allCheckins, selectedId, onSelect, onAdd, onEdit,
}: HabitListPaneProps) => {
  const today = new Date();
  const todayKey = toDateKey(today);

  // 이번 주 (월~일) 7일 dateKeys.
  const weekDays = useMemo(() => {
    const monday = new Date(today);
    const dow = today.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    monday.setDate(today.getDate() + diffToMon);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  // 각 날의 (스케줄, 완료) — 진행률 링.
  const dayProgress = useMemo(() => {
    const checkinByKey = new Map<string, HabitCheckin>();
    for (const c of allCheckins) checkinByKey.set(`${c.habitId}|${c.date}`, c);
    return weekDays.map((d) => {
      const dk = toDateKey(d);
      let scheduled = 0;
      let completed = 0;
      for (const h of habits) {
        if (!isScheduledOn(h, dk)) continue;
        scheduled++;
        const ci = checkinByKey.get(`${h.id}|${dk}`);
        const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
        if (ci && (ci.count ?? 0) >= tpd) completed++;
      }
      return { dk, completed, scheduled };
    });
  }, [habits, allCheckins, weekDays]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/30">
      {/* 헤더 — 제목 + 액션 */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-[hsl(var(--hairline))] bg-card">
        <span className="text-[15px] font-bold tracking-tight text-foreground">습관</span>
        <span className="text-[12px] text-foreground/55 tabular-nums">{habits.length}</span>
        <button
          type="button"
          onClick={onAdd}
          aria-label="새 습관"
          title="새 습관"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* 주 진행률 헤더 — 도넛 링 7개 */}
      <div className="shrink-0 grid grid-cols-[1fr_repeat(7,40px)_28px] gap-1 items-center px-4 py-3 border-b border-[hsl(var(--hairline))] bg-card">
        <div />
        {weekDays.map((d, i) => {
          const dk = toDateKey(d);
          const isToday = dk === todayKey;
          const isPast = dk < todayKey;
          const prog = dayProgress[i];
          return (
            <div key={d.toISOString()} className="flex items-center justify-center">
              <HabitDayProgress
                weekday={WEEKDAY_KO[d.getDay()]}
                day={d.getDate()}
                completed={prog.completed}
                scheduled={prog.scheduled}
                isToday={isToday}
                isPast={isPast}
              />
            </div>
          );
        })}
        <div />
      </div>

      {/* 카드형 행 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {habits.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div>
              <div className="text-[14px] text-foreground/65 font-medium mb-2">
                첫 습관을 만들어보세요
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                새 습관
              </button>
            </div>
          </div>
        ) : (
          habits.map((habit) => {
            const checkins = allCheckins.filter((c) => c.habitId === habit.id);
            const checkinMap = new Map(checkins.map((c) => [c.date, c]));
            const streak = currentStreak(habit, checkins);
            const max = maxStreak(habit, checkins);
            const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;
            const isSelected = habit.id === selectedId;
            const timesPerDay = Math.max(1, habit.schedule.timesPerDay ?? 1);

            return (
              <div
                key={habit.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(habit.id);
                  }
                }}
                className={cn(
                  'group relative grid grid-cols-[1fr_repeat(7,40px)_28px] gap-1 items-center',
                  'rounded-xl bg-card px-3.5 py-3 cursor-pointer transition-all',
                  'border shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
                  isSelected
                    ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                    : 'border-[hsl(var(--hairline))] hover:border-foreground/20 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]',
                )}
              >
                {/* 좌: emoji + 제목 + meta */}
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full text-[20px] shrink-0"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${stripe} 28%, hsl(var(--background)))`,
                    }}
                  >
                    {habit.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-foreground truncate">
                        {habit.title}
                      </span>
                      {habit.pinned && <Pin className="h-3 w-3 text-foreground/55" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] tabular-nums text-foreground/55">
                      <span className="inline-flex items-center gap-0.5">
                        <Zap className="h-3 w-3" />
                        {streak}일들
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Flame className="h-3 w-3" />
                        {max}일
                      </span>
                      {timesPerDay > 1 && habit.unit && (
                        <span className="text-foreground/45">
                          {timesPerDay}{habit.unit}/일
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7개 dot */}
                {weekDays.map((d) => {
                  const dk = toDateKey(d);
                  const sched = isScheduledOn(habit, dk);
                  const ci = checkinMap.get(dk);
                  const isToday = dk === todayKey;
                  const isFuture = dk > todayKey;
                  return (
                    <div key={dk} className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <HabitDayDot
                        scheduled={sched}
                        count={ci?.count ?? 0}
                        timesPerDay={timesPerDay}
                        color={habit.color}
                        isToday={isToday}
                        isFuture={isFuture}
                        size="md"
                        ariaLabel={`${habit.title} ${dk}`}
                        onClick={() => habitCheckinStore.toggle(habit.id, dk, timesPerDay)}
                      />
                    </div>
                  );
                })}

                {/* ⋯ 메뉴 */}
                <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="메뉴"
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => onEdit(habit)}>편집</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
                        {habit.pinned ? '핀 해제' : '핀 고정'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => habitStore.archive(habit.id)}>
                        보관함으로
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

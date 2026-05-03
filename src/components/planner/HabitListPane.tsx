/**
 * 좌측 습관 list pane — 주 헤더 + 행 리스트.
 *
 * TickTick 식: 주 7일 헤더 + 각 행에 7개 dot.
 * 행 클릭 → 우측 detail 선택. dot 클릭 → 토글.
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

  // habit별 streak 계산은 행 안에서 (memo 가능하지만 단순화).

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 헤더 — 제목 + 액션 */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-[hsl(var(--hairline))]">
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

      {/* 주 헤더 */}
      <div className="shrink-0 grid grid-cols-[1fr_repeat(7,28px)_24px] gap-1 items-center px-4 py-2 border-b border-[hsl(var(--hairline))] bg-card/40">
        <div />
        {weekDays.map((d) => {
          const isToday = toDateKey(d) === todayKey;
          const dow = d.getDay();
          return (
            <div key={d.toISOString()} className="flex flex-col items-center gap-0.5">
              <span className={cn(
                'text-[9.5px] font-mono uppercase tracking-wide',
                isToday ? 'text-foreground' : dow === 0 ? 'text-rose-500/65' : dow === 6 ? 'text-blue-500/65' : 'text-foreground/45',
              )}>
                {WEEKDAY_KO[dow]}
              </span>
              <span className={cn(
                'text-[11px] font-mono tabular-nums',
                isToday ? 'text-foreground font-bold' : 'text-foreground/55',
              )}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
        <div />
      </div>

      {/* 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
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
          <ul className="divide-y divide-[hsl(var(--hairline))]">
            {habits.map((habit) => {
              const checkins = allCheckins.filter((c) => c.habitId === habit.id);
              const checkinMap = new Map(checkins.map((c) => [c.date, c]));
              const streak = currentStreak(habit, checkins);
              const max = maxStreak(habit, checkins);
              const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;
              const isSelected = habit.id === selectedId;
              const timesPerDay = Math.max(1, habit.schedule.timesPerDay ?? 1);

              return (
                <li
                  key={habit.id}
                  className={cn(
                    'group grid grid-cols-[1fr_repeat(7,28px)_24px] gap-1 items-center px-4 py-2 cursor-pointer',
                    isSelected ? 'bg-accent/50' : 'hover:bg-accent/30',
                  )}
                  onClick={() => onSelect(habit.id)}
                >
                  {/* 좌: emoji + 제목 + meta */}
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[14px] shrink-0"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))`,
                      }}
                    >
                      {habit.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-medium text-foreground truncate">
                          {habit.title}
                        </span>
                        {habit.pinned && <Pin className="h-3 w-3 text-foreground/55" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10.5px] font-mono tabular-nums text-foreground/55">
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            {streak}일
                          </span>
                        )}
                        {max > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Flame className={cn('h-2.5 w-2.5', max >= 3 && 'text-rose-500/80')} />
                            {max}일
                          </span>
                        )}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

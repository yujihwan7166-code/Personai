/**
 * 우측 detail pane — 선택된 습관의 통계 + 월 캘린더 + 메모.
 */
import { useMemo, useState } from 'react';
import { Calendar, Edit3, Flame, MoreHorizontal, Pin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit } from '@/types/habit';
import { habitStore } from '@/services/planner/habitStore';
import { useHabitCheckins } from '@/hooks/planner/useHabitCheckins';
import {
  currentStreak, maxStreak, monthCheckinCount, toDateKey,
} from '@/lib/planner/habitStats';
import { HabitYearHeatmap } from './HabitYearHeatmap';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HabitMonthGrid } from './HabitMonthGrid';

interface HabitDetailPaneProps {
  habit: Habit;
  onEdit: () => void;
}

export const HabitDetailPane = ({ habit, onEdit }: HabitDetailPaneProps) => {
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

  return (
    <div className="h-full min-h-0 flex flex-col bg-card">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full bg-card">
          <div className="flex h-14 items-center gap-2 border-b border-foreground/10 px-3">
            <span
              className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-[16px] shrink-0"
              style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }}
            >
              {habit.emoji}
            </span>
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="text-[15px] font-bold tracking-tight text-foreground truncate">
                {habit.title}
              </span>
              {habit.pinned && <Pin className="h-3 w-3 text-foreground/55 shrink-0" />}
            </div>
            <button
              type="button"
              onClick={onEdit}
              aria-label="편집"
              className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="메뉴"
                  className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
                  {habit.pinned ? '핀 해제' : '핀 고정'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {habit.notes && (
            <div className="px-3 py-2 text-[12px] text-foreground/65 leading-snug border-b border-foreground/10">
              {habit.notes}
            </div>
          )}

          <div className="grid grid-cols-3 divide-x divide-foreground/10 border-b border-foreground/10">
            {[
              { Icon: Flame, label: '연속', value: stats.streak, unit: '일', accent: stats.streak >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground/60' },
              { Icon: Calendar, label: '이번 달', value: stats.monthCount, unit: '일', accent: 'text-blue-600 dark:text-blue-400' },
              { Icon: Trophy, label: '최고기록', value: stats.max, unit: '일', accent: 'text-amber-600 dark:text-amber-400' },
            ].map(({ Icon, label, value, unit, accent }) => (
              <div key={label} className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-center">
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

          <section className="px-3 py-3 border-b border-foreground/10">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-2 px-0.5">
              이번 달
            </div>
            <HabitMonthGrid
              habit={habit}
              year={viewYear}
              month1Indexed={viewMonth}
              onChangeMonth={(y, m) => { setViewYear(y); setViewMonth(m); }}
            />
          </section>

          <section className="px-3 py-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-2 px-0.5">
              연간 패턴
            </div>
            <HabitYearHeatmap habit={habit} checkins={allCheckins} />
          </section>
        </div>
      </div>
    </div>
  );
};

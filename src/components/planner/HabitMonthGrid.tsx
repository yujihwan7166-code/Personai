/**
 * 월 캘린더 dot 그리드 — 35 cell, 체크된 날 = habit color, 오늘 ring.
 */
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Habit } from '@/types/habit';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { useHabitCheckins } from '@/hooks/planner/useHabitCheckins';
import { isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { HabitDayDot } from './HabitDayDot';

interface HabitMonthGridProps {
  habit: Habit;
  year: number;
  month1Indexed: number;            // 1~12
  onChangeMonth: (year: number, month: number) => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const HabitMonthGrid = ({ habit, year, month1Indexed, onChangeMonth }: HabitMonthGridProps) => {
  const range = useMemo(() => {
    const first = new Date(year, month1Indexed - 1, 1);
    const last = new Date(year, month1Indexed, 0);
    return { start: toDateKey(first), end: toDateKey(last) };
  }, [year, month1Indexed]);

  const checkins = useHabitCheckins(habit.id, range);
  const checkinMap = useMemo(
    () => new Map(checkins.map((c) => [c.date, c])),
    [checkins],
  );

  const cells = useMemo(() => {
    const first = new Date(year, month1Indexed - 1, 1);
    const startOffset = first.getDay(); // Sun=0
    const lastDay = new Date(year, month1Indexed, 0).getDate();
    const total = Math.ceil((startOffset + lastDay) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > lastDay) return null;
      return new Date(year, month1Indexed - 1, dayNum);
    });
  }, [year, month1Indexed]);

  const todayKey = toDateKey(new Date());
  const timesPerDay = Math.max(1, habit.schedule.timesPerDay ?? 1);

  return (
    <div>
      {/* 헤더 — 월 navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            const m = month1Indexed - 1;
            if (m < 1) onChangeMonth(year - 1, 12);
            else onChangeMonth(year, m);
          }}
          aria-label="이전 달"
          className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[14px] font-semibold tabular-nums">
          {year}년 {String(month1Indexed).padStart(2, '0')}월
        </span>
        <button
          type="button"
          onClick={() => {
            const m = month1Indexed + 1;
            if (m > 12) onChangeMonth(year + 1, 1);
            else onChangeMonth(year, m);
          }}
          aria-label="다음 달"
          className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_KO.map((d, i) => (
          <div key={d} className={cn(
            'text-center text-[10px] font-mono uppercase tracking-wide',
            i === 0 && 'text-rose-500/65',
            i === 6 && 'text-blue-500/65',
            i !== 0 && i !== 6 && 'text-foreground/45',
          )}>
            {d}
          </div>
        ))}
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} className="h-10" />;
          const dk = toDateKey(d);
          const sched = isScheduledOn(habit, dk);
          const ci = checkinMap.get(dk);
          const isToday = dk === todayKey;
          const isFuture = dk > todayKey;
          return (
            <div key={dk} className="flex flex-col items-center gap-1 py-1">
              <HabitDayDot
                scheduled={sched}
                count={ci?.count ?? 0}
                timesPerDay={timesPerDay}
                color={habit.color}
                isToday={isToday}
                isFuture={isFuture}
                ariaLabel={`${dk}`}
                onClick={() => habitCheckinStore.toggle(habit.id, dk, timesPerDay)}
              />
              <span className={cn(
                'text-[10px] font-mono tabular-nums',
                isToday ? 'text-foreground font-bold' : 'text-foreground/55',
              )}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

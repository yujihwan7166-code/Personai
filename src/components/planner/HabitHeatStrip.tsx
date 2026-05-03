/**
 * 카드 우측 30일 미니 heat strip — GitHub 식 점 그리드.
 * 5×6 = 30일, 좌→우 = 과거→오늘. 색 강도 = 완료, 옅은 회색 = 미완.
 */
import { useMemo } from 'react';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit, HabitCheckin } from '@/types/habit';
import { isCompletedOn, isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { cn } from '@/lib/utils';

interface HabitHeatStripProps {
  habit: Habit;
  checkins: HabitCheckin[];
}

const DAYS = 30;

export const HabitHeatStrip = ({ habit, checkins }: HabitHeatStripProps) => {
  const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;

  const cells = useMemo(() => {
    const map = new Map(checkins.map((c) => [c.date, c]));
    const today = new Date();
    const arr: Array<{ dk: string; sched: boolean; done: boolean }> = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dk = toDateKey(d);
      const sched = isScheduledOn(habit, dk);
      const done = isCompletedOn(habit, map.get(dk));
      arr.push({ dk, sched, done });
    }
    return arr;
  }, [habit, checkins]);

  return (
    <div className="grid grid-cols-10 grid-rows-3 gap-[2px] w-[68px]">
      {cells.map((c) => (
        <span
          key={c.dk}
          title={`${c.dk}${c.done ? ' ✓' : c.sched ? '' : ' (스케줄 X)'}`}
          className={cn(
            'h-[6px] w-[6px] rounded-[1.5px]',
            !c.sched && 'bg-foreground/5',
          )}
          style={
            c.done
              ? { backgroundColor: stripe }
              : c.sched
                ? { backgroundColor: `color-mix(in oklab, ${stripe} 16%, hsl(var(--background)))` }
                : undefined
          }
        />
      ))}
    </div>
  );
};

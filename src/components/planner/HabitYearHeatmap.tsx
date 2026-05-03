/**
 * 365일 히트맵 — GitHub 스타일.
 * 53주 × 7일 그리드, 색 강도 = 완료. 미스케줄/미체크 = 옅은 회색.
 */
import { useMemo } from 'react';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit, HabitCheckin } from '@/types/habit';
import { isCompletedOn, isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { cn } from '@/lib/utils';

interface HabitYearHeatmapProps {
  habit: Habit;
  checkins: HabitCheckin[];
}

const DAYS = 365;

export const HabitYearHeatmap = ({ habit, checkins }: HabitYearHeatmapProps) => {
  const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;

  const cells = useMemo(() => {
    const map = new Map(checkins.map((c) => [c.date, c]));
    const today = new Date();
    const arr: Array<{ dk: string; sched: boolean; done: boolean; month: number }> = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dk = toDateKey(d);
      arr.push({
        dk,
        sched: isScheduledOn(habit, dk),
        done: isCompletedOn(habit, map.get(dk)),
        month: d.getMonth() + 1,
      });
    }
    return arr;
  }, [habit, checkins]);

  // 7행 × 53주 grid (열 우선) — flex-wrap 으로 단순 구성.
  return (
    <div>
      <div className="flex gap-[2px] flex-wrap" style={{ maxWidth: 53 * 9 }}>
        {cells.map((c) => (
          <span
            key={c.dk}
            title={`${c.dk}${c.done ? ' ✓' : c.sched ? '' : ' (스케줄 X)'}`}
            className={cn(
              'h-2 w-2 rounded-[2px]',
              !c.sched && 'bg-foreground/5',
            )}
            style={
              c.done
                ? { backgroundColor: stripe }
                : c.sched
                  ? { backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }
                  : undefined
            }
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-foreground/55">
        <span>적음</span>
        <span className="h-2 w-2 rounded-[2px] bg-foreground/5" />
        <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }} />
        <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: `color-mix(in oklab, ${stripe} 50%, hsl(var(--background)))` }} />
        <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: stripe }} />
        <span>많음 · 최근 365일</span>
      </div>
    </div>
  );
};

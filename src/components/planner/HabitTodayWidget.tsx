/**
 * 사이드바 "오늘의 습관" 위젯 — 오늘 스케줄된 habit + 인라인 체크.
 *
 * D-day / 매트릭스 와 일관된 톤. 클릭 시 habits 풀뷰로 점프.
 */
import { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import { useHabits } from '@/hooks/planner/useHabits';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { HABIT_CHECKIN_CHANGED, type HabitCheckin } from '@/types/habit';
import { HabitDayDot } from './HabitDayDot';

interface HabitTodayWidgetProps {
  /** 헤더 클릭 — 풀뷰 점프. */
  onOpenAll?: () => void;
}

export const HabitTodayWidget = ({ onOpenAll }: HabitTodayWidgetProps) => {
  const habits = useHabits();
  const [todayCheckins, setTodayCheckins] = useState<HabitCheckin[]>([]);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    const refresh = () => setTodayCheckins(habitCheckinStore.byDate(todayKey));
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(HABIT_CHECKIN_CHANGED, refresh);
    return () => window.removeEventListener(HABIT_CHECKIN_CHANGED, refresh);
  }, [todayKey]);

  const todayHabits = habits.filter((h) => isScheduledOn(h, todayKey));
  const checkinMap = new Map(todayCheckins.map((c) => [c.habitId, c]));
  const completed = todayHabits.filter((h) => {
    const ci = checkinMap.get(h.id);
    return ci && (ci.count ?? 0) >= Math.max(1, h.schedule.timesPerDay ?? 1);
  }).length;

  if (habits.length === 0) return null;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={onOpenAll}
        className="w-full px-1.5 mb-1 flex items-center gap-1.5 text-[12px] font-semibold tracking-tight text-foreground/85 hover:text-primary transition-colors"
      >
        <Repeat className="h-3 w-3" strokeWidth={2} />
        오늘의 습관
        <span className="ml-auto text-[11px] font-mono tabular-nums text-foreground/55 font-semibold">
          {completed}/{todayHabits.length}
        </span>
      </button>
      {todayHabits.length === 0 ? (
        <p className="px-1.5 py-1 text-[12px] text-foreground/55">오늘 예정 없음</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {todayHabits.slice(0, 2).map((h) => {
            const stripe = (TASK_LIST_COLORS[h.color] ?? TASK_LIST_COLORS.blue).stripe;
            const ci = checkinMap.get(h.id);
            const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
            const done = (ci?.count ?? 0) >= tpd;
            return (
              <li key={h.id}>
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent/40 transition-colors">
                  <HabitDayDot
                    scheduled
                    count={ci?.count ?? 0}
                    timesPerDay={tpd}
                    color={h.color}
                    size="sm"
                    isToday
                    onClick={() => habitCheckinStore.toggle(h.id, todayKey, tpd)}
                    ariaLabel={`${h.title} ${done ? '체크 해제' : '체크'}`}
                  />
                  <span className="text-[13px] shrink-0" aria-hidden style={{ filter: done ? 'none' : 'grayscale(0.4)' }}>
                    {h.emoji}
                  </span>
                  <span className={cn(
                    'min-w-0 flex-1 truncate text-[12px] font-medium',
                    done ? 'text-foreground/50 line-through font-normal' : 'text-foreground',
                  )}>
                    {h.title}
                  </span>
                  {tpd > 1 && (
                    <span className="text-[11px] font-mono tabular-nums text-foreground/65 font-semibold shrink-0">
                      {ci?.count ?? 0}/{tpd}
                    </span>
                  )}
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: stripe }} aria-hidden />
                </div>
              </li>
            );
          })}
          {todayHabits.length > 2 && (
            <li className="px-1.5 text-[11px] text-foreground/55 tabular-nums">
              +{todayHabits.length - 2}개 더 — 풀뷰에서
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

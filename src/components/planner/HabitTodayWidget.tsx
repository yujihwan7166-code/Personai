/**
 * 사이드바 "오늘의 습관" 위젯 — 오늘 스케줄된 habit + 인라인 체크.
 *
 * D-day / 매트릭스 와 일관된 톤. 클릭 시 habits 풀뷰로 점프.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import { useHabits } from '@/hooks/planner/useHabits';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { HABIT_CHECKIN_CHANGED, type HabitCheckin } from '@/types/habit';
import { HabitDayDot } from './HabitDayDot';

const SIDEBAR_HABIT_PAGE_SIZE = 5;

interface HabitTodayWidgetProps {
  /** 헤더 클릭 — 풀뷰 점프. */
  onOpenAll?: () => void;
}

export const HabitTodayWidget = ({ onOpenAll }: HabitTodayWidgetProps) => {
  const habits = useHabits();
  const [todayCheckins, setTodayCheckins] = useState<HabitCheckin[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
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
  const pageCount = Math.max(1, Math.ceil(todayHabits.length / SIDEBAR_HABIT_PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleHabits = todayHabits.slice(
    safePageIndex * SIDEBAR_HABIT_PAGE_SIZE,
    safePageIndex * SIDEBAR_HABIT_PAGE_SIZE + SIDEBAR_HABIT_PAGE_SIZE,
  );

  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1));
  }, [pageCount, pageIndex]);

  if (habits.length === 0) return null;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={onOpenAll}
        className="w-full px-1.5 mb-1 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
      >
        <Repeat className="h-3.5 w-3.5 text-foreground/70" strokeWidth={2} />
        오늘의 습관
        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground font-semibold">
          {completed}/{todayHabits.length}
        </span>
      </button>
      {todayHabits.length === 0 ? (
        <p className="px-1.5 py-1 text-[12px] text-muted-foreground">오늘 예정된 습관이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {visibleHabits.map((h) => {
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
                    <span className="text-[11px] tabular-nums text-muted-foreground font-semibold shrink-0">
                      {ci?.count ?? 0}/{tpd}
                    </span>
                  )}
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: stripe }} aria-hidden />
                </div>
              </li>
            );
          })}
          {pageCount > 1 && (
            <li className="mt-1 flex items-center justify-center gap-1 px-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                disabled={safePageIndex === 0}
                aria-label="이전 습관"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-9 text-center text-[10.5px] font-semibold tabular-nums text-foreground/45">
                {safePageIndex + 1}/{pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
                disabled={safePageIndex >= pageCount - 1}
                aria-label="다음 습관"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

/**
 * 타임라인 위 습관 오버레이 — reminderTime 있는 습관을 그 시각에 작은 칩으로 표시.
 *
 * 일반 task/event 블록과 시각 충돌해도 별도 layer (z-index 25, top edge).
 * 클릭 시 체크인 토글 — 모달 없음.
 */
import { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { useHabits } from '@/hooks/planner/useHabits';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { isScheduledOn, toDateKey } from '@/lib/planner/habitStats';
import { HABIT_CHECKIN_CHANGED, type HabitCheckin } from '@/types/habit';
import { TASK_LIST_COLORS } from '@/types/planner';
import { cn } from '@/lib/utils';

interface HabitTimelineOverlayProps {
  /** 표시할 날짜 (YYYY-MM-DD). */
  dayKey: string;
  /** 한 시간당 px (TodayTimeline 의 HOUR_PX 와 동일). */
  hourPx: number;
  /** compact 모드 visibleStart 시간 (px 오프셋용). */
  visibleStartHour: number;
}

const parseHm = (hm: string): { h: number; m: number } | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
};

export const HabitTimelineOverlay = ({
  dayKey, hourPx, visibleStartHour,
}: HabitTimelineOverlayProps) => {
  const habits = useHabits();
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);

  useEffect(() => {
    const refresh = () => setCheckins(habitCheckinStore.byDate(dayKey));
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(HABIT_CHECKIN_CHANGED, refresh);
    return () => window.removeEventListener(HABIT_CHECKIN_CHANGED, refresh);
  }, [dayKey]);

  const checkinMap = new Map(checkins.map((c) => [c.habitId, c]));

  const todayKey = toDateKey(new Date());
  const isToday = dayKey === todayKey;

  const blocks = habits
    .filter((h) => isScheduledOn(h, dayKey))
    .flatMap((h) => {
      const reminders = (h.reminders ?? []).filter(Boolean);
      if (reminders.length === 0) return [];
      return reminders.map((r) => {
        const parsed = parseHm(r);
        if (!parsed) return null;
        return { habit: h, hm: r, hour: parsed.h, minute: parsed.m };
      }).filter((x): x is NonNullable<typeof x> => x !== null);
    });

  if (blocks.length === 0) return null;

  return (
    <div className="absolute left-10 right-0 top-0 bottom-0 pointer-events-none z-[25]">
      {blocks.map(({ habit, hm, hour, minute }) => {
        const ci = checkinMap.get(habit.id);
        const tpd = Math.max(1, habit.schedule.timesPerDay ?? 1);
        const done = (ci?.count ?? 0) >= tpd;
        const top = (hour + minute / 60 - visibleStartHour) * hourPx;
        if (top < -20) return null; // out of view
        const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;

        return (
          <button
            key={`habit-${habit.id}-${hm}`}
            type="button"
            onClick={() => habitCheckinStore.toggle(habit.id, dayKey, tpd)}
            title={`${habit.title} ${done ? '체크 해제' : '체크'} (${hm})`}
            style={{
              top,
              backgroundColor: done
                ? `color-mix(in oklab, ${stripe} 22%, hsl(var(--background)))`
                : 'transparent',
              borderColor: stripe,
            }}
            className={cn(
              'pointer-events-auto absolute right-2 max-w-[55%]',
              'inline-flex items-center gap-1.5 px-2 h-5 rounded-full',
              'border-[1.5px] text-[10.5px] font-medium',
              'hover:brightness-105 hover:shadow-sm transition-all',
              done ? 'opacity-95' : 'opacity-80',
              !isToday && 'opacity-55',
            )}
          >
            <Repeat className="h-2.5 w-2.5 shrink-0" style={{ color: stripe }} />
            <span aria-hidden className="text-[10px] leading-none">{habit.emoji}</span>
            <span className={cn(
              'truncate leading-none',
              done ? 'text-foreground/80 line-through' : 'text-foreground/90',
            )}>
              {habit.title}
            </span>
            {tpd > 1 && (
              <span className="text-[9px] font-mono tabular-nums text-foreground/55 shrink-0">
                {ci?.count ?? 0}/{tpd}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

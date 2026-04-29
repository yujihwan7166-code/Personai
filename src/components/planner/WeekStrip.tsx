/**
 * 주간 스트립 — 우측 컬럼. 7일 미니 (-3 ~ +3 anchor 기준).
 *
 * UX (Sunsama / Apple Calendar 좌측 미니 패턴):
 * - busy dot 강도 차등 (1-2 vs 3+)
 * - hover 툴팁 (그 날 항목 N개 미리 보기)
 * - 정보 밀도 향상
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlannerSection } from './PlannerSection';

interface WeekStripProps {
  /** 기준 날짜 (이 날 -3 ~ +3 7일을 보여줌). */
  anchorIso?: string;
  onDayClick?: (dayIso: string) => void;
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const WeekStrip = ({ anchorIso, onDayClick }: WeekStripProps) => {
  const today = useMemo(() => new Date(anchorIso ?? new Date().toISOString()), [anchorIso]);

  const { start, end, days } = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);

    const todayMs = new Date();
    todayMs.setHours(0, 0, 0, 0);
    const realTodayMs = todayMs.getTime();

    const arr: Array<{ iso: string; date: number; dow: number; isToday: boolean }> = [];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      arr.push({
        iso: d.toISOString(),
        date: d.getDate(),
        dow: d.getDay(),
        isToday: d.getTime() === realTodayMs,
      });
    }
    const startDate = new Date(arr[0].iso);
    const endDate = new Date(arr[6].iso);
    endDate.setDate(endDate.getDate() + 1);
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: arr,
    };
  }, [today]);

  const items = usePlannerRange(start, end);

  // 일별 카운트 — busy dot 강도 차등 + 툴팁용.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const key = startAt.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [items]);

  return (
    <PlannerSection label="이번 주" className="h-auto">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dayKey = d.iso.slice(0, 10);
          const count = counts.get(dayKey) ?? 0;
          const buttonEl = (
            <button
              type="button"
              onClick={() => onDayClick?.(d.iso)}
              aria-label={`${DAYS_KO[d.dow]}요일 ${d.date}일${d.isToday ? ' (오늘)' : ''}${count > 0 ? ` · ${count}개` : ''}`}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 rounded-md',
                'text-center transition-colors w-full',
                d.isToday
                  ? 'bg-foreground text-background'
                  : 'hover:bg-accent',
              )}
            >
              <span className={cn(
                'text-[10px] font-mono uppercase tracking-[0.1em] font-semibold',
                d.isToday && 'text-background',
                !d.isToday && d.dow === 0 && 'text-rose-500',
                !d.isToday && d.dow === 6 && 'text-blue-500',
                !d.isToday && d.dow !== 0 && d.dow !== 6 && 'text-muted-foreground',
              )}>
                {DAYS_KO[d.dow]}
              </span>
              <span className={cn(
                'text-[14px] font-semibold tabular-nums mt-0.5 leading-none',
                d.isToday ? 'text-background' : 'text-foreground',
              )}>
                {d.date}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    'absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full',
                    // 강도 차등: 1-2 = 작고 옅음 / 3+ = 크고 진함
                    count >= 3
                      ? 'h-[4px] w-[4px]'
                      : 'h-[3px] w-[3px]',
                    d.isToday
                      ? 'bg-background/80'
                      : count >= 3 ? 'bg-foreground' : 'bg-foreground/60',
                  )}
                  aria-hidden
                />
              )}
            </button>
          );
          if (count > 0) {
            return (
              <Tooltip key={d.iso} delayDuration={300}>
                <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <span className="text-[11.5px]">{d.date}일 · {count}개</span>
                </TooltipContent>
              </Tooltip>
            );
          }
          return <span key={d.iso}>{buttonEl}</span>;
        })}
      </div>
    </PlannerSection>
  );
};

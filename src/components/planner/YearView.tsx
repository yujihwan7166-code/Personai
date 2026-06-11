/**
 * 년(Year) 뷰 — 12개월 미니 캘린더 (4 × 3 격자).
 *
 * 각 미니: 월명 + 날짜 격자, 이벤트/할일 있는 날 도트.
 * 클릭 시 onMonthClick(monthIso) — 부모가 view='month' 로 이동시킬 수 있음.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TASK_LIST_COLORS, type PlannerTask, type PlannerTimelineItem } from '@/types/planner';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface YearViewProps {
  /** 기준 연도. */
  anchorIso?: string;
  onMonthClick?: (monthIso: string) => void;
  onDayClick?: (dayIso: string) => void;
}

const scheduledColor = (item: PlannerTimelineItem): string => {
  if (item.kind === 'event') return item.data.color ?? 'hsl(var(--primary))';
  const task = item.data as PlannerTask;
  return task.color && TASK_LIST_COLORS[task.color]
    ? TASK_LIST_COLORS[task.color].stripe
    : 'hsl(var(--primary))';
};

export const YearView = ({ anchorIso, onMonthClick, onDayClick }: YearViewProps) => {
  const anchor = useMemo(() => new Date(anchorIso ?? new Date().toISOString()), [anchorIso]);
  const year = anchor.getFullYear();

  // 1년 전체 범위.
  const { start, end } = useMemo(() => {
    const s = new Date(year, 0, 1);
    const e = new Date(year + 1, 0, 1);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [year]);

  const items = usePlannerRange(start, end);

  // 이벤트/할일 카운트 (날짜별, '강도' 표현). Apple Cal 패턴: 1-2 = 옅음 / 3+ = 진함.
  // 로컬 시각 기준 — UTC slice 시 timezone 어긋나는 버그 회피.
  const busyByDay = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const key = toDateKey(new Date(startAt));
      const prev = map.get(key);
      map.set(key, {
        count: (prev?.count ?? 0) + 1,
        color: prev?.color ?? scheduledColor(item),
      });
    });
    return map;
  }, [items]);

  // 월별 카운트 (12개월 라벨 옆 표시).
  const monthCounts = useMemo(() => {
    const arr: number[] = Array.from({ length: 12 }, () => 0);
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const m = new Date(startAt).getMonth();
      arr[m] += 1;
    });
    return arr;
  }, [items]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const firstOfMonth = new Date(year, m, 1);
      const lastOfMonth = new Date(year, m + 1, 0);
      const startOffset = firstOfMonth.getDay();
      const totalDays = lastOfMonth.getDate();
      const totalCells = 42;

      const cells: Array<{
        iso: string;
        date: number;
        outsideMonth: boolean;
        isToday: boolean;
        busyCount: number;
        busyColor: string;
      }> = [];
      for (let i = 0; i < totalCells; i++) {
        const dayNum = i - startOffset + 1;
        const d = new Date(year, m, dayNum);
        d.setHours(0, 0, 0, 0);
        const outsideMonth = dayNum < 1 || dayNum > totalDays;
        const dayKey = toDateKey(d);
        cells.push({
          iso: d.toISOString(),
          date: d.getDate(),
          outsideMonth,
          isToday: !outsideMonth && d.getTime() === today.getTime(),
          busyCount: outsideMonth ? 0 : busyByDay.get(dayKey)?.count ?? 0,
          busyColor: outsideMonth ? 'transparent' : busyByDay.get(dayKey)?.color ?? 'transparent',
        });
      }

      return {
        index: m,
        label: `${m + 1}월`,
        firstIso: firstOfMonth.toISOString(),
        cells,
        isCurrentMonth: m === today.getMonth() && year === today.getFullYear(),
      };
    });
  }, [year, today, busyByDay]);

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="grid min-h-full grid-cols-2 gap-px bg-[hsl(var(--hairline))] sm:grid-cols-3 lg:grid-cols-4 lg:grid-rows-3">
        {months.map((mo) => (
          <button
            key={mo.index}
            type="button"
            onClick={() => onMonthClick?.(mo.firstIso)}
            aria-label={`${mo.label} 보기${mo.isCurrentMonth ? ' (현재 월)' : ''}`}
            data-current-month={mo.isCurrentMonth ? 'true' : undefined}
            className={cn(
              'flex min-h-[214px] flex-col items-stretch bg-card px-4 py-3.5 text-left lg:min-h-0',
              'transition-colors duration-150 hover:bg-accent/35',
              mo.isCurrentMonth && 'ring-[3px] ring-inset ring-primary/55 shadow-[inset_0_0_0_1px_hsl(var(--background))]',
            )}
          >
            <header className="mb-2 flex items-baseline justify-between">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                {mo.label}
              </span>
              {monthCounts[mo.index] > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground font-medium">
                  {monthCounts[mo.index]}
                </span>
              )}
            </header>
            <div className="mb-1.5 grid grid-cols-7 text-center">
              {DAYS_KO.map((d, i) => (
                <span
                  key={d}
                  className={cn(
                    'flex h-5 items-center justify-center text-[10px] font-mono uppercase font-semibold',
                    i === 0 && 'text-rose-500',
                    i === 6 && 'text-blue-500',
                    i !== 0 && i !== 6 && 'text-muted-foreground',
                  )}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-y-1.5">
              {mo.cells.map((cell, i) => {
                if (cell.outsideMonth) {
                  return <span key={i} aria-hidden className="min-h-0" />;
                }

                const cellEl = (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cell.iso) onDayClick?.(cell.iso);
                    }}
                    className={cn(
                      'relative flex min-h-0 items-center justify-center rounded-md pb-1 text-[12px] font-semibold tabular-nums',
                      'cursor-pointer hover:bg-accent transition-colors',
                      cell.isToday && 'bg-primary text-primary-foreground font-bold shadow-sm ring-1 ring-primary/20 animate-pulse',
                      !cell.isToday && 'text-foreground',
                    )}
                  >
                    {cell.date}
                    {cell.busyCount > 0 && (
                      <span
                        className={cn(
                          'absolute bottom-[2px] left-1/2 h-[2px] -translate-x-1/2 rounded-full',
                          // 일정 개수는 길이로, 종류 색은 바 색으로만 조용히 표현한다.
                          cell.busyCount >= 3 ? 'w-4' : cell.busyCount === 2 ? 'w-3' : 'w-2',
                          cell.isToday && 'bg-primary-foreground/85',
                        )}
                        style={cell.isToday ? undefined : { backgroundColor: cell.busyColor }}
                        aria-hidden
                      />
                    )}
                  </span>
                );

                // busy 셀에만 Tooltip wrap (a11y + 정보 밀도).
                if (cell.busyCount > 0) {
                  const dateLabel = new Date(cell.iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                  return (
                    <Tooltip key={i} delayDuration={300}>
                      <TooltipTrigger asChild>{cellEl}</TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        <span className="text-[11.5px]">
                          {dateLabel} · {cell.busyCount}개
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return <span key={i}>{cellEl}</span>;
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

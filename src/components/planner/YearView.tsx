/**
 * 년(Year) 뷰 — 12개월 미니 캘린더 (4 × 3 격자).
 *
 * 각 미니: 월명 + 날짜 격자, 이벤트/할일 있는 날 도트.
 * 클릭 시 onMonthClick(monthIso) — 부모가 view='month' 로 이동시킬 수 있음.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlannerSection } from './PlannerSection';
import { HabitHeatmap } from './HabitHeatmap';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface YearViewProps {
  /** 기준 연도. */
  anchorIso?: string;
  onMonthClick?: (monthIso: string) => void;
  onDayClick?: (dayIso: string) => void;
}

export const YearView = ({ anchorIso, onMonthClick, onDayClick }: YearViewProps) => {
  const [mode, setMode] = useState<'months' | 'habits'>('months');
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
  const busyCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const key = toDateKey(new Date(startAt));
      map.set(key, (map.get(key) ?? 0) + 1);
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
      const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

      const cells: Array<{
        iso: string;
        date: number | null;
        isToday: boolean;
        busyCount: number;
      }> = [];
      for (let i = 0; i < totalCells; i++) {
        const dayNum = i - startOffset + 1;
        if (dayNum < 1 || dayNum > totalDays) {
          cells.push({ iso: '', date: null, isToday: false, busyCount: 0 });
        } else {
          const d = new Date(year, m, dayNum);
          d.setHours(0, 0, 0, 0);
          const dayKey = toDateKey(d);
          cells.push({
            iso: d.toISOString(),
            date: dayNum,
            isToday: d.getTime() === today.getTime(),
            busyCount: busyCounts.get(dayKey) ?? 0,
          });
        }
      }

      return {
        index: m,
        label: `${m + 1}월`,
        firstIso: firstOfMonth.toISOString(),
        cells,
        isCurrentMonth: m === today.getMonth() && year === today.getFullYear(),
      };
    });
  }, [year, today, busyCounts]);

  // ── 모드 토글 ──
  const ModeToggle = (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-secondary/60 border hairline"
    >
      {([
        ['months', '월 보기'],
        ['habits', '습관'],
      ] as const).map(([id, label]) => {
        const active = mode === id;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setMode(id)}
            className={cn(
              'px-3 h-6 rounded-full text-[11px] font-semibold transition-all',
              active
                ? 'bg-card text-foreground shadow-[0_1px_2px_hsl(30_15%_8%/0.06)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  if (mode === 'habits') {
    return (
      <PlannerSection label="년" count={`${year}`} action={ModeToggle} className="h-full">
        <HabitHeatmap anchorIso={anchorIso ?? new Date().toISOString()} onDayClick={onDayClick} />
      </PlannerSection>
    );
  }

  return (
    <PlannerSection label="년" count={`${year}`} action={ModeToggle} className="h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-1">
        {months.map((mo) => (
          <button
            key={mo.index}
            type="button"
            onClick={() => onMonthClick?.(mo.firstIso)}
            className={cn(
              'flex flex-col items-stretch p-3 rounded-2xl text-left',
              'border hairline bg-card shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]',
              'hover:border-foreground/25 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.1)]',
              'transition-all',
              mo.isCurrentMonth && 'ring-1 ring-primary/35',
            )}
          >
            <header className="flex items-baseline justify-between mb-2">
              <span className="text-[14px] font-semibold tracking-tight text-foreground">
                {mo.label}
              </span>
              {monthCounts[mo.index] > 0 && (
                <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground font-medium">
                  {monthCounts[mo.index]}
                </span>
              )}
            </header>
            <div className="grid grid-cols-7 gap-px text-center mb-1">
              {DAYS_KO.map((d, i) => (
                <span
                  key={d}
                  className={cn(
                    'text-[9px] font-mono uppercase font-semibold',
                    i === 0 && 'text-rose-500',
                    i === 6 && 'text-blue-500',
                    i !== 0 && i !== 6 && 'text-muted-foreground',
                  )}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {mo.cells.map((cell, i) => {
                if (cell.date === null) {
                  return <span key={i} className="aspect-square" aria-hidden />;
                }
                const cellEl = (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cell.iso) onDayClick?.(cell.iso);
                    }}
                    className={cn(
                      'relative aspect-square flex items-center justify-center text-[10px] tabular-nums rounded font-medium',
                      'cursor-pointer hover:bg-accent transition-colors',
                      cell.isToday && 'bg-foreground text-background font-semibold',
                      !cell.isToday && 'text-foreground',
                    )}
                  >
                    {cell.date}
                    {cell.busyCount > 0 && !cell.isToday && (
                      <span
                        className={cn(
                          'absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full',
                          // 강도 차등: 1-2 = 작고 옅음 / 3+ = 크고 진함
                          cell.busyCount >= 3
                            ? 'h-[4px] w-[4px] bg-foreground'
                            : 'h-[3px] w-[3px] bg-foreground/60',
                        )}
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
    </PlannerSection>
  );
};

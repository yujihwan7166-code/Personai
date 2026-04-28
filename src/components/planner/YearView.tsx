/**
 * 년(Year) 뷰 — 12개월 미니 캘린더 (4 × 3 격자).
 *
 * 각 미니: 월명 + 날짜 격자, 이벤트/할일 있는 날 도트.
 * 클릭 시 onMonthClick(monthIso) — 부모가 view='month' 로 이동시킬 수 있음.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { PlannerSection } from './PlannerSection';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface YearViewProps {
  /** 기준 연도. */
  anchorIso?: string;
  onMonthClick?: (monthIso: string) => void;
  onDayClick?: (dayIso: string) => void;
}

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

  // 이벤트/할일 있는 날짜 set ('YYYY-MM-DD').
  const busyDays = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (startAt) set.add(startAt.slice(0, 10));
    });
    return set;
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
        isBusy: boolean;
      }> = [];
      for (let i = 0; i < totalCells; i++) {
        const dayNum = i - startOffset + 1;
        if (dayNum < 1 || dayNum > totalDays) {
          cells.push({ iso: '', date: null, isToday: false, isBusy: false });
        } else {
          const d = new Date(year, m, dayNum);
          d.setHours(0, 0, 0, 0);
          const dayKey = d.toISOString().slice(0, 10);
          cells.push({
            iso: d.toISOString(),
            date: dayNum,
            isToday: d.getTime() === today.getTime(),
            isBusy: busyDays.has(dayKey),
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
  }, [year, today, busyDays]);

  return (
    <PlannerSection label="년" count={`${year}`} className="h-full">
      <div className="grid grid-cols-4 gap-4 p-1">
        {months.map((mo) => (
          <button
            key={mo.index}
            type="button"
            onClick={() => onMonthClick?.(mo.firstIso)}
            className={cn(
              'flex flex-col items-stretch p-3 rounded-lg text-left',
              'border border-[hsl(var(--hairline))] bg-card',
              'hover:border-foreground/30 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.1)]',
              'transition-all',
              mo.isCurrentMonth && 'ring-1 ring-foreground/30',
            )}
          >
            <header className="flex items-baseline justify-between mb-2">
              <span className={cn(
                'text-[13px] font-semibold tracking-tight',
                mo.isCurrentMonth ? 'text-foreground' : 'text-foreground/80',
              )}>
                {mo.label}
              </span>
            </header>
            <div className="grid grid-cols-7 gap-px text-center mb-1">
              {DAYS_KO.map((d, i) => (
                <span
                  key={d}
                  className={cn(
                    'text-[8px] font-mono uppercase',
                    i === 0 && 'text-rose-500/60',
                    i === 6 && 'text-blue-500/60',
                    i !== 0 && i !== 6 && 'text-muted-foreground/50',
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
                return (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cell.iso) onDayClick?.(cell.iso);
                    }}
                    className={cn(
                      'relative aspect-square flex items-center justify-center text-[9.5px] tabular-nums rounded',
                      'cursor-pointer hover:bg-accent transition-colors',
                      cell.isToday && 'bg-foreground text-background font-semibold',
                      !cell.isToday && 'text-foreground/70',
                    )}
                  >
                    {cell.date}
                    {cell.isBusy && !cell.isToday && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-foreground/60"
                        aria-hidden
                      />
                    )}
                  </span>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </PlannerSection>
  );
};

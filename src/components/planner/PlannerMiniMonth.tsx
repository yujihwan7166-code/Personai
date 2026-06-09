import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlannerMiniMonthProps {
  anchorIso: string;
  onSelectDay: (dayIso: string) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

const localDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const PlannerMiniMonth = ({ anchorIso, onSelectDay }: PlannerMiniMonthProps) => {
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);
  const anchorYM = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  const [viewMonth, setViewMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const [year, month] = anchorYM.split('-').map(Number);
    setViewMonth(new Date(year, month, 1));
  }, [anchorYM]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [viewMonth]);

  const todayKey = localDateKey(new Date());
  const anchorKey = localDateKey(anchor);
  const viewYear = viewMonth.getFullYear();
  const viewMonthIndex = viewMonth.getMonth();
  const monthLabel = viewMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const shiftViewMonth = (delta: -1 | 1) => {
    setPickerOpen(false);
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const setYear = (year: number) => {
    setViewMonth(new Date(year, viewMonthIndex, 1));
  };

  const setMonth = (monthIndex: number) => {
    setViewMonth(new Date(viewYear, monthIndex, 1));
    setPickerOpen(false);
  };

  return (
    <section className="relative px-1">
      <div ref={pickerRef} className="relative mb-1.5 flex items-center justify-center gap-1 px-1">
        <button
          type="button"
          onClick={() => shiftViewMonth(-1)}
          aria-label="이전 달"
          title="이전 달"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.3} />
        </button>

        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label="달력 연월 선택"
          className="h-7 min-w-[112px] rounded-md px-2 text-center text-[12.5px] font-semibold text-foreground tabular-nums transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {monthLabel}
        </button>

        <button
          type="button"
          onClick={() => shiftViewMonth(1)}
          aria-label="다음 달"
          title="다음 달"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.3} />
        </button>

        {pickerOpen && (
          <div
            role="dialog"
            aria-label="연월 선택"
            className="absolute left-1/2 top-8 z-20 w-[210px] -translate-x-1/2 rounded-xl border border-primary/15 bg-card p-2.5 shadow-[0_10px_30px_hsl(30_15%_8%/0.14)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setYear(viewYear - 1)}
                aria-label="이전 연도"
                className="h-7 w-8 rounded-md text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                -
              </button>
              <div className="text-[13px] font-semibold tabular-nums text-foreground">{viewYear}년</div>
              <button
                type="button"
                onClick={() => setYear(viewYear + 1)}
                aria-label="다음 연도"
                className="h-7 w-8 rounded-md text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                +
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {MONTH_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMonth(index)}
                  className={cn(
                    'h-8 rounded-md text-[12px] font-medium tabular-nums transition-colors',
                    index === viewMonthIndex
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-0.5 grid grid-cols-7 gap-y-0.5 px-0.5">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={label}
            className={cn(
              'text-center font-mono text-[10px] font-medium text-foreground/55',
              index === 0 && 'text-rose-500/70',
              index === 6 && 'text-blue-500/70',
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
        {cells.map((date, index) => {
          const key = localDateKey(date);
          const inMonth = date.getMonth() === viewMonthIndex;
          const isToday = key === todayKey;
          const isSelected = key === anchorKey;
          const dayOfWeek = date.getDay();
          return (
            <button
              key={`${key}-${index}`}
              type="button"
              onClick={() => onSelectDay(date.toISOString())}
              aria-label={`${date.toLocaleDateString('ko-KR')} 선택`}
              className={cn(
                'relative flex h-7 items-center justify-center rounded text-[11.5px] font-medium tabular-nums transition-colors',
                !inMonth && 'text-foreground/25',
                inMonth && !isSelected && !isToday && 'text-foreground/85 hover:bg-accent',
                inMonth && !isSelected && dayOfWeek === 0 && 'text-rose-500/80',
                inMonth && !isSelected && dayOfWeek === 6 && 'text-blue-500/80',
                isToday && !isSelected && 'text-primary ring-1 ring-primary/60 animate-pulse font-semibold',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm',
              )}
            >
              <span className="leading-none">{date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

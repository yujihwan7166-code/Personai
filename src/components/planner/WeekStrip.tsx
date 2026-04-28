/**
 * 주간 스트립 — 우측 컬럼. 7일 미니 + (Phase 5) 습관 잔디 자리.
 *
 * Phase 1: 가로 7일 + 오늘 강조. 카운트는 Phase 3 에서 추가.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PlannerSection } from './PlannerSection';

interface WeekStripProps {
  /** 기준 날짜 (오늘 포함 7일을 보여줌, 오늘이 가운데). */
  anchorIso?: string;
  onDayClick?: (dayIso: string) => void;
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const WeekStrip = ({ anchorIso, onDayClick }: WeekStripProps) => {
  const today = useMemo(() => new Date(anchorIso ?? new Date().toISOString()), [anchorIso]);

  const days = useMemo(() => {
    const arr: Array<{ iso: string; date: number; dow: number; isToday: boolean }> = [];
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    // 오늘 포함 -3 ~ +3 (7일).
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      arr.push({
        iso: d.toISOString(),
        date: d.getDate(),
        dow: d.getDay(),
        isToday: offset === 0,
      });
    }
    return arr;
  }, [today]);

  return (
    <PlannerSection label="이번 주" className="h-auto">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => onDayClick?.(d.iso)}
            className={cn(
              'flex flex-col items-center justify-center py-2 rounded-md',
              'text-center transition-colors',
              d.isToday
                ? 'bg-foreground text-background'
                : 'hover:bg-accent',
            )}
          >
            <span className={cn(
              'text-[9px] font-mono uppercase tracking-[0.1em] font-semibold',
              d.isToday && 'text-background/70',
              !d.isToday && d.dow === 0 && 'text-rose-500/80',
              !d.isToday && d.dow === 6 && 'text-blue-500/80',
              !d.isToday && d.dow !== 0 && d.dow !== 6 && 'text-muted-foreground/70',
            )}>
              {DAYS_KO[d.dow]}
            </span>
            <span className={cn(
              'text-[14px] font-semibold tabular-nums mt-0.5 leading-none',
              d.isToday ? 'text-background' : 'text-foreground/80',
            )}>
              {d.date}
            </span>
          </button>
        ))}
      </div>
    </PlannerSection>
  );
};

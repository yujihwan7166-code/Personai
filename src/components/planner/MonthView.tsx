/**
 * 월(Month) 뷰 — 6주 × 7일 격자. 각 셀에 이벤트/할일 도트 + 첫 1-3개 제목.
 *
 * 풀 화면 (사이드 컬럼 hide). 클릭 시 해당 일로 이동 (Phase 4 — onDayClick).
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { PlannerSection } from './PlannerSection';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface MonthViewProps {
  /** 월의 기준 날짜 (이 날의 월 전체). */
  anchorIso?: string;
  onDayClick?: (dayIso: string) => void;
  /** 항목 칩 클릭 → 편집 모달 (Cron / Apple Cal 패턴). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const MonthView = ({ anchorIso, onDayClick, onItemClick }: MonthViewProps) => {
  const { start, end, weeks, monthLabel } = useMemo(() => {
    const anchor = new Date(anchorIso ?? new Date().toISOString());
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startOffset = firstOfMonth.getDay();
    const totalDays = startOffset + lastOfMonth.getDate();
    const totalCells = Math.ceil(totalDays / 7) * 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const cells: Array<{
      iso: string;
      date: number;
      dow: number;
      isToday: boolean;
      isOtherMonth: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      const d = new Date(year, month, dayNum);
      d.setHours(0, 0, 0, 0);
      cells.push({
        iso: d.toISOString(),
        date: d.getDate(),
        dow: d.getDay(),
        isToday: d.getTime() === todayMs,
        isOtherMonth: dayNum < 1 || dayNum > lastOfMonth.getDate(),
      });
    }

    // 6주 격자가 되도록 padding (4주 짜리 2월 등 방지).
    while (cells.length < 42) {
      const last = cells[cells.length - 1];
      const d = new Date(last.iso);
      d.setDate(d.getDate() + 1);
      cells.push({
        iso: d.toISOString(),
        date: d.getDate(),
        dow: d.getDay(),
        isToday: false,
        isOtherMonth: true,
      });
    }

    const weekRows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }

    const startIso = cells[0].iso;
    const endIso = new Date(new Date(cells[cells.length - 1].iso).getTime() + 24 * 60 * 60 * 1000).toISOString();

    return {
      start: startIso,
      end: endIso,
      weeks: weekRows,
      monthLabel: anchor.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    };
  }, [anchorIso]);

  const items = usePlannerRange(start, end);

  // 일별 그룹핑.
  const itemsByDay = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const dayKey = startAt.slice(0, 10);
      const arr = map.get(dayKey) ?? [];
      arr.push(item);
      map.set(dayKey, arr);
    });
    return map;
  }, [items]);

  return (
    <PlannerSection label="월" count={monthLabel} className="h-full">
      <div className="flex flex-col h-full min-h-0">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_KO.map((d, i) => (
            <div
              key={d}
              className={cn(
                'text-[11px] font-mono uppercase tracking-[0.1em] font-semibold text-center pb-1.5',
                i === 0 && 'text-rose-500',
                i === 6 && 'text-blue-500',
                i !== 0 && i !== 6 && 'text-muted-foreground',
              )}
            >
              {d}
            </div>
          ))}
        </div>
        {/* 6주 격자 */}
        <div className="flex-1 grid grid-rows-6 gap-px bg-foreground/15 border border-foreground/20 rounded-lg overflow-hidden min-h-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-px">
              {week.map((cell) => {
                const dayKey = cell.iso.slice(0, 10);
                const dayItems = itemsByDay.get(dayKey) ?? [];
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => onDayClick?.(cell.iso)}
                    className={cn(
                      'flex flex-col items-stretch p-1.5 text-left min-w-0 min-h-0',
                      'bg-card hover:bg-accent transition-colors',
                      cell.isOtherMonth && 'bg-card/40',
                    )}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center text-[12px] font-semibold tabular-nums',
                          cell.isToday && 'h-5 min-w-[20px] px-1 rounded-full bg-foreground text-background',
                          !cell.isToday && cell.isOtherMonth && 'text-muted-foreground/60',
                          !cell.isToday && !cell.isOtherMonth && cell.dow === 0 && 'text-rose-500',
                          !cell.isToday && !cell.isOtherMonth && cell.dow === 6 && 'text-blue-500',
                          !cell.isToday && !cell.isOtherMonth && cell.dow !== 0 && cell.dow !== 6 && 'text-foreground',
                        )}
                      >
                        {cell.date}
                      </span>
                      {dayItems.length > 3 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
                          +{dayItems.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 min-h-0 overflow-hidden">
                      {dayItems.slice(0, 3).map((item) => {
                        const stripeColor =
                          item.kind === 'event'
                            ? item.data.color ?? 'hsl(220 70% 55%)'
                            : 'hsl(var(--muted-foreground) / 0.5)';
                        const startAt = item.data.startAt;
                        const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt!;
                        const taskCanceled = item.kind === 'task' ? Boolean(item.data.canceled) : false;
                        const taskDone = item.kind === 'task' ? item.data.done : false;
                        const dim = taskDone || taskCanceled;
                        return (
                          <button
                            key={item.data.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onItemClick && startAt) {
                                onItemClick({
                                  kind: item.kind,
                                  id: item.data.id,
                                  title: item.data.title,
                                  startAt,
                                  endAt,
                                });
                              }
                            }}
                            className={cn(
                              'flex items-center gap-1 px-1 py-0.5 rounded-sm text-[10.5px] truncate w-full text-left',
                              'bg-accent/70 hover:bg-accent transition-colors',
                              dim && 'opacity-60',
                            )}
                          >
                            <span
                              className="inline-block w-1 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: stripeColor }}
                              aria-hidden
                            />
                            {startAt && (
                              <span className="font-mono tabular-nums text-muted-foreground shrink-0 text-[9.5px]">
                                {formatHm(startAt)}
                              </span>
                            )}
                            <span className={cn(
                              'truncate text-foreground font-medium',
                              dim && 'line-through text-muted-foreground',
                            )}>
                              {item.data.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PlannerSection>
  );
};

/**
 * 월(Month) 뷰 — 6주 × 7일 격자. 각 셀에 이벤트/할일 도트 + 첫 1-3개 제목.
 *
 * 풀 화면 (사이드 컬럼 hide). 클릭 시 해당 일로 이동 (Phase 4 — onDayClick).
 */
import { useMemo } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { PlannerSection } from './PlannerSection';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PlannerTimelineItem } from '@/types/planner';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface MonthViewProps {
  /** 월의 기준 날짜 (이 날의 월 전체). */
  anchorIso?: string;
  /** 셀 popover 안 'Day 뷰 열기' 클릭 → Day 뷰로 점프. */
  onDayClick?: (dayIso: string) => void;
  /** 항목 칩 클릭 → 편집 모달 (Cron / Apple Cal 패턴). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  /** 셀 popover 안 '+ 새 일정' 클릭 → 그 날짜로 모달 열기 (부모 처리). */
  onAddForDate?: (dayIso: string) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const MonthView = ({ anchorIso, onDayClick, onItemClick, onAddForDate }: MonthViewProps) => {
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

  // 일별 그룹핑 — 로컬 시각 기준 (UTC slice 시 timezone 어긋나는 버그 회피).
  const itemsByDay = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const dayKey = toDateKey(new Date(startAt));
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
        <div className="flex-1 grid grid-rows-6 gap-px bg-[hsl(var(--hairline))] border hairline rounded-2xl overflow-hidden min-h-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-px">
              {week.map((cell) => {
                const dayKey = toDateKey(new Date(cell.iso));
                const dayItems = itemsByDay.get(dayKey) ?? [];
                return (
                  <Popover key={cell.iso}>
                    <PopoverTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).click();
                          }
                        }}
                        className={cn(
                          'flex flex-col items-stretch p-1.5 text-left min-w-0 min-h-0 cursor-pointer outline-none',
                          'bg-card hover:bg-accent focus-visible:ring-1 focus-visible:ring-primary transition-colors',
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
                                onPointerDown={(e) => e.stopPropagation()}
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
                                  <span className="tabular-nums text-muted-foreground shrink-0 text-[9.5px]">
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
                      </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" sideOffset={6} className="w-72 p-0 overflow-hidden">
                      <DayPopoverBody
                        cellIso={cell.iso}
                        items={dayItems}
                        onItemClick={onItemClick}
                        onJumpToDay={onDayClick}
                        onAddForDate={onAddForDate}
                      />
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PlannerSection>
  );
};

/** 셀 클릭 시 떠오르는 popover — 그 날 항목 list + Day 뷰 점프 + 새 일정 추가. */
const DayPopoverBody = ({
  cellIso,
  items,
  onItemClick,
  onJumpToDay,
  onAddForDate,
}: {
  cellIso: string;
  items: PlannerTimelineItem[];
  onItemClick?: MonthViewProps['onItemClick'];
  onJumpToDay?: MonthViewProps['onDayClick'];
  onAddForDate?: MonthViewProps['onAddForDate'];
}) => {
  const day = new Date(cellIso);
  const headerLabel = day.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
  });
  return (
    <div className="flex flex-col">
      {/* 헤더 — 큰 serif 날짜 + 카운트 */}
      <header className="flex items-baseline justify-between gap-2 px-3.5 pt-3 pb-2 border-b hairline">
        <h3 className="font-display text-[16px] font-semibold tracking-tight text-foreground leading-none">
          {headerLabel}
        </h3>
        {items.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
            {items.length}개
          </span>
        )}
      </header>

      {/* 본문 — 항목 리스트 또는 빈 상태 */}
      <div className="px-2 py-2 max-h-[260px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12.5px] text-muted-foreground leading-snug">
            이 날 비어있어요.
          </p>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => {
              const stripeColor =
                item.kind === 'event'
                  ? item.data.color ?? 'hsl(var(--primary))'
                  : 'hsl(var(--primary))';
              const startAt = item.data.startAt;
              const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt!;
              const taskCanceled = item.kind === 'task' ? Boolean(item.data.canceled) : false;
              const taskDone = item.kind === 'task' ? item.data.done : false;
              const dim = taskDone || taskCanceled;
              return (
                <button
                  key={item.data.id}
                  type="button"
                  onClick={() => {
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
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left',
                    dim && 'opacity-60',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: stripeColor }}
                    aria-hidden
                  />
                  {startAt && (
                    <span className="text-[11.5px] tabular-nums text-muted-foreground shrink-0 font-medium">
                      {formatHm(startAt)}
                    </span>
                  )}
                  <span className={cn(
                    'flex-1 min-w-0 truncate text-[13px] text-foreground font-medium',
                    dim && 'line-through text-muted-foreground',
                  )}>
                    {item.data.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 푸터 — 액션 */}
      <footer className="flex items-center gap-1.5 px-2 py-2 border-t hairline bg-card/40">
        {onAddForDate && (
          <button
            type="button"
            onClick={() => onAddForDate(cellIso)}
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-md text-[12px] font-semibold border border-primary/35 text-primary bg-card hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            새 일정
          </button>
        )}
        {onJumpToDay && (
          <button
            type="button"
            onClick={() => onJumpToDay(cellIso)}
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-md text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Day 뷰
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </footer>
    </div>
  );
};

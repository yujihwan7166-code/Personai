/**
 * 월(Month) 뷰 — 6주 × 7일 격자. 각 셀에 이벤트/할일 도트 + 첫 1-3개 제목.
 *
 * 풀 화면 (사이드 컬럼 hide). 클릭 시 해당 일로 이동 (Phase 4 — onDayClick).
 */
import { forwardRef, useCallback, useMemo, type HTMLAttributes, type MutableRefObject, type ReactNode } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlannerCalendarRange } from '@/hooks/planner/usePlannerCalendarRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TASK_LIST_COLORS, type PlannerEvent, type PlannerTask, type PlannerTimelineItem } from '@/types/planner';
import { DraggableWeekItem, weekDragDataForEvent, weekDragDataForTask } from './dnd/DraggableWeekItem';
import type { PlannerDragData, PlannerDropData } from './dnd/plannerDndTypes';

const DAYS_KO = [
  { short: '일', long: '일요일' },
  { short: '월', long: '월요일' },
  { short: '화', long: '화요일' },
  { short: '수', long: '수요일' },
  { short: '목', long: '목요일' },
  { short: '금', long: '금요일' },
  { short: '토', long: '토요일' },
];

interface MonthViewProps {
  /** 월의 기준 날짜 (이 날의 월 전체). */
  anchorIso?: string;
  /** 셀 popover 안 'Day 뷰 열기' 클릭 → Day 뷰로 점프. */
  onDayClick?: (dayIso: string) => void;
  /** 항목 칩 클릭 → 편집 모달 (Cron / Apple Cal 패턴). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  /** 날짜만 있는 할 일 클릭 → 일정/할 일 편집 모달. */
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** 셀 popover 안 '+ 새 일정' 클릭 → 그 날짜로 모달 열기 (부모 처리). */
  onAddForDate?: (dayIso: string) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const MonthView = ({ anchorIso, onDayClick, onItemClick, onTaskClick, onAddForDate }: MonthViewProps) => {
  const { active } = useDndContext();
  const activeDragData = active?.data.current as PlannerDragData | undefined;
  const isDraggingPlannerItem = Boolean(
    activeDragData &&
      (
        activeDragData.kind === 'planned-task' ||
        activeDragData.kind === 'scheduled-task' ||
        activeDragData.kind === 'scheduled-event'
      ),
  );

  const { start, end, weeks } = useMemo(() => {
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
    };
  }, [anchorIso]);

  const { timedItems, dateTodos } = usePlannerCalendarRange(start, end);

  // 일별 그룹핑 — 로컬 시각 기준 (UTC slice 시 timezone 어긋나는 버그 회피).
  const itemsByDay = useMemo(() => {
    const map = new Map<string, typeof timedItems>();
    timedItems.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const dayKey = toDateKey(new Date(startAt));
      const arr = map.get(dayKey) ?? [];
      arr.push(item);
      map.set(dayKey, arr);
    });
    return map;
  }, [timedItems]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    dateTodos.forEach((task) => {
      if (!task.plannedFor) return;
      const arr = map.get(task.plannedFor) ?? [];
      arr.push(task);
      map.set(task.plannedFor, arr);
    });
    return map;
  }, [dateTodos]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden border-y border-r border-[hsl(var(--hairline))] bg-[hsl(var(--hairline))]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-px bg-[hsl(var(--hairline))] border-b border-[hsl(var(--hairline))]">
          {DAYS_KO.map((d, i) => (
            <div
              key={d.short}
              className={cn(
                'flex h-9 items-center justify-center bg-card/95 text-[12px] font-semibold tracking-normal',
                i === 0 && 'text-rose-500',
                i === 6 && 'text-blue-500',
                i !== 0 && i !== 6 && 'text-muted-foreground',
              )}
            >
              <span className="hidden sm:inline">{d.long}</span>
              <span className="sm:hidden">{d.short}</span>
            </div>
          ))}
        </div>
        {/* 6주 격자 */}
        <div className="flex-1 grid grid-rows-6 gap-px min-h-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
              {week.map((cell) => {
                const dayKey = toDateKey(new Date(cell.iso));
                const dayItems = itemsByDay.get(dayKey) ?? [];
                const dayTodos = todosByDay.get(dayKey) ?? [];
                const previewTimed = dayItems.slice(0, Math.min(2, dayItems.length));
                const previewTodos = dayTodos.slice(0, Math.max(0, 3 - previewTimed.length));
                const totalCount = dayItems.length + dayTodos.length;
                const hiddenCount = Math.max(0, totalCount - previewTimed.length - previewTodos.length);
                return (
                  <Popover key={cell.iso}>
                    <PopoverTrigger asChild>
                      <MonthCellTrigger
                        dayIso={cell.iso}
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
                              cell.isToday && 'h-5 min-w-[20px] px-1 rounded-full bg-violet-500 text-white shadow-[0_1px_4px_hsl(262_83%_58%/0.28)]',
                              !cell.isToday && cell.isOtherMonth && 'text-muted-foreground/60',
                              !cell.isToday && !cell.isOtherMonth && cell.dow === 0 && 'text-rose-500',
                              !cell.isToday && !cell.isOtherMonth && cell.dow === 6 && 'text-blue-500',
                              !cell.isToday && !cell.isOtherMonth && cell.dow !== 0 && cell.dow !== 6 && 'text-foreground',
                            )}
                          >
                            {cell.date}
                          </span>
                        </div>
                        <div className="space-y-0.5 min-h-0 overflow-hidden">
                          {previewTimed.map((item) => {
                            const stripeColor =
                              item.kind === 'event'
                                ? item.data.color ?? 'hsl(220 70% 55%)'
                                : 'hsl(var(--muted-foreground) / 0.5)';
                            const startAt = item.data.startAt;
                            const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt!;
                            const taskCanceled = item.kind === 'task' ? Boolean(item.data.canceled) : false;
                            const taskDone = item.kind === 'task' ? item.data.done : false;
                            const dim = taskDone || taskCanceled;
                            const dragData = item.kind === 'event'
                              ? weekDragDataForEvent(item.data as PlannerEvent)
                              : weekDragDataForTask(item.data as PlannerTask);
                            return (
                              <DraggableWeekItem
                                key={item.data.id}
                                id={`month-preview-${item.kind}-${item.data.id}`}
                                data={dragData}
                              >
                                <div
                                  role="button"
                                  tabIndex={0}
                                  data-month-preview-item={`${item.kind}-${item.data.id}`}
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
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
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
                                    }
                                  }}
                                  className={cn(
                                    'flex w-full cursor-grab items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[10.5px] transition-colors active:cursor-grabbing',
                                    'bg-accent/70 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/35',
                                    dim && 'opacity-60',
                                  )}
                                >
                                  <span
                                    className="inline-block h-1 w-1 shrink-0 rounded-full"
                                    style={{ backgroundColor: stripeColor }}
                                    aria-hidden
                                  />
                                  {startAt && (
                                    <span className="shrink-0 tabular-nums text-[9.5px] text-muted-foreground">
                                      {formatHm(startAt)}
                                    </span>
                                  )}
                                  <span className={cn(
                                    'truncate font-medium text-foreground',
                                    dim && 'text-muted-foreground line-through',
                                  )}>
                                    {item.data.title}
                                  </span>
                                </div>
                              </DraggableWeekItem>
                            );
                          })}
                          {previewTodos.map((task) => (
                            <DraggableWeekItem
                              key={task.id}
                              id={`month-preview-task-${task.id}`}
                              data={weekDragDataForTask(task)}
                            >
                              <MonthTodoPreview
                                task={task}
                                onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                              />
                            </DraggableWeekItem>
                          ))}
                          {hiddenCount > 0 && (
                            <div className="mt-1 flex items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              <span className="flex items-center gap-0.5" aria-hidden>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/45" />
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                              </span>
                              <span className="truncate">외 {hiddenCount}개 더 있음</span>
                            </div>
                          )}
                        </div>
                      </MonthCellTrigger>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={6}
                      data-month-popover-content="true"
                      className={cn(
                        'w-72 overflow-hidden p-0 transition-[opacity,transform,box-shadow] duration-150 ease-out',
                        isDraggingPlannerItem && 'pointer-events-none scale-[0.985] opacity-20 shadow-none',
                      )}
                    >
                      <DayPopoverBody
                        cellIso={cell.iso}
                        items={dayItems}
                        todos={dayTodos}
                        onItemClick={onItemClick}
                        onTaskClick={onTaskClick}
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
    </div>
  );
};

interface MonthCellTriggerProps extends HTMLAttributes<HTMLDivElement> {
  dayIso: string;
  children: ReactNode;
}

const MonthCellTrigger = forwardRef<HTMLDivElement, MonthCellTriggerProps>(({
  dayIso,
  className,
  children,
  ...props
}, forwardedRef) => {
  const data: PlannerDropData = { kind: 'day-column', dayIso };
  const { setNodeRef, isOver } = useDroppable({
    id: `month-day-${dayIso}`,
    data,
  });

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [forwardedRef, setNodeRef]);

  return (
    <div
      ref={setRefs}
      data-month-day={toDateKey(new Date(dayIso))}
      {...props}
      className={cn(
        'relative',
        isOver && 'bg-primary/5 ring-2 ring-primary/35 ring-inset',
        className,
      )}
    >
      {children}
      {isOver && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-full border border-primary/30 bg-card/95 px-2 py-0.5 text-[10.5px] font-semibold text-primary shadow-sm">
          이 날짜로 이동
        </span>
      )}
    </div>
  );
});
MonthCellTrigger.displayName = 'MonthCellTrigger';

/** 셀 클릭 시 떠오르는 popover — 그 날 항목 list + Day 뷰 점프 + 새 일정 추가. */
const DayPopoverBody = ({
  cellIso,
  items,
  todos,
  onItemClick,
  onTaskClick,
  onJumpToDay,
  onAddForDate,
}: {
  cellIso: string;
  items: PlannerTimelineItem[];
  todos: PlannerTask[];
  onItemClick?: MonthViewProps['onItemClick'];
  onTaskClick?: MonthViewProps['onTaskClick'];
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
        {items.length + todos.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
            {items.length + todos.length}개
          </span>
        )}
      </header>

      {/* 본문 — 항목 리스트 또는 빈 상태 */}
      <div className="px-2 py-2 max-h-[260px] overflow-y-auto">
        {items.length + todos.length === 0 ? (
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
              const dragData = item.kind === 'event'
                ? weekDragDataForEvent(item.data as PlannerEvent)
                : weekDragDataForTask(item.data as PlannerTask);
              return (
                <DraggableWeekItem
                  key={item.data.id}
                  id={`month-popover-${item.kind}-${item.data.id}`}
                  data={dragData}
                >
                  <button
                    type="button"
                    data-month-popover-item={`${item.kind}-${item.data.id}`}
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
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left cursor-grab active:cursor-grabbing',
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
                </DraggableWeekItem>
              );
            })}
            {todos.map((task) => (
              <DraggableWeekItem
                key={task.id}
                id={`month-popover-task-${task.id}`}
                data={weekDragDataForTask(task)}
              >
                <MonthTodoPopoverRow
                  task={task}
                  onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                />
              </DraggableWeekItem>
            ))}
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

const todoColor = (task: PlannerTask) => (
  task.color && TASK_LIST_COLORS[task.color]
    ? TASK_LIST_COLORS[task.color].stripe
    : 'hsl(var(--primary))'
);

const MonthTodoPreview = ({
  task,
  onClick,
}: {
  task: PlannerTask;
  onClick?: () => void;
}) => (
  <button
    type="button"
    data-month-preview-item={`task-${task.id}`}
    onClick={(event) => {
      event.stopPropagation();
      onClick?.();
    }}
    className="flex w-full cursor-grab items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[10.5px] transition-colors hover:bg-accent/70 active:cursor-grabbing"
  >
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border bg-card"
      style={{ borderColor: todoColor(task) }}
      aria-hidden
    />
    <span className="truncate font-medium text-foreground/85">
      {task.title}
    </span>
  </button>
);

const MonthTodoPopoverRow = ({
  task,
  onClick,
}: {
  task: PlannerTask;
  onClick?: () => void;
}) => (
  <button
    type="button"
    data-month-popover-item={`task-${task.id}`}
    onClick={onClick}
    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left cursor-grab active:cursor-grabbing"
  >
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border bg-card"
      style={{ borderColor: todoColor(task) }}
      aria-hidden
    />
    <span className="flex-1 min-w-0 truncate text-[13px] text-foreground font-medium">
      {task.title}
    </span>
  </button>
);

/**
 * 주(Week) 뷰 — 7일 가로 컬럼. 각 일에 시간배정 항목 리스트.
 *
 * UX (Apple Calendar 패턴):
 * - 컬럼 헤더 클릭 → 해당 일 Day 뷰 점프
 * - 빈 컬럼 영역 클릭 → 해당 일 Day 뷰 점프 (가벼운 새 항목 진입점)
 * - 카드 클릭 → 편집 모달 (Day 뷰와 일관성)
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CalendarClock, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { usePlannerCalendarRange } from '@/hooks/planner/usePlannerCalendarRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { PlannerCard } from './PlannerCard';
import { DraggableWeekItem, weekDragDataForEvent, weekDragDataForTask } from './dnd/DraggableWeekItem';
import type { PlannerDragData, PlannerDropData } from './dnd/plannerDndTypes';
import { taskListStore } from '@/services/planner/taskListStore';
import { TASK_LIST_COLORS, PLANNER_LIST_CHANGED, type PlannerTask } from '@/types/planner';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** 길이 라벨 — "30분" / "1시간 10분". */
const formatDuration = (startIso: string, endIso: string): string => {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

interface WeekViewProps {
  /** 주의 기준 날짜 (이 날 포함 일~토 7일). */
  anchorIso?: string;
  /** 컬럼 헤더 / 빈 컬럼 클릭 → 해당 일로 Day 뷰 점프. */
  onDayClick?: (dayIso: string) => void;
  onCreateEvent?: (dayIso: string) => void;
  onCreateTask?: (dayIso: string) => void;
  /** 카드 클릭 → 편집 모달 (Day 뷰와 일관성). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  /** 날짜만 있는 할 일 클릭 → 일정/할 일 편집 모달. */
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const WeekView = ({ anchorIso, onDayClick, onCreateEvent, onCreateTask, onItemClick, onTaskClick }: WeekViewProps) => {
  const [lists, setLists] = useState(() => taskListStore.list());
  useEffect(() => {
    const refresh = () => setLists(taskListStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_LIST_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_LIST_CHANGED, refresh);
  }, []);
  const hiddenListIds = useMemo(() => new Set(lists.filter((l) => l.hidden).map((l) => l.id)), [lists]);
  const listColorMap = useMemo(() => new Map(lists.map((l) => [l.id, l.color])), [lists]);
  const { start, end, days } = useMemo(() => {
    const anchor = new Date(anchorIso ?? new Date().toISOString());
    anchor.setHours(0, 0, 0, 0);
    const startDate = new Date(anchor);
    startDate.setDate(anchor.getDate() - anchor.getDay()); // 일요일로
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const dayList = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return {
        iso: d.toISOString(),
        // 그룹핑·매칭은 로컬 날짜 기준 — UTC slice 시 timezone 어긋나는 버그 회피.
        key: toDateKey(d),
        date: d.getDate(),
        dow: d.getDay(),
        isToday: d.getTime() === todayMs,
      };
    });

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: dayList,
    };
  }, [anchorIso]);

  const { timedItems, dateTodos } = usePlannerCalendarRange(start, end);

  // 일별로 그룹핑 — 로컬 시각 기준 (UTC slice 버그 회피).
  // 같은 날 안에서 startAt 오름차순 정렬 + overlap 플래그 합성.
  const itemsByDay = useMemo(() => {
    type DayItem = typeof timedItems[number] & { overlapping: boolean; durationLabel: string };
    const map = new Map<string, DayItem[]>();

    // 1) 로컬 날짜 키로 분류
    const grouped = new Map<string, typeof timedItems>();
    timedItems.forEach((item) => {
      const startAt = item.data.startAt;
      if (!startAt) return;
      const dayKey = toDateKey(new Date(startAt));
      const arr = grouped.get(dayKey) ?? [];
      arr.push(item);
      grouped.set(dayKey, arr);
    });

    // 2) 각 일별로 정렬 + 겹침 검사 + 길이 라벨 계산
    grouped.forEach((arr, dayKey) => {
      const sorted = [...arr].sort((a, b) =>
        (a.data.startAt ?? '').localeCompare(b.data.startAt ?? ''),
      );
      const ranges = sorted.map((item) => {
        const startAt = item.data.startAt!;
        const endAt = item.kind === 'event'
          ? item.data.endAt
          : (item.data.endAt ?? startAt);
        return {
          startMs: new Date(startAt).getTime(),
          endMs: new Date(endAt).getTime(),
          startAt,
          endAt,
        };
      });
      const decorated: DayItem[] = sorted.map((item, i) => {
        const r = ranges[i];
        let overlapping = false;
        for (let j = 0; j < ranges.length; j++) {
          if (j === i) continue;
          if (r.startMs < ranges[j].endMs && r.endMs > ranges[j].startMs) {
            overlapping = true;
            break;
          }
        }
        return {
          ...item,
          overlapping,
          durationLabel: formatDuration(r.startAt, r.endAt),
        };
      });
      map.set(dayKey, decorated);
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

  const hasCalendarItems = timedItems.length > 0 || dateTodos.length > 0;
  const isPassiveSectionClick = (target: EventTarget | null) =>
    target instanceof HTMLElement && !target.closest('button,[role="button"],[data-week-todo-row]');

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-y border-r border-foreground/10 bg-card">
      <div className="grid h-full min-h-0 grid-cols-7 divide-x divide-foreground/10">
        {days.map((d) => {
          const dayItems = (itemsByDay.get(d.key) ?? []).filter((item) => {
            if (item.kind !== 'task') return true;
            const listId = item.data.listId;
            return !listId || !hiddenListIds.has(listId);
          });
          const dayTodos = (todosByDay.get(d.key) ?? []).filter((task) =>
            !task.listId || !hiddenListIds.has(task.listId),
          );
          return (
            <div key={d.iso} className="flex min-h-0 min-w-0 flex-col">
              <button
                type="button"
                data-week-day-header={d.key}
                onClick={() => onDayClick?.(d.iso)}
                aria-label={`${d.date}일 ${DAYS_KO[d.dow]}요일${d.isToday ? ' (오늘)' : ''} — Day 뷰로`}
                className={cn(
                  'group flex h-12 shrink-0 flex-col items-center justify-center gap-0.5 border-b text-center transition-colors',
                  'hover:bg-accent/35',
                  d.isToday ? 'border-primary/70' : 'border-[hsl(var(--hairline))]',
                )}
              >
                <span className={cn(
                  'text-[12px] font-semibold leading-none',
                  !d.isToday && d.dow === 0 && 'text-rose-500',
                  !d.isToday && d.dow === 6 && 'text-blue-500',
                  !d.isToday && d.dow !== 0 && d.dow !== 6 && 'text-foreground/50',
                  d.isToday && 'text-foreground',
                )}>
                  {DAYS_KO[d.dow]}
                </span>
                <span className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[15px] font-semibold tabular-nums leading-none transition-colors',
                  d.isToday
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/90 group-hover:bg-background',
                )}>
                  {d.date}
                </span>
              </button>
              <div className="flex min-h-0 flex-1 cursor-pointer flex-col bg-card">
                <WeekDropSection
                  id={`week-todo-${d.key}`}
                  data={{ kind: 'todo-list', dayKey: d.key }}
                  hint="할 일로 추가"
                  blockedKinds={['scheduled-event']}
                  className={cn(
                    'h-[148px] shrink-0 border-b border-foreground/10 bg-card px-1.5 py-1.5 transition-colors hover:bg-primary/[0.025]',
                    dayTodos.length > 4 ? 'overflow-y-auto' : 'overflow-hidden',
                  )}
                  aria-label={`${d.date}일 할 일`}
                  onClick={(e) => {
                    if (isPassiveSectionClick(e.target)) {
                      onCreateTask?.(d.iso);
                    }
                  }}
                >
                  <WeekSectionLabel icon={ListChecks} label="할 일" count={dayTodos.length} muted={dayTodos.length === 0} />
                  {dayTodos.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {dayTodos.slice(0, 4).map((task) => (
                        <DraggableWeekItem
                          key={task.id}
                          id={`week-planned-${task.id}`}
                          data={weekDragDataForTask(task)}
                        >
                          <WeekTodoRow
                            task={task}
                            listColor={task.listId ? listColorMap.get(task.listId) : undefined}
                            onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                          />
                        </DraggableWeekItem>
                      ))}
                      {dayTodos.length > 4 && (
                        <button
                          type="button"
                          onClick={() => onDayClick?.(d.iso)}
                          className="w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold text-muted-foreground hover:bg-background/70 hover:text-foreground"
                        >
                          +{dayTodos.length - 4}개 할 일
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateTask?.(d.iso)}
                      aria-label={`${d.date}일 할 일 추가`}
                      className="mt-1 h-8 w-full rounded-md border border-dashed border-transparent transition-colors hover:border-primary/20 hover:bg-primary/5"
                    />
                  )}
                </WeekDropSection>
                <WeekDropSection
                  id={`week-schedule-${d.key}`}
                  data={{ kind: 'day-column', dayIso: d.iso }}
                  hint="일정으로 추가"
                  className={cn(
                    'min-h-0 flex-1 px-1.5 py-1.5 transition-colors hover:bg-primary/[0.025]',
                    dayItems.length > 0 ? 'overflow-y-auto' : 'overflow-hidden',
                  )}
                  aria-label={`${d.date}일 일정`}
                  data-week-day-create={d.key}
                  onClick={(e) => {
                    if (isPassiveSectionClick(e.target)) {
                      onCreateEvent?.(d.iso);
                    }
                  }}
                >
                  <WeekSectionLabel icon={CalendarClock} label="일정" count={dayItems.length} muted={dayItems.length === 0} />
                  {dayItems.length === 0 ? (
                    hasCalendarItems ? (
                      <button
                        type="button"
                        onClick={() => onCreateEvent?.(d.iso)}
                        className="mt-2 h-12 w-full rounded-md transition-colors hover:bg-card"
                        aria-label={`${d.date}일 일정 추가`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreateEvent?.(d.iso)}
                        className="mt-2 h-[calc(100%-2rem)] w-full rounded-md transition-colors hover:bg-primary/5"
                        aria-label={`${d.date}일 일정 추가`}
                      />
                    )
                  ) : (
                    <div className="mt-1.5 space-y-1.5">
                      {dayItems.map((item) => {
                        const startAt = item.data.startAt!;
                        const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt;
                        const taskListColor = item.kind === 'task' && item.data.listId
                          ? listColorMap.get(item.data.listId)
                          : undefined;
                        const taskOwnColor = item.kind === 'task' && item.data.color
                          ? TASK_LIST_COLORS[item.data.color].stripe
                          : undefined;
                        const blockColor = item.kind === 'event'
                          ? item.data.color
                          : taskOwnColor ?? (taskListColor ? TASK_LIST_COLORS[taskListColor].stripe : undefined);
                        const dragData = item.kind === 'task'
                          ? weekDragDataForTask(item.data)
                          : weekDragDataForEvent(item.data);
                        return (
                          <DraggableWeekItem
                            key={item.data.id}
                            id={`week-${item.kind}-${item.data.id}`}
                            data={dragData}
                          >
                            <PlannerCard
                              variant="block"
                              kind={item.kind}
                              title={item.data.title}
                              startLabel={formatHm(startAt)}
                              durationLabel={item.durationLabel || undefined}
                              overlapping={item.overlapping}
                              done={item.kind === 'task' ? item.data.done : false}
                              color={blockColor}
                              priority={undefined}
                              hasNote={item.kind === 'task' && Boolean(item.data.note && item.data.note.length > 0)}
                              canceled={item.kind === 'task' ? item.data.canceled : undefined}
                              recurring={Boolean(item.data.recurrence)}
                              subtasks={item.kind === 'task' ? item.data.subtasks : undefined}
                              tags={item.kind === 'task' ? item.data.tags : undefined}
                              onClick={() => {
                                if (onItemClick) {
                                  onItemClick({
                                    kind: item.kind,
                                    id: item.data.id,
                                    title: item.data.title,
                                    startAt,
                                    endAt,
                                  });
                                } else if (item.kind === 'task') {
                                  taskStore.toggleDone(item.data.id);
                                }
                              }}
                            />
                          </DraggableWeekItem>
                        );
                      })}
                    </div>
                  )}
                </WeekDropSection>
              </div>
            </div>
          );
        })}
      </div>
      {!hasCalendarItems && (
        <div className="pointer-events-none absolute left-1/2 top-[76px] -translate-x-1/2 rounded-full border border-foreground/10 bg-card/90 px-3 py-1.5 text-[12px] font-medium text-muted-foreground shadow-sm">
          이번 주 예정 항목 없음
        </div>
      )}
    </div>
  );
};

const WeekSectionLabel = ({
  icon: Icon,
  label,
  count,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  muted?: boolean;
}) => (
  <div className={cn(
    'flex h-5 items-center justify-between gap-1 text-[10.5px] font-bold leading-none tracking-normal',
    muted ? 'text-muted-foreground/45' : 'text-foreground/70',
  )}>
    <span className="flex min-w-0 items-center gap-1">
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </span>
    <span className={cn(
      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
      muted ? 'bg-background/45 text-muted-foreground/45' : 'bg-background text-foreground/65',
    )}>
      {count}
    </span>
  </div>
);

const isWeekDropAssignable = (dragData?: PlannerDragData): boolean =>
  dragData?.kind === 'library-template'
  || dragData?.kind === 'inbox-task'
  || dragData?.kind === 'planned-task'
  || dragData?.kind === 'scheduled-task'
  || dragData?.kind === 'scheduled-event';

const WeekDropSection = ({
  id,
  data,
  hint,
  blockedKinds = [],
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  id: string;
  data: PlannerDropData;
  hint: string;
  blockedKinds?: PlannerDragData['kind'][];
  children: ReactNode;
}) => {
  const { active } = useDndContext();
  const activeDrag = active?.data.current as PlannerDragData | undefined;
  const blocked = Boolean(activeDrag && blockedKinds.includes(activeDrag.kind));
  const { setNodeRef, isOver } = useDroppable({ id, data });
  const showHint = isOver && isWeekDropAssignable(activeDrag);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'relative',
        isOver && (blocked ? 'bg-destructive/[0.025]' : 'bg-primary/[0.035]'),
        className,
      )}
      {...props}
    >
      {showHint && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-1 z-20 rounded-md border-2 ring-1 ring-inset',
            blocked
              ? 'border-destructive/35 bg-destructive/[0.035] ring-destructive/15'
              : 'border-primary/45 bg-primary/[0.045] ring-primary/20',
          )}
        >
          <span className={cn(
            'absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-bold leading-none shadow-sm',
            blocked
              ? 'bg-background text-destructive ring-1 ring-destructive/20'
              : 'bg-primary text-primary-foreground',
          )}>
            {blocked ? '일정은 할 일로 이동 불가' : hint}
          </span>
        </div>
      )}
      {children}
    </section>
  );
};

const WeekTodoRow = ({
  task,
  listColor,
  onClick,
}: {
  task: PlannerTask;
  listColor?: keyof typeof TASK_LIST_COLORS;
  onClick?: () => void;
}) => {
  const color = task.color
    ? TASK_LIST_COLORS[task.color].stripe
    : listColor
      ? TASK_LIST_COLORS[listColor].stripe
      : 'hsl(var(--primary))';

  return (
    <div
      data-week-todo-row={task.id}
      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px] transition-colors hover:bg-accent/45"
    >
      <button
        type="button"
        data-week-todo-complete={task.id}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          taskStore.toggleDone(task.id);
        }}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-card transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 group-hover:bg-background"
        style={{ borderColor: color }}
        aria-label={`${task.title} 완료`}
        title="완료"
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-transparent transition-colors group-hover:bg-current"
          style={{ color }}
          aria-hidden
        />
      </button>
      <button
        type="button"
        data-week-todo-title={task.id}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        className="min-w-0 flex-1 truncate text-left font-medium text-foreground/82 focus-visible:outline-none focus-visible:underline"
      >
        {task.title}
      </button>
    </div>
  );
};

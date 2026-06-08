/**
 * 주(Week) 뷰 — 7일 가로 컬럼. 각 일에 시간배정 항목 리스트.
 *
 * UX (Apple Calendar 패턴):
 * - 컬럼 헤더 클릭 → 해당 일 Day 뷰 점프
 * - 빈 컬럼 영역 클릭 → 해당 일 Day 뷰 점프 (가벼운 새 항목 진입점)
 * - 카드 클릭 → 편집 모달 (Day 뷰와 일관성)
 */
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { usePlannerCalendarRange } from '@/hooks/planner/usePlannerCalendarRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { PlannerCard } from './PlannerCard';
import { DroppableDayColumn } from './dnd/DroppableDayColumn';
import { taskListStore } from '@/services/planner/taskListStore';
import { TASK_LIST_COLORS, PLANNER_LIST_CHANGED, type PlannerTask } from '@/types/planner';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** 길이 라벨 — "30분" / "1h 10m". */
const formatDuration = (startIso: string, endIso: string): string => {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

interface WeekViewProps {
  /** 주의 기준 날짜 (이 날 포함 일~토 7일). */
  anchorIso?: string;
  /** 컬럼 헤더 / 빈 컬럼 클릭 → 해당 일로 Day 뷰 점프. */
  onDayClick?: (dayIso: string) => void;
  /** 카드 클릭 → 편집 모달 (Day 뷰와 일관성). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  /** 날짜만 있는 할 일 클릭 → 일정/할 일 편집 모달. */
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const WeekView = ({ anchorIso, onDayClick, onItemClick, onTaskClick }: WeekViewProps) => {
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

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-foreground/10 bg-card">
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
            <DroppableDayColumn key={d.iso} dayIso={d.iso} className="flex min-h-0 min-w-0 flex-col">
              <button
                type="button"
                onClick={() => onDayClick?.(d.iso)}
                aria-label={`${d.date}일 ${DAYS_KO[d.dow]}요일${d.isToday ? ' (오늘)' : ''} — Day 뷰로`}
                className={cn(
                  'group flex h-12 shrink-0 flex-col items-center justify-center gap-0.5 border-b text-center transition-colors',
                  'hover:bg-accent/35',
                  d.isToday ? 'border-primary/70' : 'border-[hsl(var(--hairline))]',
                )}
              >
                <span className={cn(
                  'text-[10.5px] font-semibold leading-none',
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
              <div
                className={cn(
                  'min-h-0 flex-1 cursor-pointer space-y-1.5 p-1.5',
                  dayItems.length > 0 || dayTodos.length > 0 ? 'overflow-y-auto' : 'overflow-hidden',
                )}
                style={{
                  backgroundImage: 'linear-gradient(to bottom, hsl(var(--foreground) / 0.075) 1px, transparent 1px)',
                  backgroundSize: '100% 56px',
                  backgroundPosition: '0 8px',
                }}
                onClick={(e) => {
                  // 카드가 아닌 빈 영역 클릭 시에만 Day 점프 (이벤트 버블링 방지).
                  if (e.target === e.currentTarget && dayItems.length === 0 && dayTodos.length === 0) {
                    onDayClick?.(d.iso);
                  }
                }}
              >
                {dayTodos.length > 0 && (
                  <div className="space-y-1 pb-1">
                    {dayTodos.slice(0, 4).map((task) => (
                      <WeekTodoRow
                        key={task.id}
                        task={task}
                        listColor={task.listId ? listColorMap.get(task.listId) : undefined}
                        onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                      />
                    ))}
                    {dayTodos.length > 4 && (
                      <button
                        type="button"
                        onClick={() => onDayClick?.(d.iso)}
                        className="w-full rounded-md px-2 py-1 text-left text-[11px] font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                      >
                        +{dayTodos.length - 4}개 할 일
                      </button>
                    )}
                  </div>
                )}
                {dayItems.length === 0 ? (
                  hasCalendarItems ? (
                    <button
                      type="button"
                      onClick={() => onDayClick?.(d.iso)}
                      className={cn(
                        'w-full text-[11px] text-muted-foreground/60 text-center hover:text-foreground hover:bg-accent/30 rounded transition-colors',
                        dayTodos.length > 0 ? 'py-2' : 'py-4',
                      )}
                      aria-label={`${d.date}일로 이동`}
                    >
                      {dayTodos.length > 0 ? '' : '—'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDayClick?.(d.iso)}
                      className="h-full w-full rounded-md transition-colors hover:bg-primary/5"
                      aria-label={`${d.date}일로 이동`}
                    />
                  )
                ) : (
                  dayItems.map((item) => {
                    const startAt = item.data.startAt!;
                    const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt;
                    // task 의 list 색을 stripe 로 사용.
                    const taskListColor = item.kind === 'task' && item.data.listId
                      ? listColorMap.get(item.data.listId)
                      : undefined;
                    const blockColor = item.kind === 'event'
                      ? item.data.color
                      : taskListColor ? TASK_LIST_COLORS[taskListColor].stripe : undefined;
                    return (
                      <PlannerCard
                        key={item.data.id}
                        variant="block"
                        kind={item.kind}
                        title={item.data.title}
                        startLabel={formatHm(startAt)}
                        durationLabel={item.durationLabel || undefined}
                        overlapping={item.overlapping}
                        done={item.kind === 'task' ? item.data.done : false}
                        color={blockColor}
                        // 주 뷰 블록도 일정 도메인 — priority 깃발 X (item 은 항상 startAt 있음).
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
                            // fallback: onItemClick 없으면 toggleDone (이전 동작 보존).
                            taskStore.toggleDone(item.data.id);
                          }
                        }}
                      />
                    );
                  })
                )}
              </div>
            </DroppableDayColumn>
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
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px] transition-colors hover:bg-accent/45"
    >
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border bg-card transition-colors group-hover:bg-background"
        style={{ borderColor: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground/82">
        {task.title}
      </span>
    </button>
  );
};

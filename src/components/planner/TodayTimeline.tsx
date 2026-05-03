/**
 * 오늘의 시간표 — 메인 컬럼.
 *
 * 24시간 30분 단위 격자 + 절대 좌표 시간 블록 + 현재 시각 빨간선.
 * 빈 슬롯 클릭 → 새 항목 추가 모달.
 * 시간 블록 클릭 → 시간 배정 변경 모달.
 * 시간 블록 우클릭 → ContextMenu (편집/완료/인박스로/삭제).
 * 시간 블록 hover → Tooltip (제목·시간 범위·길이).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Inbox as InboxIcon, Trash2, Pencil, Flag, Ban, Locate, RotateCw, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { notify } from '@/lib/notify';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlannerSection } from './PlannerSection';
import { DroppableTimeSlot } from './dnd/DroppableTimeSlot';
import { DraggableBlock } from './dnd/DraggableBlock';
import { InlineQuickAdd } from './InlineQuickAdd';
import { SubtaskProgress } from './SubtaskList';
import { taskListStore } from '@/services/planner/taskListStore';
import { computeStreakStats } from '@/lib/planner/streak';
import { parseInstanceId, isInstanceId } from '@/lib/planner/recurrence';
import type { PlannerEvent, PlannerTask, Priority } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS, TASK_LIST_COLORS, PLANNER_LIST_CHANGED } from '@/types/planner';

const HOUR_PX = 56;
const START_HOUR = 0;
const TOTAL_HOURS = 24;
/** 압축 모드 — 새벽 0~6시 + 늦은 22~24시 hide. localStorage 로 사용자 선호 저장. */
const COMPACT_KEY = 'planner.timeline.compact.v1';
const COMPACT_START = 7;
const COMPACT_END = 23;

interface TodayTimelineProps {
  dateIso?: string;
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  /** 슬롯 클릭 시 외부 모달 (현재 사용 안함 — 인라인 추가가 기본). */
  onSlotClick?: (slotIso: string) => void;
  /** 자체 헤더(라벨 + 7-23/지금 토글) 숨김 — 부모가 큰 헤더로 대체할 때 사용. */
  hideHeader?: boolean;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** 시간 블록 길이 — Tooltip + 카드 내부 둘 다 사용. 짧은 표기. */
const formatDuration = (startIso: string, endIso: string): string => {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

const computeTopPx = (iso: string, dateIso: string): number => {
  const t = new Date(iso);
  const day = new Date(dateIso);
  day.setHours(0, 0, 0, 0);
  const startOfDay = day.getTime();
  const minutesFromMidnight = (t.getTime() - startOfDay) / 60_000;
  return (minutesFromMidnight / 60) * HOUR_PX;
};

const computeHeightPx = (startIso: string, endIso: string): number => {
  const mins = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000;
  return Math.max(20, (mins / 60) * HOUR_PX);
};

export const TodayTimeline = ({ dateIso, onItemClick, onSlotClick: _externalOnSlotClick, hideHeader }: TodayTimelineProps) => {
  const baseDateIso = dateIso ?? new Date().toISOString();
  const itemsRaw = usePlannerToday(baseDateIso);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  /** 인라인 빠른 추가 — 클릭한 슬롯 ISO. null = 닫힘. */
  const [quickAddSlot, setQuickAddSlot] = useState<string | null>(null);
  /** drag-to-create 로 들어온 사용자 지정 길이(분). null = 기본 30분. */
  const [customDuration, setCustomDuration] = useState<number | undefined>();
  /** drag-to-create 중 ghost block 좌표 (분 단위, 자정 기준). */
  const [dragRange, setDragRange] = useState<{ startMin: number; currentMin: number } | null>(null);
  const dragStartRef = useRef<{ clientY: number; startMin: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /** 압축 모드 — 7~23시만 표시. */
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COMPACT_KEY) === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COMPACT_KEY, compact ? '1' : '0');
  }, [compact]);
  // 표시할 시간 범위 — compact 면 7-23 만. (선언이 useEffect 보다 먼저 와야 TDZ X)
  const visibleStart = compact ? COMPACT_START : START_HOUR;
  const visibleEnd = compact ? COMPACT_END : START_HOUR + TOTAL_HOURS;
  const visibleHours = visibleEnd - visibleStart;
  /** 사용자 lists — task 의 listId → list.color 매핑 + hidden 필터링. */
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

  // hidden list 의 task 는 시간표에서 숨김.
  const items = useMemo(
    () => itemsRaw.filter((item) => {
      if (item.kind !== 'task') return true;
      const lid = item.data.listId;
      return !lid || !hiddenListIds.has(lid);
    }),
    [itemsRaw, hiddenListIds],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (didInitialScroll.current) return;
    if (scrollRef.current) {
      // 8시 위치 — compact 면 visibleStart 빼서 보정.
      const target = (8 - visibleStart) * HOUR_PX - 16;
      scrollRef.current.scrollTop = Math.max(0, target);
      didInitialScroll.current = true;
    }
  }, [visibleStart]);

  const isToday = useMemo(() => {
    const a = new Date(baseDateIso);
    const b = new Date();
    return a.toDateString() === b.toDateString();
  }, [baseDateIso]);

  const dateLabel = useMemo(
    () => new Date(baseDateIso).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    }),
    [baseDateIso],
  );

  const nowTopPx = useMemo(() => {
    if (!isToday) return null;
    return computeTopPx(now.toISOString(), baseDateIso);
  }, [now, baseDateIso, isToday]);

  const scrollToNow = () => {
    if (!scrollRef.current || nowTopPx === null) return;
    const adjusted = nowTopPx - visibleStart * HOUR_PX;
    scrollRef.current.scrollTo({ top: Math.max(0, adjusted - 80), behavior: 'smooth' });
  };

  const handleSlotClick = (hour: number, halfHour: 0 | 30) => {
    const d = new Date(baseDateIso);
    d.setHours(hour, halfHour, 0, 0);
    setQuickAddSlot(d.toISOString());
    setCustomDuration(undefined); // 단순 click = 기본 30분
  };

  /** y 좌표(grid 내) → 분 단위 (15분 snap). */
  const yToMin = (y: number): number => {
    const m = (y / HOUR_PX) * 60;
    return Math.max(0, Math.round(m / 15) * 15);
  };

  /** 빈 영역 mousedown → drag → mouseup 으로 시간 범위 그리기.
   *  자식 block 안이면 무시 (dnd-kit 처리). 5px 미만 이동은 click 으로 (slot button onClick). */
  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-block="true"]')) return;
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = visibleStart * 60 + yToMin(y);
    dragStartRef.current = { clientY: e.clientY, startMin };

    const handleMove = (ev: PointerEvent) => {
      if (!dragStartRef.current || !gridRef.current) return;
      const r = gridRef.current.getBoundingClientRect();
      const y2 = ev.clientY - r.top;
      const m = visibleStart * 60 + yToMin(y2);
      // 5px 이상 이동했을 때만 ghost 표시 (click 과 분리).
      const moved = Math.abs(ev.clientY - dragStartRef.current.clientY);
      if (moved >= 5) {
        setDragRange({ startMin: dragStartRef.current.startMin, currentMin: m });
      }
    };

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      const start = dragStartRef.current;
      dragStartRef.current = null;
      if (!start) {
        setDragRange(null);
        return;
      }
      const moved = Math.abs(ev.clientY - start.clientY);
      if (moved < 5) {
        // click — slot button onClick 이 자동 fire.
        setDragRange(null);
        return;
      }
      if (!gridRef.current) {
        setDragRange(null);
        return;
      }
      const r = gridRef.current.getBoundingClientRect();
      const y2 = ev.clientY - r.top;
      const endRaw = visibleStart * 60 + yToMin(y2);
      const sMin = Math.min(start.startMin, endRaw);
      const eMin = Math.max(start.startMin, endRaw);
      const dur = Math.max(15, eMin - sMin);
      const startD = new Date(baseDateIso);
      startD.setHours(Math.floor(sMin / 60), sMin % 60, 0, 0);
      setQuickAddSlot(startD.toISOString());
      setCustomDuration(dur);
      setDragRange(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleDeleteTask = (task: PlannerTask) => {
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'goalId'> = {
      title: task.title, done: task.done, startAt: task.startAt, endAt: task.endAt, goalId: task.goalId,
    };
    taskStore.remove(task.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => taskStore.add(snapshot) },
    });
  };

  const handleDeleteEvent = (event: PlannerEvent) => {
    const snapshot: Omit<PlannerEvent, 'id' | 'createdAt'> = {
      title: event.title, startAt: event.startAt, endAt: event.endAt, color: event.color, source: event.source,
    };
    eventStore.remove(event.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => eventStore.add(snapshot) },
    });
  };

  const handleUnschedule = (task: PlannerTask) => {
    taskStore.unschedule(task.id);
    notify.info('대기함으로 옮겼어요', { duration: 1500 });
  };

  const handleSetPriority = (task: PlannerTask, p: Priority) => {
    taskStore.update(task.id, { priority: p === 0 ? undefined : p });
  };

  const handleToggleCanceled = (task: PlannerTask) => {
    taskStore.toggleCanceled(task.id);
    notify.success(task.canceled ? '취소 되돌림' : '취소됐어요', { duration: 1200 });
  };

  const NowButton = isToday ? (
    <button
      type="button"
      onClick={scrollToNow}
      title="현재 시각으로 스크롤"
      aria-label="현재 시각으로 스크롤"
      className="inline-flex items-center gap-1 px-1.5 h-6 rounded text-[11px] tabular-nums text-rose-500 hover:bg-rose-500/10 transition-colors font-semibold"
    >
      <Locate className="h-3.5 w-3.5" />
      지금
    </button>
  ) : null;

  const CompactToggle = (
    <button
      type="button"
      onClick={() => setCompact((v) => !v)}
      title={compact ? '24시간 모두 보기' : '주요 시간만 (7~23시)'}
      aria-label={compact ? '24시간 모두 보기' : '주요 시간만'}
      className="inline-flex items-center gap-1 px-1.5 h-6 rounded text-[11px] tabular-nums text-foreground/65 hover:text-foreground hover:bg-accent transition-colors font-semibold"
    >
      {compact ? '24h' : '7-23'}
    </button>
  );

  const sameStartCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.data.startAt) continue;
      counts.set(item.data.startAt, (counts.get(item.data.startAt) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const body = (
    <div ref={scrollRef} className="relative h-full overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div ref={gridRef} onPointerDown={handleGridPointerDown} className="relative" style={{ height: visibleHours * HOUR_PX }}>
          {/* 시간 격자 */}
          {Array.from({ length: visibleHours }, (_, i) => {
            const hour = visibleStart + i;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top: i * HOUR_PX, height: HOUR_PX }}
              >
                <div className="w-10 shrink-0 pr-1.5 text-right">
                  <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground leading-none font-semibold">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex-1 relative">
                  {(() => {
                    const slot0 = new Date(baseDateIso);
                    slot0.setHours(hour, 0, 0, 0);
                    const slot30 = new Date(baseDateIso);
                    slot30.setHours(hour, 30, 0, 0);
                    return (
                      <>
                        <DroppableTimeSlot
                          startIso={slot0.toISOString()}
                          onClick={() => handleSlotClick(hour, 0)}
                          ariaLabel={`${hour}:00`}
                          className="absolute inset-x-0 top-0 h-1/2 border-t border-foreground/15"
                        />
                        <DroppableTimeSlot
                          startIso={slot30.toISOString()}
                          onClick={() => handleSlotClick(hour, 30)}
                          ariaLabel={`${hour}:30`}
                          className="absolute inset-x-0 top-1/2 h-1/2 border-t border-dashed border-foreground/8"
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* 현재 시각 빨간선 */}
          {nowTopPx !== null && (() => {
            const adjusted = nowTopPx - visibleStart * HOUR_PX;
            // compact 모드에서 visible 범위 밖이면 hide.
            if (compact && (adjusted < 0 || adjusted > visibleHours * HOUR_PX)) return null;
            return (
            <div
              className="absolute left-10 right-0 z-20 pointer-events-none"
              style={{ top: adjusted }}
            >
              <div className="relative h-px bg-rose-500">
                <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" aria-hidden />
              </div>
            </div>
            );
          })()}

          {/* drag-to-create 중 ghost block — 사용자가 mouse drag 로 시간 범위 그리는 동안. */}
          {dragRange && (() => {
            const minA = Math.min(dragRange.startMin, dragRange.currentMin);
            const minB = Math.max(dragRange.startMin, dragRange.currentMin);
            const top = (minA - visibleStart * 60) / 60 * HOUR_PX;
            const height = Math.max(8, (minB - minA) / 60 * HOUR_PX);
            return (
              <div
                className="absolute left-10 right-2 bg-primary/15 border border-dashed border-primary/55 rounded pointer-events-none z-25"
                style={{ top, height }}
                aria-hidden
              />
            );
          })()}

          {/* 인라인 빠른 추가 — Apple Cal 패턴. 빈 슬롯 클릭 시 그 자리에 input.
              drag-to-create 면 customDuration 으로 길이 반영. */}
          {quickAddSlot && (
            <div className="absolute left-10 right-0 top-0 bottom-0 pointer-events-none z-30">
              <div className="relative h-full pointer-events-none">
                <InlineQuickAdd
                  startIso={quickAddSlot}
                  durationMin={customDuration}
                  style={{
                    top: computeTopPx(quickAddSlot, baseDateIso) - visibleStart * HOUR_PX,
                    height: customDuration ? Math.max(40, (customDuration / 60) * HOUR_PX) : 58,
                    pointerEvents: 'auto',
                  }}
                  onClose={() => { setQuickAddSlot(null); setCustomDuration(undefined); }}
                />
              </div>
            </div>
          )}

          {/* 시간 블록 */}
          <div className="absolute left-10 right-0 top-0 bottom-0 pointer-events-none">
            {(() => {
              const sameStartSeen = new Map<string, number>();
              return (
                <>
            {items.map((item) => {
              const startAt = item.data.startAt;
              const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt!;
              if (!startAt) return null;
              const laneCount = sameStartCounts.get(startAt) ?? 1;
              const laneIndex = sameStartSeen.get(startAt) ?? 0;
              sameStartSeen.set(startAt, laneIndex + 1);
              const laneWidth = 100 / laneCount;
              const top = computeTopPx(startAt, baseDateIso) - visibleStart * HOUR_PX;
              const height = computeHeightPx(startAt, endAt);
              // compact 모드에서 visible 범위 밖이면 skip.
              if (compact) {
                const startHour = new Date(startAt).getHours();
                const endHour = new Date(endAt).getHours() + (new Date(endAt).getMinutes() > 0 ? 1 : 0);
                if (endHour <= visibleStart || startHour >= visibleEnd) return null;
              }
              // stripe 색 우선순위: event.color → task.list.color → muted.
              const stripeColor =
                item.kind === 'event'
                  ? item.data.color ?? 'hsl(220 70% 55%)'
                  : (() => {
                      if (item.data.color) return TASK_LIST_COLORS[item.data.color].stripe;
                      const lid = item.data.listId;
                      if (lid) {
                        const c = listColorMap.get(lid);
                        if (c) return TASK_LIST_COLORS[c].stripe;
                      }
                      return 'hsl(var(--muted-foreground) / 0.6)';
                    })();
              const done = item.kind === 'task' ? item.data.done : false;
              const canceled = item.kind === 'task' ? Boolean(item.data.canceled) : false;
              const kindLabel = item.kind === 'event' ? '일정' : '할 일';
              const taskPriority = item.kind === 'task' ? (item.data.priority ?? 0) : 0;
              const showFlag = taskPriority > 0;
              const hasNote = item.kind === 'task' && Boolean(item.data.note && item.data.note.length > 0);
              const recurring = Boolean(item.data.recurrence);
              const dim = done || canceled;
              // 시리즈 인스턴스의 streak — master 기준 계산.
              const streakCurrent = (() => {
                if (item.kind !== 'task') return undefined;
                if (!isInstanceId(item.data.id)) return undefined;
                const parsed = parseInstanceId(item.data.id);
                if (!parsed) return undefined;
                const master = taskStore.findMaster(parsed.masterId);
                if (!master?.recurrence) return undefined;
                return computeStreakStats(master).current;
              })();

              const blockEl = (
                <DraggableBlock
                  item={item.kind === 'task'
                    ? { kind: 'task', data: item.data as PlannerTask }
                    : { kind: 'event', data: item.data as PlannerEvent }}
                  style={{
                    top,
                    height,
                    left: `${laneIndex * laneWidth}%`,
                    right: 'auto',
                    width: `calc(${laneWidth}% - 4px)`,
                  }}
                >
                <div
                  className={cn(
                    'h-full w-full',
                    'rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden',
                    'hover:border-foreground/30 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.15)] transition-all cursor-grab active:cursor-grabbing',
                    taskPriority === 3 && 'border-rose-400/70 shadow-[inset_0_0_0_1px_hsl(0_75%_55%/0.18)]',
                    taskPriority === 2 && 'border-amber-400/70',
                    dim && 'opacity-50',
                  )}
                  onClick={() => {
                    onItemClick?.({
                      kind: item.kind,
                      id: item.data.id,
                      title: item.data.title,
                      startAt,
                      endAt,
                    });
                  }}
                  onDoubleClick={() => {
                    if (item.kind === 'task') {
                      const wasDone = item.data.done;
                      taskStore.toggleDone(item.data.id);
                      notify.success(wasDone ? '완료 취소' : '완료!', { duration: 1200 });
                    }
                  }}
                >
                  <div className="flex items-stretch gap-2 h-full">
                    <span
                      className="w-[3px] shrink-0"
                      style={{ backgroundColor: stripeColor }}
                      aria-hidden
                    />
                    <div className={cn('min-w-0 flex-1 pr-1', height < 34 ? 'py-0.5' : 'py-1.5')}>
                      {height >= 34 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground tracking-wide leading-none font-semibold">
                          {formatHm(startAt)}
                        </span>
                        {height >= 60 && (
                          <span className="text-[9.5px] font-mono tabular-nums text-muted-foreground/70 leading-none">
                            · {formatDuration(startAt, endAt)}
                          </span>
                        )}
                        {showFlag && (
                          <Flag
                            className="h-2.5 w-2.5"
                            style={{ color: PRIORITY_COLORS[taskPriority as Priority], fill: PRIORITY_COLORS[taskPriority as Priority] }}
                            aria-hidden
                          />
                        )}
                        {recurring && (
                          <RotateCw
                            className="h-2.5 w-2.5 text-muted-foreground/70"
                            aria-label="반복"
                            strokeWidth={2}
                          />
                        )}
                        {item.kind === 'task' && item.data.subtasks && item.data.subtasks.length > 0 && (
                          <SubtaskProgress subtasks={item.data.subtasks} compact />
                        )}
                        {streakCurrent !== undefined && streakCurrent > 0 && (
                          <span className="text-[9.5px] font-mono tabular-nums text-amber-600 font-semibold">
                            🔥{streakCurrent}
                          </span>
                        )}
                      </div>
                      )}
                      <p className={cn(
                        'text-foreground font-medium',
                        height < 34
                          ? 'truncate text-[11.5px] leading-[13px]'
                          : 'mt-1 line-clamp-2 text-[13px] leading-snug',
                        dim && 'line-through',
                      )}>
                        {height < 34 ? `${formatHm(startAt)} ${item.data.title}` : item.data.title}
                      </p>
                      {hasNote && height >= 60 && (
                        <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
                          {item.kind === 'task' ? item.data.note : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                </DraggableBlock>
              );

              return (
                <ContextMenu key={item.data.id}>
                  <ContextMenuTrigger asChild>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>{blockEl}</TooltipTrigger>
                      <TooltipContent side="right" align="start" className="max-w-xs">
                        <div className="flex flex-col gap-1 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                              {kindLabel}
                            </span>
                            <span className="text-[12.5px] font-medium text-foreground">{item.data.title}</span>
                          </div>
                          <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">
                            {formatHm(startAt)} ~ {formatHm(endAt)}  ·  {formatDuration(startAt, endAt)}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem
                      onSelect={() => onItemClick?.({
                        kind: item.kind, id: item.data.id, title: item.data.title, startAt, endAt,
                      })}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      편집
                    </ContextMenuItem>
                    {item.kind === 'task' && (
                      <>
                        <ContextMenuItem onSelect={() => {
                          const wasDone = item.data.done;
                          taskStore.toggleDone(item.data.id);
                          notify.success(wasDone ? '완료 취소' : '완료!', { duration: 1200 });
                        }}>
                          <Check className="mr-2 h-3.5 w-3.5" />
                          {item.data.done ? '완료 취소' : '완료'}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleToggleCanceled(item.data)}>
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          {item.data.canceled ? '취소 되돌림' : '취소'}
                        </ContextMenuItem>
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>
                            <Flag
                              className="mr-2 h-3.5 w-3.5"
                              style={
                                (item.data.priority ?? 0) > 0
                                  ? { color: PRIORITY_COLORS[item.data.priority as Priority], fill: PRIORITY_COLORS[item.data.priority as Priority] }
                                  : undefined
                              }
                            />
                            우선순위
                          </ContextMenuSubTrigger>
                          <ContextMenuSubContent className="w-32">
                            {([3, 2, 1, 0] as Priority[]).map((p) => (
                              <ContextMenuItem
                                key={p}
                                onSelect={() => handleSetPriority(item.data, p)}
                                className={item.data.priority === p || (p === 0 && !item.data.priority) ? 'bg-accent' : ''}
                              >
                                {p > 0 && (
                                  <Flag
                                    className="mr-2 h-3.5 w-3.5"
                                    style={{ color: PRIORITY_COLORS[p], fill: PRIORITY_COLORS[p] }}
                                  />
                                )}
                                {p === 0 && <span className="mr-2 inline-block w-3.5" aria-hidden />}
                                {PRIORITY_LABELS[p]}
                              </ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuItem onSelect={() => handleUnschedule(item.data)}>
                          <InboxIcon className="mr-2 h-3.5 w-3.5" />
                          대기함으로
                        </ContextMenuItem>
                      </>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => {
                        if (item.kind === 'task') handleDeleteTask(item.data);
                        else handleDeleteEvent(item.data);
                      }}
                      className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      삭제
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
                </>
              );
            })()}
          </div>
        </div>
      </div>
  );

  if (hideHeader) {
    // 좌측 "계획"/"할 일" 카드들과 짝 맞춰 우측 "타임라인" 도 자체 카드.
    return (
      <section className="h-full min-h-0 flex flex-col rounded-lg border border-[hsl(var(--hairline))] bg-card p-3">
        <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2 mb-2 border-b border-[hsl(var(--hairline))]">
          <CalendarDays className="h-4 w-4 text-foreground" />
          <span className="text-[14px] font-semibold tracking-tight text-foreground leading-none">
            타임라인
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            {CompactToggle}
            {NowButton}
          </span>
        </div>
        <div className="flex-1 min-h-0">{body}</div>
      </section>
    );
  }

  return (
    <PlannerSection label="오늘" count={dateLabel} action={
      <span className="inline-flex items-center gap-2">
        {CompactToggle}
        {NowButton}
      </span>
    } className="h-full">
      {body}
    </PlannerSection>
  );
};

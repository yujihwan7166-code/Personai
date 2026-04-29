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
import { Check, Inbox as InboxIcon, Trash2, Pencil } from 'lucide-react';
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
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlannerSection } from './PlannerSection';
import type { PlannerEvent, PlannerTask } from '@/types/planner';

const HOUR_PX = 56;
const START_HOUR = 0;
const TOTAL_HOURS = 24;

interface TodayTimelineProps {
  dateIso?: string;
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  onSlotClick?: (slotIso: string) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

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

export const TodayTimeline = ({ dateIso, onItemClick, onSlotClick }: TodayTimelineProps) => {
  const baseDateIso = dateIso ?? new Date().toISOString();
  const items = usePlannerToday(baseDateIso);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (didInitialScroll.current) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_PX - 16;
      didInitialScroll.current = true;
    }
  }, []);

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

  const handleSlotClick = (hour: number, halfHour: 0 | 30) => {
    if (!onSlotClick) return;
    const d = new Date(baseDateIso);
    d.setHours(hour, halfHour, 0, 0);
    onSlotClick(d.toISOString());
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
    notify.info('인박스로 옮겼어요', { duration: 1500 });
  };

  return (
    <PlannerSection label="오늘" count={dateLabel} className="h-full">
      <div ref={scrollRef} className="relative h-full overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="relative" style={{ height: TOTAL_HOURS * HOUR_PX }}>
          {/* 시간 격자 */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const hour = START_HOUR + i;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top: i * HOUR_PX, height: HOUR_PX }}
              >
                <div className="w-12 shrink-0 pr-2 text-right">
                  <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground leading-none font-semibold">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => handleSlotClick(hour, 0)}
                    className="absolute inset-x-0 top-0 h-1/2 border-t border-[hsl(var(--hairline))] hover:bg-accent/30 transition-colors"
                    aria-label={`${hour}:00`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSlotClick(hour, 30)}
                    className="absolute inset-x-0 top-1/2 h-1/2 border-t border-dashed border-[hsl(var(--hairline))] hover:bg-accent/30 transition-colors"
                    aria-label={`${hour}:30`}
                  />
                </div>
              </div>
            );
          })}

          {/* 현재 시각 빨간선 */}
          {nowTopPx !== null && (
            <div
              className="absolute left-12 right-0 z-20 pointer-events-none"
              style={{ top: nowTopPx }}
            >
              <div className="relative h-px bg-rose-500">
                <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" aria-hidden />
              </div>
            </div>
          )}

          {/* 시간 블록 */}
          <div className="absolute left-12 right-0 top-0 bottom-0 pointer-events-none">
            {items.map((item) => {
              const startAt = item.data.startAt;
              const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt!;
              if (!startAt) return null;
              const top = computeTopPx(startAt, baseDateIso);
              const height = computeHeightPx(startAt, endAt);
              const stripeColor =
                item.kind === 'event'
                  ? item.data.color ?? 'hsl(220 70% 55%)'
                  : 'hsl(var(--muted-foreground) / 0.6)';
              const done = item.kind === 'task' ? item.data.done : false;
              const kindLabel = item.kind === 'event' ? '일정' : '할 일';

              const blockEl = (
                <div
                  className={cn(
                    'absolute left-1 right-2 pointer-events-auto',
                    'rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden',
                    'hover:border-foreground/30 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.15)] transition-all cursor-pointer z-10',
                    done && 'opacity-50',
                  )}
                  style={{ top, height }}
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
                    <div className="min-w-0 flex-1 py-1.5 pr-1">
                      <span className="block text-[10.5px] font-mono tabular-nums text-muted-foreground tracking-wide leading-none font-semibold">
                        {formatHm(startAt)}
                      </span>
                      <p className={cn(
                        'text-[13px] leading-snug mt-1 text-foreground font-medium',
                        height < 40 ? 'truncate' : 'line-clamp-2',
                        done && 'line-through',
                      )}>
                        {item.data.title}
                      </p>
                    </div>
                  </div>
                </div>
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
                        <ContextMenuItem onSelect={() => handleUnschedule(item.data)}>
                          <InboxIcon className="mr-2 h-3.5 w-3.5" />
                          인박스로
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
          </div>
        </div>
      </div>
    </PlannerSection>
  );
};

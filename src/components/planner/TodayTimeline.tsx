/**
 * 오늘의 시간표 — 메인 컬럼.
 *
 * Phase 4: 24시간 30분 단위 격자 + 절대 좌표 시간 블록 + 현재 시각 빨간선.
 * 빈 시간 슬롯 클릭 → 새 항목 추가 모달 (onSlotClick).
 * 시간 블록 클릭 → 시간 배정 변경 모달 (onItemClick, task 만).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PlannerSection } from './PlannerSection';

const HOUR_PX = 56;          // 1시간 높이 (= 30분 × 2 row)
const SLOT_PX = HOUR_PX / 2; // 30분 슬롯 높이
const START_HOUR = 0;        // 자정부터 (스크롤 위치 시 8시로 자동 이동)
const TOTAL_HOURS = 24;

interface TodayTimelineProps {
  dateIso?: string;
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
  onSlotClick?: (slotIso: string) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

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

  // 현재 시각 1분마다 갱신.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 첫 렌더 시 8시로 스크롤.
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
                {/* 시간 라벨 */}
                <div className="w-12 shrink-0 pr-2 text-right">
                  <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground leading-none font-semibold">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                {/* 슬롯 (00분 / 30분) */}
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

          {/* 시간 블록 (절대 좌표) */}
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
              return (
                <div
                  key={item.data.id}
                  className={cn(
                    'absolute left-1 right-2 pointer-events-auto',
                    'rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden',
                    'hover:border-foreground/30 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.15)] transition-all cursor-pointer z-10',
                    done && 'opacity-50',
                  )}
                  style={{ top, height }}
                  onClick={() => {
                    if (item.kind === 'task') {
                      // 빠른 done 토글 vs 시간 변경 모달 — Shift 키로 분기. 기본은 토글.
                      onItemClick?.({
                        kind: 'task',
                        id: item.data.id,
                        title: item.data.title,
                        startAt,
                        endAt,
                      });
                    } else {
                      onItemClick?.({
                        kind: 'event',
                        id: item.data.id,
                        title: item.data.title,
                        startAt,
                        endAt,
                      });
                    }
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
            })}
          </div>
        </div>
      </div>
    </PlannerSection>
  );
};

/**
 * 주(Week) 뷰 — 7일 가로 컬럼. 각 일에 시간배정 항목 리스트.
 *
 * UX (Apple Calendar 패턴):
 * - 컬럼 헤더 클릭 → 해당 일 Day 뷰 점프
 * - 빈 컬럼 영역 클릭 → 해당 일 Day 뷰 점프 (가벼운 새 항목 진입점)
 * - 카드 클릭 → 편집 모달 (Day 뷰와 일관성)
 */
import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { toDateKey } from '@/lib/planner/habitStats';
import { PlannerSection } from './PlannerSection';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';
import { DroppableDayColumn } from './dnd/DroppableDayColumn';
import { taskListStore } from '@/services/planner/taskListStore';
import { TASK_LIST_COLORS, PLANNER_LIST_CHANGED } from '@/types/planner';

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
}

export const WeekView = ({ anchorIso, onDayClick, onItemClick }: WeekViewProps) => {
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
  const { start, end, days, weekLabel } = useMemo(() => {
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

    const monthLabel = startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: dayList,
      weekLabel: monthLabel,
    };
  }, [anchorIso]);

  const items = usePlannerRange(start, end);

  // 일별로 그룹핑 — 로컬 시각 기준 (UTC slice 버그 회피).
  // 같은 날 안에서 startAt 오름차순 정렬 + overlap 플래그 합성.
  const itemsByDay = useMemo(() => {
    type DayItem = typeof items[number] & { overlapping: boolean; durationLabel: string };
    const map = new Map<string, DayItem[]>();

    // 1) 로컬 날짜 키로 분류
    const grouped = new Map<string, typeof items>();
    items.forEach((item) => {
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
  }, [items]);

  return (
    <PlannerSection label="주" count={weekLabel} className="h-full">
      <div className="grid grid-cols-7 gap-2 h-full min-h-0">
        {days.map((d) => {
          const dayItems = itemsByDay.get(d.key) ?? [];
          return (
            <DroppableDayColumn key={d.iso} dayIso={d.iso} className="flex flex-col min-h-0 min-w-0 rounded-md">
              <button
                type="button"
                onClick={() => onDayClick?.(d.iso)}
                aria-label={`${d.date}일 ${DAYS_KO[d.dow]}요일${d.isToday ? ' (오늘)' : ''} — Day 뷰로`}
                className={cn(
                  'flex items-baseline gap-1 pb-2 mb-1.5 border-b text-left transition-colors',
                  'hover:bg-accent/40 rounded-t-md px-1 -mx-1',
                  d.isToday ? 'border-primary' : 'border-[hsl(var(--hairline))]',
                )}
              >
                <span className={cn(
                  'text-[10.5px] font-mono uppercase tracking-[0.1em] font-semibold',
                  !d.isToday && d.dow === 0 && 'text-rose-500',
                  !d.isToday && d.dow === 6 && 'text-blue-500',
                  !d.isToday && d.dow !== 0 && d.dow !== 6 && 'text-muted-foreground',
                  d.isToday && 'text-foreground',
                )}>
                  {DAYS_KO[d.dow]}
                </span>
                <span className="text-[15px] font-semibold tabular-nums leading-none text-foreground">
                  {d.date}
                </span>
              </button>
              <div
                className="flex-1 min-h-0 overflow-y-auto space-y-1.5 cursor-pointer"
                onClick={(e) => {
                  // 카드가 아닌 빈 영역 클릭 시에만 Day 점프 (이벤트 버블링 방지).
                  if (e.target === e.currentTarget && dayItems.length === 0) {
                    onDayClick?.(d.iso);
                  }
                }}
              >
                {dayItems.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onDayClick?.(d.iso)}
                    className="w-full text-[11px] text-muted-foreground/70 text-center py-4 hover:text-foreground hover:bg-accent/30 rounded transition-colors"
                    aria-label={`${d.date}일로 이동`}
                  >
                    —
                  </button>
                ) : (
                  dayItems
                    .filter((item) => {
                      if (item.kind !== 'task') return true;
                      const lid = item.data.listId;
                      return !lid || !hiddenListIds.has(lid);
                    })
                    .map((item) => {
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
      {items.length === 0 && (
        <PlannerEmpty
          icon={<CalendarIcon className="h-6 w-6" />}
          title="이번 주는 비어 있어요"
              hint="대기함에서 할 일을 골라 시간을 배정해보세요"
        />
      )}
    </PlannerSection>
  );
};

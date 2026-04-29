/**
 * 주(Week) 뷰 — 7일 가로 컬럼. 각 일에 시간배정 항목 리스트.
 *
 * UX (Apple Calendar 패턴):
 * - 컬럼 헤더 클릭 → 해당 일 Day 뷰 점프
 * - 빈 컬럼 영역 클릭 → 해당 일 Day 뷰 점프 (가벼운 새 항목 진입점)
 * - 카드 클릭 → 편집 모달 (Day 뷰와 일관성)
 */
import { useMemo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { PlannerSection } from './PlannerSection';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

interface WeekViewProps {
  /** 주의 기준 날짜 (이 날 포함 일~토 7일). */
  anchorIso?: string;
  /** 컬럼 헤더 / 빈 컬럼 클릭 → 해당 일로 Day 뷰 점프. */
  onDayClick?: (dayIso: string) => void;
  /** 카드 클릭 → 편집 모달 (Day 뷰와 일관성). */
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
}

export const WeekView = ({ anchorIso, onDayClick, onItemClick }: WeekViewProps) => {
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

  // 일별로 그룹핑.
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
    <PlannerSection label="주" count={weekLabel} className="h-full">
      <div className="grid grid-cols-7 gap-2 h-full min-h-0">
        {days.map((d) => {
          const dayKey = d.iso.slice(0, 10);
          const dayItems = itemsByDay.get(dayKey) ?? [];
          return (
            <div key={d.iso} className="flex flex-col min-h-0 min-w-0">
              <button
                type="button"
                onClick={() => onDayClick?.(d.iso)}
                aria-label={`${d.date}일 ${DAYS_KO[d.dow]}요일${d.isToday ? ' (오늘)' : ''} — Day 뷰로`}
                className={cn(
                  'flex items-baseline gap-1 pb-2 mb-1.5 border-b text-left transition-colors',
                  'hover:bg-accent/40 rounded-t-md px-1 -mx-1',
                  d.isToday ? 'border-foreground' : 'border-[hsl(var(--hairline))]',
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
                  dayItems.map((item) => {
                    const startAt = item.data.startAt!;
                    const endAt = item.kind === 'event' ? item.data.endAt : item.data.endAt ?? startAt;
                    return (
                      <PlannerCard
                        key={item.data.id}
                        variant="block"
                        kind={item.kind}
                        title={item.data.title}
                        startLabel={formatHm(startAt)}
                        done={item.kind === 'task' ? item.data.done : false}
                        color={item.kind === 'event' ? item.data.color : undefined}
                        priority={item.kind === 'task' ? item.data.priority : undefined}
                        hasNote={item.kind === 'task' && Boolean(item.data.note && item.data.note.length > 0)}
                        canceled={item.kind === 'task' ? item.data.canceled : undefined}
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
            </div>
          );
        })}
      </div>
      {items.length === 0 && (
        <PlannerEmpty
          icon={<CalendarIcon className="h-6 w-6" />}
          title="이번 주는 비어 있어요"
          hint="좌측 인박스에서 할 일을 골라 시간을 배정해보세요"
        />
      )}
    </PlannerSection>
  );
};

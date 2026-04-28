/**
 * 주(Week) 뷰 — 7일 가로 컬럼. 각 일에 시간배정 항목 리스트.
 *
 * Phase 3: 7 컬럼 단순 리스트 (오늘 강조).
 * Phase 4: 컬럼 안 30분 격자 + 절대 좌표.
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
}

export const WeekView = ({ anchorIso }: WeekViewProps) => {
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
              <div className={cn(
                'flex items-baseline gap-1 pb-2 mb-1.5 border-b',
                d.isToday ? 'border-foreground' : 'border-[hsl(var(--hairline))]',
              )}>
                <span className={cn(
                  'text-[10px] font-mono uppercase tracking-[0.1em] font-semibold',
                  !d.isToday && d.dow === 0 && 'text-rose-500/80',
                  !d.isToday && d.dow === 6 && 'text-blue-500/80',
                  !d.isToday && d.dow !== 0 && d.dow !== 6 && 'text-muted-foreground/70',
                  d.isToday && 'text-foreground',
                )}>
                  {DAYS_KO[d.dow]}
                </span>
                <span className={cn(
                  'text-[14px] font-semibold tabular-nums leading-none',
                  d.isToday ? 'text-foreground' : 'text-foreground/70',
                )}>
                  {d.date}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                {dayItems.length === 0 ? (
                  <div className="text-[10.5px] text-muted-foreground/40 text-center py-4">—</div>
                ) : (
                  dayItems.map((item) => (
                    <PlannerCard
                      key={item.data.id}
                      variant="block"
                      kind={item.kind}
                      title={item.data.title}
                      startLabel={formatHm(item.data.startAt!)}
                      done={item.kind === 'task' ? item.data.done : false}
                      color={item.kind === 'event' ? item.data.color : undefined}
                      onClick={() => {
                        if (item.kind === 'task') taskStore.toggleDone(item.data.id);
                      }}
                    />
                  ))
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

/**
 * 사이드바 미니 월 캘린더 — 빠른 날짜 점프.
 *
 * - 클릭 = 그 날로 anchor 점프
 * - 셀 아래 도트 = 그 날 활성 항목 카운트(시간 잡힌 + plannedFor)
 * - ◀ ▶ = 표시 월만 변경 (anchor 는 유지). anchor 가 다른 월로 바뀌면 자동 동기화.
 * - 오늘 셀 = 외곽선 강조
 * - selected (=anchor) 셀 = filled 배경
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { cn } from '@/lib/utils';
import { PLANNER_EVENT_CHANGED, PLANNER_TASK_CHANGED } from '@/types/planner';

interface PlannerMiniMonthProps {
  anchorIso: string;
  onSelectDay: (dayIso: string) => void;
}

const localDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const PlannerMiniMonth = ({ anchorIso, onSelectDay }: PlannerMiniMonthProps) => {
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);
  const anchorYM = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  const [viewMonth, setViewMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));

  // anchor 의 year+month 가 바뀌면 표시 월도 따라감 — 외부 점프 시 동기화.
  // deps 는 anchorYM (string) 만 — Date 객체 reference 변동으로 인한 무한 루프 방지.
  useEffect(() => {
    const [y, m] = anchorYM.split('-').map(Number);
    setViewMonth(new Date(y, m, 1));
     
  }, [anchorYM]);

  // 그 달 셀 계산 — 일요일 시작 7x6 grid.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startWeekday = firstOfMonth.getDay(); // 0=일
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  // 도트 카운트 — task plannedFor + startAt + event startAt 기준 dayKey 별 합산.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
    };
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const bump = (key: string) => map.set(key, (map.get(key) ?? 0) + 1);
    for (const t of taskStore.list()) {
      if (t.done || t.canceled || t.someday) continue;
      if (t.startAt) bump(localDateKey(new Date(t.startAt)));
      else if (t.plannedFor) bump(t.plannedFor);
    }
    for (const e of eventStore.list()) {
      if (e.startAt) bump(localDateKey(new Date(e.startAt)));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const todayKey = localDateKey(new Date());
  const anchorKey = localDateKey(anchor);

  const monthLabel = viewMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <section className="px-1">
      {/* 월 네비 */}
      <div className="flex items-center justify-between px-1 mb-1.5">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          aria-label="이전 월"
          className="flex h-6 w-6 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[12.5px] font-semibold text-foreground tabular-nums">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          aria-label="다음 월"
          className="flex h-6 w-6 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-y-0.5 px-0.5 mb-0.5">
        {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
          <span
            key={w}
            className={cn(
              'text-[10px] font-mono text-center text-foreground/55',
              i === 0 && 'text-rose-500/70',
              i === 6 && 'text-blue-500/70',
            )}
          >
            {w}
          </span>
        ))}
      </div>

      {/* 셀 grid */}
      <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
        {cells.map((d, i) => {
          const key = localDateKey(d);
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === anchorKey;
          const count = counts.get(key) ?? 0;
          const dow = d.getDay();
          return (
            <button
              key={`${key}-${i}`}
              type="button"
              onClick={() => onSelectDay(d.toISOString())}
              aria-label={`${d.toLocaleDateString('ko-KR')} 선택`}
              className={cn(
                'relative h-7 rounded text-[11.5px] tabular-nums font-medium transition-colors',
                'flex items-center justify-center',
                !inMonth && 'text-foreground/25',
                inMonth && !isSelected && !isToday && 'text-foreground/85 hover:bg-accent',
                inMonth && !isSelected && dow === 0 && 'text-rose-500/80',
                inMonth && !isSelected && dow === 6 && 'text-blue-500/80',
                isToday && !isSelected && 'ring-1 ring-foreground/40 text-foreground',
                isSelected && 'bg-foreground text-background hover:bg-foreground/90',
              )}
            >
              <span className="leading-none">{d.getDate()}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' : 'bg-foreground/55',
                  )}
                  aria-label={`${count}개 항목`}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

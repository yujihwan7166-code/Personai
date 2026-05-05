/**
 * 일기 캘린더 미니 — 페이지 우측 사이드.
 *
 * Apple Calendar 미니 패턴:
 * - 6주 × 7일 격자
 * - 작성한 날 dot (강도 차등: 1-2 vs 3+)
 * - 오늘 = 동그란 채움
 * - 좌우 화살표로 월 이동
 * - 셀 클릭 → 그 날 일기로 점프 (검색에 날짜 prefix)
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/types/journal';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface JournalCalendarMiniProps {
  entries: JournalEntry[];
  /** 셀 클릭 시 호출 — 페이지에서 그 날 일기 점프/필터에 사용. */
  onDayClick?: (dateYYYYMMDD: string) => void;
  /** 선택된 날 강조 (페이지에서 set). */
  selectedDate?: string | null;
}

const monthLabelOf = (d: Date): string =>
  d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

export const JournalCalendarMini = ({ entries, onDayClick, selectedDate }: JournalCalendarMiniProps) => {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // 일별 카운트 — 그 달 + 오버플로우 셀 포함.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.date, (map.get(e.date) ?? 0) + 1);
    });
    return map;
  }, [entries]);

  const { weeks, monthLabel } = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startOffset = firstOfMonth.getDay();
    const totalDays = startOffset + lastOfMonth.getDate();
    const totalCells = Math.ceil(totalDays / 7) * 7;

    const cells: Array<{
      iso: string;
      date: number;
      isToday: boolean;
      isOtherMonth: boolean;
      busyCount: number;
      isSelected: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      const d = new Date(year, month, dayNum);
      d.setHours(0, 0, 0, 0);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        iso: dayKey,
        date: d.getDate(),
        isToday: d.getTime() === today.getTime(),
        isOtherMonth: dayNum < 1 || dayNum > lastOfMonth.getDate(),
        busyCount: counts.get(dayKey) ?? 0,
        isSelected: selectedDate === dayKey,
      });
    }

    const weekRows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }

    return {
      weeks: weekRows,
      monthLabel: monthLabelOf(anchorDate),
    };
  }, [anchorDate, today, counts, selectedDate]);

  // 이번 달 작성률 (간단 통계)
  const monthStats = useMemo(() => {
    const ym = `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, '0')}`;
    const writtenDays = new Set<string>();
    entries.forEach((e) => {
      if (e.date.startsWith(ym)) writtenDays.add(e.date);
    });
    const totalDays = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
    return { written: writtenDays.size, total: totalDays };
  }, [entries, anchorDate]);

  const shiftMonth = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(1);
    next.setMonth(next.getMonth() + delta);
    setAnchorDate(next);
  };

  return (
    <aside className="rounded-2xl border border-[hsl(var(--hairline))] bg-card p-4 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
      {/* 헤더 — 월 네비 */}
      <header className="flex items-center justify-between mb-2.5">
        <h3 className="text-[12.5px] font-semibold tracking-tight text-foreground">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="지난달"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="px-1.5 h-6 text-[10px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="다음달"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_KO.map((d, i) => (
          <span
            key={d}
            className={cn(
              'text-[9px] font-mono uppercase font-semibold text-center',
              i === 0 && 'text-rose-500',
              i === 6 && 'text-blue-500',
              i !== 0 && i !== 6 && 'text-muted-foreground',
            )}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 6주 격자 */}
      <div className="grid grid-rows-6 gap-px">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((cell, ci) => (
              <button
                key={`${cell.iso}-${ci}`}
                type="button"
                onClick={() => cell.busyCount > 0 && onDayClick?.(cell.iso)}
                disabled={cell.busyCount === 0 && !cell.isToday}
                className={cn(
                  'relative aspect-square flex items-center justify-center text-[10.5px] tabular-nums rounded transition-colors',
                  cell.busyCount > 0 ? 'cursor-pointer hover:bg-accent' : 'cursor-default',
                  cell.isToday && 'ring-1 ring-foreground/30',
                  cell.isSelected && 'bg-foreground text-background font-semibold',
                  !cell.isSelected && cell.isOtherMonth && 'text-muted-foreground/40',
                  !cell.isSelected && !cell.isOtherMonth && cell.busyCount === 0 && 'text-foreground/60',
                  !cell.isSelected && !cell.isOtherMonth && cell.busyCount > 0 && 'text-foreground font-medium',
                )}
              >
                {cell.date}
                {cell.busyCount > 0 && !cell.isSelected && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full',
                      cell.busyCount >= 3 ? 'h-[3px] w-[3px] bg-foreground' : 'h-[2px] w-[2px] bg-foreground/60',
                    )}
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 이번 달 통계 */}
      <footer className="mt-3 pt-2.5 border-t border-[hsl(var(--hairline))] flex items-center justify-between">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
          이번 달
        </span>
        <span className="text-[11px] tabular-nums text-foreground font-semibold">
          {monthStats.written} / {monthStats.total}
        </span>
      </footer>
    </aside>
  );
};

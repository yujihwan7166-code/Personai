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

// 월요일 시작 — 일기는 월~일 한 주 단위 (lib/journalWeek 와 일관)
const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];

interface JournalCalendarMiniProps {
  entries: JournalEntry[];
  /** 셀 클릭 시 호출 — 페이지에서 그 날 일기 점프/필터에 사용. */
  onDayClick?: (dateYYYYMMDD: string) => void;
  /** 선택된 날 강조 (페이지에서 set). */
  selectedDate?: string | null;
  /** WeekBoard 가 보고 있는 주의 anchor — 그 주 row 박스로 강조 (양 동기화). */
  currentWeekAnchor?: string | null;
}

const monthLabelOf = (d: Date): string =>
  d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

/** 주어진 ISO 날짜의 월요일 ISO (YYYY-MM-DD). */
const mondayOf = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const JournalCalendarMini = ({
  entries,
  onDayClick,
  selectedDate,
  currentWeekAnchor,
}: JournalCalendarMiniProps) => {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // 일별 카운트 + 첫 entry — 그 달 + 오버플로우 셀 포함.
  const { counts, firstEntries } = useMemo(() => {
    const cnt = new Map<string, number>();
    const first = new Map<string, JournalEntry>();
    // 시간순 정렬 후 처음 발견되는 entry 가 첫 entry 가 되도록
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    sorted.forEach((e) => {
      cnt.set(e.date, (cnt.get(e.date) ?? 0) + 1);
      if (!first.has(e.date)) first.set(e.date, e);
    });
    return { counts: cnt, firstEntries: first };
  }, [entries]);

  const hoverEntry = hoverDate ? firstEntries.get(hoverDate) : null;

  // 현재 보는 주의 월요일 — 강조 row 매칭에 사용
  const currentMondayKey = useMemo(() => {
    if (!currentWeekAnchor) return null;
    return mondayOf(currentWeekAnchor.slice(0, 10));
  }, [currentWeekAnchor]);

  const { weeks, monthLabel } = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    // 월요일=0, 일요일=6 변환 (한국식)
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
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
            className="px-1.5 h-6 text-[11px] font-medium tracking-[-0.005em] text-muted-foreground hover:text-foreground transition-colors"
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

      {/* 요일 헤더 — 월요일 시작, 토(파랑) / 일(분홍) */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_KO.map((d, i) => (
          <span
            key={d}
            className={cn(
              'text-[10.5px] font-semibold text-center tracking-[-0.005em]',
              i === 5 && 'text-blue-500', // 토
              i === 6 && 'text-rose-500', // 일
              i < 5 && 'text-muted-foreground',
            )}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 6주 격자 — 현재 보는 주 row = 옅은 primary tint fill (WeekBoard 와 동기화) */}
      <div className="grid grid-rows-6 gap-0.5">
        {weeks.map((week, wi) => {
          const rowMon = week[0]?.iso ? mondayOf(week[0].iso) : null;
          const isCurrentRow = !!currentMondayKey && rowMon === currentMondayKey;
          return (
          <div
            key={wi}
            className={cn(
              'grid grid-cols-7 gap-px rounded-lg transition-colors',
              isCurrentRow && 'bg-primary/[0.07]',
            )}
          >
            {week.map((cell, ci) => (
              <button
                key={`${cell.iso}-${ci}`}
                type="button"
                onClick={() => cell.busyCount > 0 && onDayClick?.(cell.iso)}
                onMouseEnter={() => cell.busyCount > 0 && setHoverDate(cell.iso)}
                onMouseLeave={() => setHoverDate((cur) => (cur === cell.iso ? null : cur))}
                disabled={cell.busyCount === 0 && !cell.isToday}
                className={cn(
                  'relative aspect-square flex items-center justify-center text-[10.5px] tabular-nums transition-colors',
                  // 오늘 = primary 보라 둥근 fill (Apple iOS 패턴) — 가장 강한 신호
                  cell.isToday && !cell.isSelected && 'bg-primary text-primary-foreground rounded-full font-semibold shadow-[0_1px_2px_hsl(265_50%_52%/0.25)]',
                  // 선택된 cell (오늘 X) = 검은 fill
                  cell.isSelected && !cell.isToday && 'bg-foreground text-background rounded-full font-semibold',
                  // 오늘 + 선택 = primary 진한 fill (오늘 색 우선)
                  cell.isToday && cell.isSelected && 'bg-primary text-primary-foreground rounded-full font-semibold ring-2 ring-primary/30 ring-offset-1 ring-offset-card',
                  // 평범한 cell — rounded-md, hover bg-accent
                  !cell.isToday && !cell.isSelected && 'rounded-md',
                  !cell.isToday && !cell.isSelected && cell.busyCount > 0 && 'cursor-pointer hover:bg-accent',
                  !cell.isToday && !cell.isSelected && cell.busyCount === 0 && 'cursor-default',
                  // 색 위계 (selected/today 가 아닐 때)
                  !cell.isSelected && !cell.isToday && cell.isOtherMonth && 'text-muted-foreground/40',
                  !cell.isSelected && !cell.isToday && !cell.isOtherMonth && cell.busyCount === 0 && 'text-foreground/60',
                  !cell.isSelected && !cell.isToday && !cell.isOtherMonth && cell.busyCount > 0 && 'text-foreground font-medium',
                )}
              >
                {cell.date}
                {cell.busyCount > 0 && !cell.isSelected && !cell.isToday && (
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
          );
        })}
      </div>

      {/* 이번 달 통계 — hover 시 그 날 entry 미리보기로 swap (Day One 패턴) */}
      <footer className="mt-3 pt-2.5 border-t border-[hsl(var(--hairline))]">
        {hoverEntry && hoverDate ? (
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-semibold tabular-nums text-foreground/85 shrink-0">
              {parseInt(hoverDate.slice(5, 7), 10)}/{parseInt(hoverDate.slice(8, 10), 10)}
            </span>
            <span className="text-[11px] text-muted-foreground/85 truncate min-w-0 tracking-[-0.005em]">
              {hoverEntry.body.trim().slice(0, 50) || '(빈 본문)'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-muted-foreground tracking-[-0.005em]">
              이번 달
            </span>
            <span className="text-[11px] tabular-nums text-foreground font-semibold">
              {monthStats.written} / {monthStats.total}
            </span>
          </div>
        )}
      </footer>
    </aside>
  );
};

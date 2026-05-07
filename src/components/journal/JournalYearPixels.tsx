/**
 * Year Stripe — 1년 mood 컨트리뷰션 그래프 (Github contribution 패턴).
 *
 * 7 row (월~일) × ~53 col (주). 컴팩트 가로형 strip.
 * 사이드바 280px 폭에 적합 (이전 12×31 길쭉한 grid 대체).
 *
 * 각 cell:
 *   - 작성됨 + mood = mood 색
 *   - 작성됨 + mood 없음 = foreground/40
 *   - 빈 날 = foreground/[0.06]
 *   - 미래 = transparent
 *   - 오늘 = primary ring
 *
 * 클릭 → 그 날 entry 편집 / 새 entry. 호버 → 푸터 preview.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_TINT, MOOD_EMOJI } from '@/types/journal';

interface JournalYearPixelsProps {
  entries: JournalEntry[];
  /** 표시할 연도 (기본 = 올해). */
  year?: number;
  /** dot 클릭 — 작성된 날이면 그날 첫 entry, 빈 날이면 그 날짜 새 entry. */
  onDayClick?: (dateIso: string, entry: JournalEntry | null) => void;
}

const WEEKDAYS_SHORT = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKDAY_LABELS_SPARSE = ['월', '', '수', '', '금', '', '']; // 월·수·금만 sparse 라벨
const MONTH_LABELS_KO = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 월요일=0, 일요일=6 으로 매핑. */
function dowMonStart(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export const JournalYearPixels = ({
  entries,
  year: yearProp,
  onDayClick,
}: JournalYearPixelsProps) => {
  const year = yearProp ?? new Date().getFullYear();
  const today = ymd(new Date());

  // 날짜별 첫 entry + mood lookup
  const byDate = useMemo(() => {
    const m = new Map<string, { entry: JournalEntry; mood: Mood | null; count: number }>();
    for (const e of entries) {
      if (!e.date.startsWith(`${year}-`)) continue;
      const existing = m.get(e.date);
      if (existing) {
        existing.count += 1;
        if (existing.mood === null && e.mood !== undefined) existing.mood = e.mood;
      } else {
        m.set(e.date, {
          entry: e,
          mood: e.mood !== undefined ? (e.mood as Mood) : null,
          count: 1,
        });
      }
    }
    return m;
  }, [entries, year]);

  /**
   * 1월 1일이 속한 주의 월요일을 시작점으로 하여 매주 7 cell × N col 생성.
   * 각 cell = 그 주의 월~일 1일.
   * Github 패턴: col = week, row = 요일.
   */
  const { columns, monthHeaderCells } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const startMon = new Date(jan1);
    startMon.setHours(0, 0, 0, 0);
    startMon.setDate(jan1.getDate() - dowMonStart(jan1)); // 1월 1일이 속한 주의 월요일

    const dec31 = new Date(year, 11, 31);
    dec31.setHours(0, 0, 0, 0);

    // 12월 31일이 속한 주의 일요일까지 채움
    const endSun = new Date(dec31);
    endSun.setDate(dec31.getDate() + (6 - dowMonStart(dec31)));

    const totalDays = Math.floor((endSun.getTime() - startMon.getTime()) / 86400000) + 1;
    const weekCount = totalDays / 7;

    const cols: Array<{
      weekIdx: number;
      cells: Array<{
        iso: string;
        inYear: boolean;
        isToday: boolean;
        isFuture: boolean;
      }>;
      firstMonth0: number; // 그 주 첫 일의 month
    }> = [];

    for (let w = 0; w < weekCount; w++) {
      const weekCells: typeof cols[number]['cells'] = [];
      let firstMonth0 = -1;
      for (let r = 0; r < 7; r++) {
        const d = new Date(startMon);
        d.setDate(startMon.getDate() + w * 7 + r);
        const inYear = d.getFullYear() === year;
        if (inYear && firstMonth0 === -1) firstMonth0 = d.getMonth();
        const iso = ymd(d);
        weekCells.push({
          iso,
          inYear,
          isToday: iso === today,
          isFuture: iso > today,
        });
      }
      cols.push({
        weekIdx: w,
        cells: weekCells,
        firstMonth0,
      });
    }

    // 월 라벨 위치 — 각 달의 첫 등장 col 만 라벨 표시
    const monthFirstCol = new Array(12).fill(-1);
    cols.forEach((c) => {
      if (c.firstMonth0 >= 0 && monthFirstCol[c.firstMonth0] === -1) {
        monthFirstCol[c.firstMonth0] = c.weekIdx;
      }
    });
    const headerCells = cols.map((c) => {
      const m0 = monthFirstCol.indexOf(c.weekIdx);
      return m0 >= 0 ? MONTH_LABELS_KO[m0] : '';
    });

    return { columns: cols, monthHeaderCells: headerCells };
  }, [year, today]);

  const writtenDays = byDate.size;
  const yearTotal = (() => {
    if (year === new Date().getFullYear()) {
      const start = new Date(year, 0, 1);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
    }
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 366 : 365;
  })();
  const writeRate = yearTotal > 0 ? Math.round((writtenDays / yearTotal) * 100) : 0;

  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const hoverInfo = hoverDate ? byDate.get(hoverDate) : null;

  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex items-center justify-between px-1">
        <h3 className="text-[12px] font-semibold tracking-[-0.005em] text-foreground/80">
          {year}년 한 해
        </h3>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/75">
          {writtenDays}일 · {writeRate}%
        </span>
      </header>

      <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-card px-3 py-3 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
        {/* 월 라벨 row — sparse */}
        <div
          className="grid gap-[2px] mb-1 pl-[18px]"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {monthHeaderCells.map((label, i) => (
            <span
              key={i}
              className="text-[8.5px] font-medium text-muted-foreground/60 leading-none h-3 flex items-center"
            >
              {label}
            </span>
          ))}
        </div>

        {/* 메인 grid — 좌측 요일 sparse 라벨 + 7×N cells */}
        <div className="flex gap-1.5">
          {/* 요일 라벨 — 월/수/금만 sparse */}
          <div className="flex flex-col gap-[2px] shrink-0">
            {WEEKDAY_LABELS_SPARSE.map((d, i) => (
              <span
                key={i}
                className="text-[8.5px] font-medium text-muted-foreground/60 leading-none h-[10px] flex items-center"
                aria-hidden={!d}
              >
                {d}
              </span>
            ))}
          </div>

          {/* 7 row × N col cell grid */}
          <div
            className="grid gap-[2px] flex-1"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              gridAutoFlow: 'column',
              gridTemplateRows: 'repeat(7, 10px)',
            }}
          >
            {columns.flatMap((c) =>
              c.cells.map((cell) => {
                if (!cell.inYear) {
                  return <span key={cell.iso} className="rounded-[2px]" aria-hidden />;
                }
                const info = byDate.get(cell.iso);
                const hasEntry = !!info;
                const moodTint =
                  info?.mood !== undefined && info?.mood !== null ? MOOD_TINT[info.mood] : null;
                const isHover = hoverDate === cell.iso;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={!onDayClick || cell.isFuture}
                    onClick={() => {
                      if (cell.isFuture) return;
                      onDayClick?.(cell.iso, info?.entry ?? null);
                    }}
                    onMouseEnter={() => setHoverDate(cell.iso)}
                    onMouseLeave={() =>
                      setHoverDate((cur) => (cur === cell.iso ? null : cur))
                    }
                    title={
                      cell.isFuture
                        ? cell.iso
                        : hasEntry
                          ? `${cell.iso} · ${info!.count}개${info!.mood ? ' ' + MOOD_EMOJI[info!.mood] : ''}`
                          : `${cell.iso} · 비어있음`
                    }
                    aria-label={cell.iso}
                    className={cn(
                      'rounded-[2px] transition-all',
                      hasEntry
                        ? cn(
                            moodTint ?? 'bg-foreground/40',
                            isHover && 'ring-1 ring-offset-[1px] ring-foreground/40 ring-offset-card',
                          )
                        : cell.isFuture
                          ? 'bg-transparent'
                          : 'bg-foreground/[0.06] hover:bg-foreground/15',
                      cell.isToday && 'ring-1 ring-primary/60 ring-offset-[1px] ring-offset-card',
                      !onDayClick && 'cursor-default',
                    )}
                  />
                );
              }),
            )}
          </div>
        </div>

        {/* 호버 미리보기 */}
        {hoverInfo && hoverDate && (
          <div className="mt-2.5 pt-2.5 border-t border-[hsl(var(--hairline))] flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-semibold tabular-nums text-foreground/85 shrink-0">
              {parseInt(hoverDate.slice(5, 7), 10)}/{parseInt(hoverDate.slice(8, 10), 10)}
              <span className="ml-1 text-muted-foreground/70 text-[10px] font-medium">
                {WEEKDAYS_SHORT[dowMonStart(new Date(`${hoverDate}T00:00:00`))]}
              </span>
            </span>
            {hoverInfo.mood !== null && (
              <span className="text-[12px] leading-none shrink-0">{MOOD_EMOJI[hoverInfo.mood]}</span>
            )}
            <span className="text-[11px] text-muted-foreground/85 truncate min-w-0 tracking-[-0.005em]">
              {hoverInfo.entry.body.trim().slice(0, 50) || '(빈 본문)'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Year in Pixels — 1년치 mood dot grid (Daylio · Camille de Passion Carnets 시그니처).
 *
 * 가로 12 column (월) × 세로 31 row (일) — 가로형 grid.
 * 각 cell:
 *   - 작성됨 + mood 있음 = mood 색
 *   - 작성됨 + mood 없음 = foreground/30 회색
 *   - 안 작성 = 빈 hairline ring
 *   - 미래 = 투명
 * 클릭 → 그 날 entry 편집 (있으면) 또는 새 entry 시작.
 *
 * 1년 흐름이 한눈에 보이는 미니멀한 시각화 — 사이드바 또는 메인 영역.
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

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
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
        // mood 가 없던 entry 인데 새 entry 에 mood 있으면 갱신
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

  const writtenDays = byDate.size;
  const yearTotal = (() => {
    // 올해 = 오늘까지의 일수, 과거 연도 = 365/366
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
        {/* 12-col × 31-row grid — 각 col = month, row = day */}
        <div className="grid grid-cols-12 gap-[3px]">
          {MONTHS_KO.map((monthLabel, m0) => {
            const dim = daysInMonth(year, m0);
            return (
              <div key={m0} className="flex flex-col gap-[3px]">
                {/* 월 라벨 — 매우 작게 */}
                <span className="text-[8.5px] font-medium tabular-nums text-muted-foreground/60 text-center mb-0.5 leading-none">
                  {m0 + 1}
                </span>
                {/* 일 dots — 31 row (월별 일수 < 31 이면 빈 자리는 invisible) */}
                {Array.from({ length: 31 }, (_, d0) => {
                  const day = d0 + 1;
                  // 그 월에 없는 날 (예: 2월 30/31일) — invisible placeholder
                  if (day > dim) {
                    return <span key={day} className="aspect-square w-full" aria-hidden />;
                  }
                  const key = `${year}-${pad2(m0 + 1)}-${pad2(day)}`;
                  const isToday = key === today;
                  const isFuture = key > today;
                  const info = byDate.get(key);
                  const hasEntry = !!info;
                  const moodTint = info?.mood !== undefined && info?.mood !== null ? MOOD_TINT[info.mood] : null;
                  const isHover = hoverDate === key;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!onDayClick || isFuture}
                      onClick={() => {
                        if (isFuture) return;
                        onDayClick?.(key, info?.entry ?? null);
                      }}
                      onMouseEnter={() => setHoverDate(key)}
                      onMouseLeave={() => setHoverDate((cur) => (cur === key ? null : cur))}
                      title={
                        isFuture
                          ? `${m0 + 1}월 ${day}일`
                          : hasEntry
                            ? `${m0 + 1}월 ${day}일 · ${info!.count}개${info!.mood ? ' ' + MOOD_EMOJI[info!.mood] : ''}`
                            : `${m0 + 1}월 ${day}일 · 비어있음`
                      }
                      aria-label={`${m0 + 1}월 ${day}일`}
                      className={cn(
                        'aspect-square w-full rounded-[2px] transition-all',
                        hasEntry
                          ? cn(
                              moodTint ?? 'bg-foreground/40',
                              isHover && 'ring-1 ring-offset-1 ring-foreground/40 ring-offset-card',
                            )
                          : isFuture
                            ? 'bg-transparent'
                            : 'bg-foreground/[0.06] hover:bg-foreground/15',
                        isToday && 'ring-1 ring-primary/60 ring-offset-[1px] ring-offset-card',
                        !onDayClick && 'cursor-default',
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* hover 시 그 날짜 미리보기 — 그리드 아래 */}
        {hoverInfo && hoverDate && (
          <div className="mt-2.5 pt-2.5 border-t border-[hsl(var(--hairline))] flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-semibold tabular-nums text-foreground/85 shrink-0">
              {parseInt(hoverDate.slice(5, 7), 10)}월 {parseInt(hoverDate.slice(8, 10), 10)}일
            </span>
            {hoverInfo.mood !== null && (
              <span className="text-[12px] leading-none shrink-0">{MOOD_EMOJI[hoverInfo.mood]}</span>
            )}
            <span className="text-[11px] text-muted-foreground/85 truncate min-w-0 tracking-[-0.005em]">
              {hoverInfo.entry.body.trim().slice(0, 60) || '(빈 본문)'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

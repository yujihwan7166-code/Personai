/**
 * 연간 heatmap — Daylio + GitHub 콘트리뷰션 그래프 차용.
 *
 * 12개월 × 31일 grid. 셀 색 = 그날 mood (MOOD_TINT).
 * 빈 날 = hairline. 클릭 → 그 날짜 필터.
 *
 * 디자인:
 * - 좌 상단 연도 토글 (이전/다음/오늘)
 * - 좌측 월 라벨 (1월–12월)
 * - 상단 일 라벨 (1·5·10·15·20·25·31)
 * - hover tooltip — 그날 mood + 첫 줄 미리보기
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_TINT, MOOD_LABELS } from '@/types/journal';

interface Props {
  entries: JournalEntry[];
  selectedDate: string | null;          // 'YYYY-MM-DD'
  onDayClick: (date: string) => void;
}

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_HEADERS = [1, 5, 10, 15, 20, 25, 31];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export const JournalYearHeatmap = ({ entries, selectedDate, onDayClick }: Props) => {
  const [year, setYear] = useState(() => new Date().getFullYear());

  // 그날 mood 가장 좋은 것을 대표로 (같은 날 여러 entry 있을 수 있음)
  const moodMap = useMemo(() => {
    const m = new Map<string, { mood: Mood; preview: string }>();
    for (const e of entries) {
      const date = e.date;
      const existing = m.get(date);
      if (e.mood !== undefined) {
        if (!existing || (existing.mood !== undefined && (e.mood as Mood) > existing.mood)) {
          m.set(date, { mood: e.mood as Mood, preview: e.body.slice(0, 60) });
        }
      } else if (!existing) {
        m.set(date, { mood: 3, preview: e.body.slice(0, 60) });
      }
    }
    return m;
  }, [entries]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  return (
    <section className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3">
      <header className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground/85 font-semibold">
          연간 흐름
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="이전 해"
            className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="text-[11px] font-mono tabular-nums text-foreground font-semibold px-1.5 min-w-[36px] text-center">
            {year}
          </span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="다음 해"
            disabled={year >= today.getFullYear()}
            className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      {/* 일 라벨 (1·5·10·15·20·25·31) */}
      <div className="grid gap-px ml-9" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}>
        {Array.from({ length: 31 }).map((_, i) => {
          const day = i + 1;
          const showLabel = DAY_HEADERS.includes(day);
          return (
            <div
              key={day}
              className={cn(
                'text-[8px] font-mono text-muted-foreground/60 tabular-nums text-center',
                showLabel ? 'visible' : 'invisible',
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* 월별 row */}
      <div className="flex flex-col gap-px mt-1">
        {MONTHS_KO.map((monthLabel, monthIdx) => {
          const days = daysInMonth(year, monthIdx);
          return (
            <div key={monthIdx} className="flex items-center gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.06em] text-muted-foreground/70 w-8 shrink-0 text-right tabular-nums">
                {monthLabel}
              </span>
              <div
                className="flex-1 grid gap-px"
                style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}
              >
                {Array.from({ length: 31 }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  if (day > days) {
                    return <div key={day} className="aspect-square" aria-hidden />;
                  }
                  const dateKey = `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;
                  const data = moodMap.get(dateKey);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDate;
                  const isFuture = dateKey > todayKey;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !isFuture && onDayClick(dateKey)}
                      disabled={isFuture}
                      aria-label={`${monthLabel} ${day}일${data ? ` · ${MOOD_LABELS[data.mood]}` : ''}`}
                      title={
                        data
                          ? `${monthLabel} ${day}일 · ${MOOD_LABELS[data.mood]}\n${data.preview}`
                          : `${monthLabel} ${day}일${isFuture ? ' (미래)' : ''}`
                      }
                      className={cn(
                        'aspect-square rounded-[2px] transition-all',
                        data
                          ? cn(MOOD_TINT[data.mood], 'opacity-90 hover:opacity-100 hover:scale-110')
                          : isFuture
                          ? 'bg-transparent'
                          : 'bg-muted/40 hover:bg-muted',
                        isSelected && 'ring-2 ring-foreground ring-offset-1',
                        isToday && !isSelected && 'ring-1 ring-foreground/40 ring-offset-1',
                        isFuture && 'cursor-default',
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9.5px] text-muted-foreground/80">
        <span>적게</span>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/40" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-sky-500 opacity-80" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-400 opacity-80" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 opacity-80" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-500 opacity-80" />
        <span>좋음</span>
      </div>
    </section>
  );
};

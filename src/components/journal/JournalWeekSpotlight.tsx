/**
 * 이번 주 7일 스포트라이트 — Day One·Apple Journal 패턴.
 *
 * 한 줄에 월~일 7칸. 작성된 날 = mood 색 점 (없으면 회색).
 * 오늘 = ring 강조. 클릭 시 그날 entry 모달 열림 (있으면) 또는 새 entry 시작.
 *
 * 사용자가 "이번 주 어떻게 보냈나" 한눈에 보고, 빈 날 즉시 채울 수 있게.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_TINT } from '@/types/journal';

interface JournalWeekSpotlightProps {
  entries: JournalEntry[];
  /** 빈 날 클릭 시 새 일기 시작 */
  onAddForDate?: (dateIso: string) => void;
  /** 작성된 날 클릭 시 첫 entry 편집 */
  onClickEntry?: (entry: JournalEntry) => void;
}

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 이번 주 월요일 ~ 일요일 7개 Date 배열. */
function thisWeekDays(): Date[] {
  const now = new Date();
  const day = now.getDay();             // 0=일 ~ 6=토
  const monOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + monOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export const JournalWeekSpotlight = ({
  entries, onAddForDate, onClickEntry,
}: JournalWeekSpotlightProps) => {
  const days = useMemo(thisWeekDays, []);
  const today = ymd(new Date());

  // 날짜별 entry 인덱스
  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [entries]);

  const monday = days[0];
  const sunday = days[6];
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const rangeLabel = sameMonth
    ? `${monday.getMonth() + 1}월 ${monday.getDate()}~${sunday.getDate()}일`
    : `${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline gap-2 px-1">
        <h3 className="text-[11.5px] font-medium tracking-[-0.005em] text-foreground/85 font-semibold">
          이번 주
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
        <span className="text-[11px] font-medium tracking-[-0.005em] text-muted-foreground">
          {rangeLabel}
        </span>
      </header>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const key = ymd(d);
          const dayEntries = byDate.get(key) ?? [];
          const hasEntry = dayEntries.length > 0;
          const isToday = key === today;
          const isFuture = key > today;
          // 그날 첫 entry 의 mood 로 색
          const mood = hasEntry
            ? dayEntries.find((e) => e.mood !== undefined)?.mood as Mood | undefined
            : undefined;
          const tintClass = mood ? MOOD_TINT[mood] : 'bg-muted';

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => {
                if (isFuture) return;
                if (hasEntry && onClickEntry) onClickEntry(dayEntries[0]);
                else if (onAddForDate) onAddForDate(key);
              }}
              title={
                isFuture
                  ? '미래'
                  : hasEntry
                  ? `${d.getMonth() + 1}월 ${d.getDate()}일 · ${dayEntries.length}개`
                  : `${d.getMonth() + 1}월 ${d.getDate()}일 · 비어있음`
              }
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all',
                'border-[hsl(var(--hairline))] bg-card',
                !isFuture && 'hover:border-foreground/25 hover:shadow-[0_2px_10px_-4px_hsl(30_30%_8%/0.08)] cursor-pointer',
                isFuture && 'opacity-40 cursor-default',
                isToday && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-[hsl(var(--background))]',
              )}
            >
              <span className="text-[11px] font-medium tracking-[-0.005em] text-muted-foreground leading-none">
                {WEEKDAYS_KO[i]}
              </span>
              <span
                className={cn(
                  'text-[16px] tabular-nums leading-none',
                  isToday ? 'text-primary font-bold' : 'text-foreground font-medium',
                )}
                
              >
                {d.getDate()}
              </span>
              {hasEntry ? (
                <span className="flex items-center gap-0.5">
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full', tintClass)}
                    aria-label={mood ? `mood ${mood}` : '작성됨'}
                  />
                  {dayEntries.length > 1 && (
                    <span className="text-[8.5px] font-mono tabular-nums text-muted-foreground leading-none">
                      {dayEntries.length}
                    </span>
                  )}
                </span>
              ) : isFuture ? (
                <span className="w-1.5 h-1.5 rounded-full bg-transparent" aria-hidden />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full border border-[hsl(var(--hairline))] bg-transparent"
                  aria-label="비어있음"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

/**
 * 주간 보드 — 상단 7-day 탭 strip + 선택된 day 의 일기 풀 뷰.
 *
 * 패턴: Apple Calendar Day View · Things3 Today · iOS Reminders.
 * - 상단: 월~일 7칸 탭 (요일 + 일 + mood dot/emoji + entry 카운트)
 * - 본문: 선택된 day 의 entry 들 stack 또는 빈 상태 prompt
 *
 * UX:
 * - 탭 클릭 → 그 day 선택
 * - 빈 day 선택 시 본문 영역에 큰 ✏️ 적기 prompt
 * - 여러 entry 일 때 stack (시간 오름차순)
 * - 오늘 탭 = ring + 색 강조, 미래 탭 = opacity 50
 */
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_TINT, ACTIVITY_META } from '@/types/journal';

interface JournalWeekBoardProps {
  entries: JournalEntry[];
  /** 주의 기준 날짜 ISO (이 날 포함 월~일). */
  anchorIso: string;
  /** 본문 영역에서 entry 클릭 → 편집 모달. */
  onClickEntry: (entry: JournalEntry) => void;
  /** 빈 날 / "+ 더 적기" 클릭 → 그 날짜로 새 entry 작성. */
  onAddForDate: (dateIso: string) => void;
}

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 주어진 날짜 기준 월요일 ~ 일요일 7개 Date 배열. */
function weekDaysFromAnchor(anchorIso: string): Date[] {
  const anchor = new Date(anchorIso);
  const day = anchor.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(anchor.getDate() + monOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const JournalWeekBoard = ({
  entries,
  anchorIso,
  onClickEntry,
  onAddForDate,
}: JournalWeekBoardProps) => {
  const days = useMemo(() => weekDaysFromAnchor(anchorIso), [anchorIso]);
  const today = ymd(new Date());

  // 날짜별 entry 인덱스 (시간 오름차순).
  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    m.forEach((arr) => arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    return m;
  }, [entries]);

  // 선택된 day — 기본: 주 안에 오늘이 있으면 오늘, 아니면 월요일.
  const defaultDay = useMemo(() => {
    const todayInWeek = days.find((d) => ymd(d) === today);
    return ymd(todayInWeek ?? days[0]);
  }, [days, today]);

  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);

  // anchor 가 바뀌면 (다른 주로 이동) 선택 day 도 default 로 재설정
  useEffect(() => {
    setSelectedDay(defaultDay);
  }, [defaultDay]);

  const selectedDate = useMemo(() => new Date(`${selectedDay}T00:00:00`), [selectedDay]);
  const selectedEntries = byDate.get(selectedDay) ?? [];
  const isSelectedFuture = selectedDay > today;
  const isSelectedToday = selectedDay === today;

  return (
    <section
      className={cn(
        // 탭 + 본문이 하나의 큰 통합 카드 — Linear/Apple Calendar 톤
        'rounded-2xl border bg-card overflow-hidden transition-all',
        'border-[hsl(var(--hairline))]',
        'shadow-[0_1px_2px_hsl(30_30%_8%/0.04),0_4px_16px_-8px_hsl(30_30%_8%/0.06)]',
        isSelectedFuture && 'opacity-95',
      )}
    >
      {/* ── 상단 7-day 탭 row — Apple Calendar 패턴 (underline indicator) ── */}
      <div
        role="tablist"
        aria-label="요일 선택"
        className="grid grid-cols-7 border-b border-[hsl(var(--hairline))] bg-card/40"
      >
        {days.map((d, i) => {
          const key = ymd(d);
          const dayEntries = byDate.get(key) ?? [];
          const hasEntry = dayEntries.length > 0;
          const isToday = key === today;
          const isFuture = key > today;
          const isSelected = key === selectedDay;

          // 그 날 entry들의 mood 평균 → tint 결정 (가장 흔한 mood 기준)
          const moodCounts = new Map<number, number>();
          dayEntries.forEach((e) => {
            if (e.mood !== undefined) moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
          });
          const dominantMood = moodCounts.size > 0
            ? [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] as Mood
            : null;
          const moodTintClass = dominantMood !== null ? MOOD_TINT[dominantMood] : null;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedDay(key)}
              title={
                isFuture
                  ? `${d.getMonth() + 1}월 ${d.getDate()}일 (미래)`
                  : hasEntry
                    ? `${d.getMonth() + 1}월 ${d.getDate()}일 · ${dayEntries.length}개`
                    : `${d.getMonth() + 1}월 ${d.getDate()}일 · 비어있음`
              }
              className={cn(
                'group/tab relative flex flex-col items-center justify-center gap-1 h-14 sm:h-16 transition-all',
                !isSelected && 'hover:bg-accent/40',
                isFuture && !isSelected && 'opacity-45',
              )}
            >
              {/* 요일 라벨 — 작게 위 */}
              <span
                className={cn(
                  'text-[10.5px] font-medium tracking-[0.05em]',
                  isSelected ? 'text-foreground/80' : 'text-muted-foreground/75',
                )}
              >
                {WEEKDAYS_KO[i]}
              </span>
              {/* 일(day) 큰 숫자 + mood tint 배경 (entry 있는 날만) */}
              <span
                className={cn(
                  'inline-flex items-center justify-center font-display tabular-nums transition-all',
                  'h-8 w-8 sm:h-9 sm:w-9 rounded-full text-[15px] sm:text-[16px]',
                  isToday && isSelected && 'bg-primary text-primary-foreground font-semibold shadow-[0_1px_3px_hsl(265_50%_30%/0.25)]',
                  isToday && !isSelected && 'bg-primary/15 text-primary font-semibold',
                  !isToday && isSelected && (moodTintClass
                    ? `${moodTintClass} text-foreground font-semibold ring-1 ring-foreground/20`
                    : 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30'),
                  !isToday && !isSelected && hasEntry && (moodTintClass
                    ? `${moodTintClass} text-foreground/85 font-medium`
                    : 'text-foreground/85 font-medium'),
                  !isToday && !isSelected && !hasEntry && 'text-muted-foreground/60 group-hover/tab:text-foreground/70 font-normal',
                )}
              >
                {d.getDate()}
              </span>
              {/* 다중 entry dot — 2개 이상일 때만 노출 */}
              {dayEntries.length > 1 && (
                <span className="absolute bottom-1.5 inline-flex gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(3, dayEntries.length - 1) }).map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        isSelected ? 'bg-foreground/55' : 'bg-foreground/30',
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 하단 본문 panel ── */}
      <div className="px-5 sm:px-6 pt-5 pb-6 sm:pb-7 min-h-[300px] sm:min-h-[360px]">
        {/* panel 헤더 — "5월 5일 화요일" 한 줄 좌상단 */}
        <header className="flex items-baseline justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-baseline gap-2.5 min-w-0 flex-wrap">
            <h3
              className="font-display text-[18px] sm:text-[20px] font-semibold tracking-tight tabular-nums text-foreground leading-none"
            >
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일{' '}
              <span className="font-medium text-muted-foreground tracking-tight">
                {selectedDate.toLocaleDateString('ko-KR', { weekday: 'long' })}
              </span>
            </h3>
            {isSelectedToday && (
              <span className="inline-flex items-center px-2 h-6 rounded-full bg-primary text-primary-foreground text-[10.5px] font-semibold tracking-[0.02em]">
                오늘
              </span>
            )}
            {selectedEntries.length > 1 && (
              <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground/80">
                {selectedEntries.length}개
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAddForDate(selectedDay)}
            title={
              isSelectedFuture
                ? '예정 일기'
                : selectedEntries.length === 0
                  ? '적기'
                  : '더 적기'
            }
            aria-label="새 일기"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>

        {/* panel 본문 영역 */}
        <div>
          {selectedEntries.length === 0 ? (
            /* 빈 상태 — 우아한 책 페이지 톤 (dashed 박스 제거) */
            <button
              type="button"
              onClick={() => onAddForDate(selectedDay)}
              className="w-full flex flex-col items-center justify-center py-16 sm:py-24 gap-4 group/empty transition-opacity hover:opacity-100 opacity-90"
            >
              <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-foreground/5 text-foreground/40 group-hover/empty:bg-foreground/8 group-hover/empty:text-foreground/60 transition-colors">
                <Pencil className="h-[17px] w-[17px]" strokeWidth={1.6} />
              </span>
              <p className="text-[15px] sm:text-[16px] font-medium text-muted-foreground tracking-[-0.005em] group-hover/empty:text-foreground/75 transition-colors">
                {isSelectedFuture
                  ? '예정 일기를 미리 적어볼까요'
                  : isSelectedToday
                    ? '오늘 어떤 하루였나요'
                    : '이 날의 한 페이지를 채워보세요'}
              </p>
              <span className="text-[11px] font-medium text-muted-foreground/55 tracking-[-0.005em] group-hover/empty:text-muted-foreground transition-colors">
                클릭해서 시작
              </span>
            </button>
          ) : (
            /* entry stack — 시간 오름차순 */
            <div className="flex flex-col divide-y divide-[hsl(var(--hairline))]">
              {selectedEntries.map((entry) => {
                const moodKey = entry.mood !== undefined ? (entry.mood as Mood) : null;
                const moodEmoji = moodKey ? MOOD_EMOJI[moodKey] : null;
                const time = formatTime(entry.createdAt);
                const previewBody =
                  entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body;
                const hasBody = previewBody.trim().length > 0;
                const moodBarClass = moodKey ? MOOD_TINT[moodKey] : 'bg-foreground/10';
                return (
                  <article
                    key={entry.id}
                    className={cn(
                      'group/entry relative flex flex-col gap-3.5 py-6 first:pt-0 last:pb-0 pl-4',
                    )}
                  >
                    {/* mood 좌측 컬러 bar — entry 의 시각 앵커 */}
                    <span
                      className={cn(
                        'absolute left-0 top-6 bottom-6 first:top-0 last:bottom-0 w-[3px] rounded-full',
                        moodBarClass,
                      )}
                      aria-hidden
                    />

                    {/* entry 헤더 — 시각 + mood + 편집 (hover) */}
                    <header className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
                          {time}
                        </span>
                        {moodEmoji && (
                          <span className="text-[15px] leading-none">{moodEmoji}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onClickEntry(entry)}
                        title="수정"
                        className="opacity-0 group-hover/entry:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </header>

                    {/* entry 본문 — 클릭 시 편집 */}
                    <button
                      type="button"
                      onClick={() => onClickEntry(entry)}
                      className="text-left"
                    >
                      {hasBody ? (
                        <p className="font-display text-[16px] sm:text-[17px] leading-[1.85] text-foreground/90 whitespace-pre-wrap tracking-[-0.005em]">
                          {previewBody}
                        </p>
                      ) : (
                        <p className="text-[14px] text-muted-foreground/65">
                          (빈 본문)
                        </p>
                      )}
                    </button>

                    {/* 사진 grid (있을 때만) */}
                    {entry.images && entry.images.length > 0 && (
                      <div
                        className={cn(
                          'grid gap-1.5',
                          entry.images.length === 1 && 'grid-cols-1 max-w-[320px]',
                          entry.images.length === 2 && 'grid-cols-2 max-w-[480px]',
                          entry.images.length >= 3 && 'grid-cols-3 max-w-[600px]',
                        )}
                      >
                        {entry.images.slice(0, 3).map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square rounded-lg overflow-hidden bg-card border border-[hsl(var(--hairline))]"
                          >
                            <img
                              src={img.src}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 활동 + 태그 */}
                    {((entry.activities && entry.activities.length > 0) ||
                      (entry.tags && entry.tags.length > 0)) && (
                      <div className="flex flex-wrap gap-1">
                        {entry.activities?.map((key) => {
                          const meta = ACTIVITY_META[key];
                          return (
                            <span
                              key={`a-${key}`}
                              className="inline-flex items-center gap-1 px-2 h-5 rounded text-[10.5px] font-medium bg-accent/60 text-foreground/80"
                              title={meta?.label ?? key}
                            >
                              <span aria-hidden>{meta?.emoji ?? '·'}</span>
                              {meta?.label ?? key}
                            </span>
                          );
                        })}
                        {entry.tags?.map((t) => (
                          <span
                            key={`t-${t}`}
                            className="inline-flex items-center gap-0.5 px-2 h-5 rounded text-[10.5px] font-medium bg-accent/60 text-muted-foreground"
                          >
                            <Hash className="h-2.5 w-2.5 opacity-70" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

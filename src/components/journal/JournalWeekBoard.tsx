/**
 * 주간 보드 — 월~일 7컬럼 weekly spread (Hobonichi Weeks · Sunsama 패턴).
 *
 * 메인 뷰. 한 주가 한눈에 펼쳐진다.
 * 셀 = 그날의 일기 발췌 + 메타 (요일·일·mood·시간·태그·다중 entry 카운트).
 *
 * - 작성된 날: bg-card + 본문 발췌 (Newsreader 14px / 1.7 / line-clamp-7)
 * - 빈 날: 옅은 placeholder + hover 시 "✏️ 적기" prompt
 * - 오늘: ring-2 ring-primary/40
 * - 미래: opacity-50 (입력 가능)
 *
 * 클릭:
 * - 본문 영역 → 그날 첫 entry 편집 모달
 * - 빈 셀 → 그날 새 entry 작성 (date 지정)
 * - "+N" → 그날 모든 entry 리스트 popover 토글
 *
 * 모바일 (lg 미만): 7컬럼 → vertical stack 7행 (Sunsama 모바일 패턴).
 */
import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_TINT } from '@/types/journal';

interface JournalWeekBoardProps {
  entries: JournalEntry[];
  /** 주의 기준 날짜 ISO (이 날 포함 월~일). 미지정 시 오늘 기준 이번 주. */
  anchorIso?: string;
  /** 셀 클릭 — 그날 첫 entry 편집. */
  onClickEntry: (entry: JournalEntry) => void;
  /** 빈 날 클릭 — 그 날짜로 새 entry 시작. */
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
function weekDaysFromAnchor(anchorIso?: string): Date[] {
  const anchor = anchorIso ? new Date(anchorIso) : new Date();
  const day = anchor.getDay(); // 0=일 ~ 6=토
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

export const JournalWeekBoard = ({
  entries,
  anchorIso,
  onClickEntry,
  onAddForDate,
}: JournalWeekBoardProps) => {
  const days = useMemo(() => weekDaysFromAnchor(anchorIso), [anchorIso]);
  const today = ymd(new Date());

  // 날짜별 entry 인덱스 (시간 오름차순 — 첫 entry 가 그날 처음 쓴 것).
  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    // 각 날짜 내부 시각순 정렬
    m.forEach((arr) => {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    return m;
  }, [entries]);

  // 다중 entry stack popover — 어느 셀이 열려있는지
  const [stackOpenDate, setStackOpenDate] = useState<string | null>(null);

  return (
    <div
      className={cn(
        // 데스크톱: 7컬럼 grid
        'grid gap-1.5',
        'grid-cols-1 lg:grid-cols-7',
      )}
    >
      {days.map((d, idx) => {
        const key = ymd(d);
        const dayEntries = byDate.get(key) ?? [];
        const hasEntry = dayEntries.length > 0;
        const isToday = key === today;
        const isFuture = key > today;
        const firstEntry = hasEntry ? dayEntries[0] : null;

        const mood = hasEntry
          ? (dayEntries.find((e) => e.mood !== undefined)?.mood as Mood | undefined)
          : undefined;
        const moodEmoji = mood !== undefined ? MOOD_EMOJI[mood] : null;
        const moodTint = mood !== undefined ? MOOD_TINT[mood] : null;

        const previewBody = firstEntry
          ? firstEntry.bodyFormat === 'markdown'
            ? stripMarkdown(firstEntry.body)
            : firstEntry.body
          : '';
        const trimmed = previewBody.trim();
        const hasBody = trimmed.length > 0;

        const time = firstEntry
          ? new Date(firstEntry.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : null;

        const stackOpen = stackOpenDate === key;

        return (
          <div
            key={key}
            className={cn(
              'group/cell relative flex flex-col rounded-xl border bg-card transition-all',
              'min-h-[200px] lg:min-h-[280px]',
              'border-[hsl(var(--hairline))]',
              !isFuture && 'hover:border-foreground/25 hover:shadow-[0_2px_10px_-4px_hsl(30_30%_8%/0.08)]',
              isToday && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-[hsl(var(--background))]',
              isFuture && 'opacity-50',
            )}
          >
            {/* 헤더 — 요일 + 일 + mood */}
            <header
              className={cn(
                'flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-[hsl(var(--hairline))]',
              )}
            >
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.18em]',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {WEEKDAYS_KO[idx]}
                </span>
                <span
                  className={cn(
                    'text-[20px] tabular-nums leading-none font-bold',
                    isToday ? 'text-primary' : 'text-foreground',
                  )}
                  style={{
                    fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {moodEmoji && (
                  <span className="text-[14px] leading-none" title={`mood ${mood}`}>
                    {moodEmoji}
                  </span>
                )}
                {moodTint && !moodEmoji && (
                  <span className={cn('w-1.5 h-1.5 rounded-full', moodTint)} aria-hidden />
                )}
              </div>
            </header>

            {/* 본문 영역 */}
            <button
              type="button"
              disabled={isFuture && !hasEntry}
              onClick={() => {
                if (hasEntry && firstEntry) onClickEntry(firstEntry);
                else onAddForDate(key);
              }}
              className={cn(
                'flex-1 flex flex-col items-stretch text-left px-3 py-2.5 min-h-0',
                !isFuture && 'cursor-pointer',
                isFuture && hasEntry && 'cursor-pointer',
                isFuture && !hasEntry && 'cursor-default',
              )}
            >
              {hasBody ? (
                <p
                  className="text-[13.5px] leading-[1.7] text-foreground/90 whitespace-pre-wrap line-clamp-7 lg:line-clamp-[10]"
                  style={{
                    fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
                  }}
                >
                  {trimmed}
                </p>
              ) : (
                /* 빈 셀 — hover 시에만 prompt 노출 */
                <div className="flex-1 flex items-center justify-center min-h-[120px] opacity-0 group-hover/cell:opacity-100 transition-opacity">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <Pencil className="h-3 w-3" />
                    적기
                  </span>
                </div>
              )}
            </button>

            {/* 푸터 — 시간 + 다중 entry 카운트 */}
            {hasEntry && (
              <footer className="flex items-center justify-between px-3 pt-1.5 pb-2 border-t border-[hsl(var(--hairline))] mt-auto">
                <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] tabular-nums text-muted-foreground">
                  {time}
                </span>
                {dayEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStackOpenDate(stackOpen ? null : key);
                    }}
                    className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] font-mono tabular-nums',
                      stackOpen
                        ? 'bg-foreground text-background'
                        : 'bg-accent text-foreground/80 hover:bg-accent/80',
                    )}
                    title={`${dayEntries.length}개 entry`}
                  >
                    +{dayEntries.length - 1}
                  </button>
                )}
              </footer>
            )}

            {/* 다중 entry stack popover */}
            {stackOpen && dayEntries.length > 1 && (
              <div
                className={cn(
                  'absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg',
                  'border-[hsl(var(--hairline))] p-1.5 flex flex-col gap-0.5',
                )}
                onMouseLeave={() => setStackOpenDate(null)}
              >
                {dayEntries.map((entry, i) => {
                  const t = new Date(entry.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  const body =
                    entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStackOpenDate(null);
                        onClickEntry(entry);
                      }}
                      className={cn(
                        'flex items-start gap-2 px-2 py-1.5 rounded text-left',
                        'hover:bg-accent transition-colors',
                        i === 0 && 'bg-accent/40',
                      )}
                    >
                      <span className="text-[9.5px] font-mono tabular-nums text-muted-foreground pt-0.5 shrink-0">
                        {t}
                      </span>
                      <span
                        className="text-[12px] text-foreground/85 leading-[1.55] line-clamp-2"
                        style={{
                          fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
                        }}
                      >
                        {body.trim() || '(빈 본문)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

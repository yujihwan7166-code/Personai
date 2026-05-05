/**
 * On This Day — 작년·재작년 오늘 일기 회상 카드 (Apple 일기 패턴).
 *
 * 같은 월·일 + 다른 연도 항목만 필터.
 * 클릭 시 편집 모달 열림.
 */
import { useMemo } from 'react';
import { CalendarHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI } from '@/types/journal';

interface OnThisDayCardProps {
  allEntries: JournalEntry[];
  onClickEntry: (entry: JournalEntry) => void;
}

export const OnThisDayCard = ({ allEntries, onClickEntry }: OnThisDayCardProps) => {
  const matches = useMemo(() => {
    const today = new Date();
    const m = today.getMonth();
    const d = today.getDate();
    const y = today.getFullYear();
    return allEntries.filter((e) => {
      const entryDate = new Date(e.date);
      return entryDate.getMonth() === m
          && entryDate.getDate() === d
          && entryDate.getFullYear() < y;
    });
  }, [allEntries]);

  if (matches.length === 0) return null;

  const yearsAgo = (entry: JournalEntry): number => {
    const today = new Date();
    const entryDate = new Date(entry.date);
    return today.getFullYear() - entryDate.getFullYear();
  };

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-2 px-1">
        <CalendarHeart className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
        <h3 className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/85 font-semibold">
          이날의 기록
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
          {matches.length}
        </span>
      </header>
      <div className="flex flex-col gap-2">
        {matches.map((entry) => {
          const ya = yearsAgo(entry);
          const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood as Mood] : null;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onClickEntry(entry)}
              className={cn(
                'group flex items-start gap-3.5 rounded-xl border border-[hsl(var(--hairline))] bg-amber-50/40 dark:bg-amber-950/15 px-4 py-3.5 text-left',
                'hover:border-amber-500/40 hover:shadow-[0_4px_14px_-6px_hsl(45_85%_55%_/_0.18)] transition-all',
              )}
            >
              <span
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0 text-[10.5px] font-bold tabular-nums tracking-tight"
                style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
              >
                {ya}년 전
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {new Date(entry.createdAt).getFullYear()}년
                  </span>
                  {moodEmoji && <span className="text-[14px] leading-none">{moodEmoji}</span>}
                </div>
                <p
                  className="text-[14px] text-foreground/90 leading-[1.7] line-clamp-2"
                  style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
                >
                  {entry.body}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

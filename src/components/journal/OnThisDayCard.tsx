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
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline gap-2 px-1">
        <CalendarHeart className="h-3 w-3 text-foreground/60" />
        <h3 className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/85 font-semibold">
          이날의 기록
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
          {matches.length}
        </span>
      </header>
      <div className="flex flex-col gap-1.5">
        {matches.slice(0, 2).map((entry) => {
          const ya = yearsAgo(entry);
          const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood as Mood] : null;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onClickEntry(entry)}
              className={cn(
                'group flex flex-col gap-1.5 rounded-xl border border-[hsl(var(--hairline))] bg-card px-3.5 py-3 text-left',
                'shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]',
                'hover:border-foreground/22 hover:shadow-[0_3px_12px_-6px_hsl(30_30%_8%/0.1)] transition-all',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[11.5px] font-bold tabular-nums text-foreground/90 tracking-tight"
                  style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
                >
                  {ya}년 전
                </span>
                <span className="w-1 h-1 rounded-full bg-foreground/30" aria-hidden />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                  {new Date(entry.createdAt).getFullYear()}
                </span>
                {moodEmoji && <span className="text-[12px] leading-none ml-auto">{moodEmoji}</span>}
              </div>
              <p
                className="text-[12.5px] text-foreground/85 leading-[1.65] line-clamp-2"
                style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
              >
                {entry.body}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

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
      <header className="flex items-center gap-2 px-1">
        <CalendarHeart className="h-3.5 w-3.5 text-foreground/55" strokeWidth={1.8} />
        <h3 className="text-[12px] font-semibold tracking-[-0.005em] text-foreground/80">
          이날의 기록
        </h3>
        <span className="flex-1" aria-hidden />
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/70">
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
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold tabular-nums text-foreground/85 tracking-[-0.005em]">
                  {ya}년 전
                </span>
                <span className="w-0.5 h-0.5 rounded-full bg-foreground/25" aria-hidden />
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground/75">
                  {new Date(entry.createdAt).getFullYear()}
                </span>
                {moodEmoji && <span className="text-[13px] leading-none ml-auto">{moodEmoji}</span>}
              </div>
              <p className="text-[12.5px] text-foreground/80 leading-[1.55] line-clamp-2 tracking-[-0.005em]">
                {entry.body}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

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
      <div className="flex flex-col gap-2">
        {matches.slice(0, 2).map((entry) => {
          const ya = yearsAgo(entry);
          const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood as Mood] : null;
          const lines = entry.body.split('\n').map((l) => l.trim()).filter(Boolean);
          const title = lines[0] ?? '무제';
          const excerpt = lines.slice(1).join(' ');
          const thumb = entry.images?.[0];
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onClickEntry(entry)}
              className={cn(
                'group flex items-center gap-4 rounded-2xl border border-[hsl(var(--hairline))] bg-card px-4 py-3.5 text-left',
                'transition-all hover:border-foreground/15 hover:shadow-[0_6px_20px_-12px_hsl(220_20%_10%/0.15)]',
              )}
            >
              <div className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-primary/8">
                <span className="text-[16px] font-bold leading-none tabular-nums text-primary/80">{ya}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary/60">년 전</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">{title}</h4>
                  {moodEmoji && <span className="text-[13px] leading-none">{moodEmoji}</span>}
                </div>
                {excerpt && <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.55] text-muted-foreground">{excerpt}</p>}
              </div>
              {thumb && (
                <div className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-accent/30 sm:block">
                  <img src={thumb.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

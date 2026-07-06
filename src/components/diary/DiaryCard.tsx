import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiaryEntry } from '@/types/diary';
import { getFeeling, feelingColor } from '@/lib/diary/feelings';
import { plainFromValue } from '@/lib/diary/bodyText';

interface Props { entry: DiaryEntry; onClick: () => void; onToggleStar: () => void; }

export function DiaryCard({ entry, onClick, onToggleStar }: Props) {
  const primary = getFeeling(entry.primaryFeeling);
  const color = feelingColor(entry.primaryFeeling);
  const excerpt = plainFromValue(entry.body).slice(0, 140);
  const day = entry.date.slice(8, 10);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full gap-3 overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-card px-4 py-3 pl-5 text-left transition-colors hover:bg-accent/40"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex flex-col items-center pt-0.5">
        <span className="text-[20px] leading-none">{primary?.emoji ?? '📝'}</span>
        <span className="mt-1 text-[11px] tabular-nums text-muted-foreground">{day}일</span>
      </div>
      <div className="min-w-0 flex-1">
        {entry.title && <div className="truncate text-[14px] font-semibold text-foreground">{entry.title}</div>}
        <p className="line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">{excerpt || '(내용 없음)'}</p>
        {entry.feelings.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entry.feelings.slice(0, 4).map((id) => {
              const f = getFeeling(id);
              if (!f) return null;
              return <span key={id} className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] text-foreground/70">{f.emoji} {f.label}</span>;
            })}
          </div>
        )}
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleStar(); } }}
        className={cn('shrink-0 self-start rounded p-1', entry.starred ? 'text-amber-400' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100')}
        aria-label="별표"
      >
        <Star className={cn('h-4 w-4', entry.starred && 'fill-amber-400')} />
      </span>
    </button>
  );
}

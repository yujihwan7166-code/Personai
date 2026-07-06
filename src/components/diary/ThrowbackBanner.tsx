import type { DiaryEntry } from '@/types/diary';
import { getFeeling } from '@/lib/diary/feelings';

export function ThrowbackBanner({ entries, onOpen }: { entries: DiaryEntry[]; onOpen: (id: string) => void }) {
  if (entries.length === 0) return null;
  const y = new Date().getFullYear();
  return (
    <div className="mb-3 rounded-xl border border-[hsl(var(--hairline))] bg-accent/30 px-4 py-3">
      <div className="mb-1.5 text-[12px] font-semibold text-foreground/80">📅 과거의 오늘</div>
      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onOpen(e.id)}
            className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12.5px] hover:bg-accent"
          >
            <span>{getFeeling(e.primaryFeeling)?.emoji ?? '📝'}</span>
            <span className="shrink-0 text-muted-foreground">{y - Number(e.date.slice(0, 4))}년 전</span>
            <span className="min-w-0 flex-1 truncate text-foreground/80">{e.title || e.date}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

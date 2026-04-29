/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 위키 메인 카드 톤 (rounded-xl + bg-card + hairline).
 * hover 시 우측 [수정] [X] 액션 노출.
 */
import { Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS } from '@/types/journal';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const formatHeader = (entry: JournalEntry): string => {
  const d = new Date(entry.createdAt);
  const date = d.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  });
  const time = d.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${date} · ${time}`;
};

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const headerLabel = formatHeader(entry);
  const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood] : null;
  const moodLabel = entry.mood !== undefined ? MOOD_LABELS[entry.mood] : null;

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-[hsl(var(--hairline))] bg-card p-4',
        'hover:border-foreground/20 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.08)] transition-all',
      )}
    >
      <header className="flex items-baseline gap-2 mb-2">
        <span className="text-[11.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground tabular-nums font-medium">
          {headerLabel}
        </span>
        {moodEmoji && (
          <span
            className="text-[14px] leading-none"
            title={moodLabel ?? ''}
            aria-label={moodLabel ?? ''}
          >
            {moodEmoji}
          </span>
        )}
        {/* hover 액션 */}
        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            aria-label="수정"
            title="수정"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="삭제"
            title="삭제"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </header>
      <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap line-clamp-6">
        {entry.body}
      </p>
    </article>
  );
};

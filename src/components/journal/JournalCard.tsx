/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 디자인 (모던 미니멀 — Linear / Apple 일기 / Notion 톤):
 * - 한 줄 헤더 (날짜 · 시각 · mood + hover 액션)
 * - 깨끗한 본문 (serif + 자연스러운 leading)
 * - 사진 그리드 + 태그 칩
 * - 좌측 큰 컬럼 / 색띠 / 줄친 배경 모두 폐기 (짧은 일기에서도 어색하지 않게)
 */
import { Pencil, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS } from '@/types/journal';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const dateLabel = formatDate(entry.createdAt);
  const timeLabel = formatTime(entry.createdAt);
  const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood as Mood] : null;
  const moodLabel = entry.mood !== undefined ? MOOD_LABELS[entry.mood as Mood] : null;
  const previewBody = entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body;

  return (
    <article
      className={cn(
        'group rounded-xl border border-[hsl(var(--hairline))] bg-card p-5',
        'hover:border-foreground/20 hover:shadow-[0_2px_12px_-6px_hsl(var(--foreground)/0.08)]',
        'transition-all',
      )}
    >
      {/* 한 줄 헤더 — 날짜 · 시각 · mood + 우측 hover 액션 */}
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground tabular-nums shrink-0">
            {dateLabel}
          </h3>
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground/80 shrink-0">
            {timeLabel}
          </span>
          {moodEmoji && (
            <span
              className="text-[15px] leading-none"
              title={moodLabel ?? ''}
              aria-label={moodLabel ?? ''}
            >
              {moodEmoji}
            </span>
          )}
          {entry.bodyFormat === 'markdown' && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 h-4 rounded text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground bg-accent/60"
              title="풍부한 편집"
            >
              <Wand2 className="h-2 w-2" />
              풍부
            </span>
          )}
        </div>
        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0 -mr-1">
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

      {/* 본문 — 깨끗한 serif (들여쓰기·줄친배경·dropcap 폐기) */}
      <p className="font-serif text-[15px] leading-relaxed text-foreground whitespace-pre-wrap line-clamp-7">
        {previewBody}
      </p>

      {/* 사진 그리드 (있을 때만) */}
      {entry.images && entry.images.length > 0 && (
        <div
          className={cn(
            'mt-4 grid gap-1.5',
            entry.images.length === 1 && 'grid-cols-1',
            entry.images.length === 2 && 'grid-cols-2',
            entry.images.length >= 3 && 'grid-cols-3',
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

      {/* 태그 칩 (있을 때만) */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 px-2 h-5 rounded text-[10.5px] font-medium bg-accent/60 text-muted-foreground"
            >
              <span className="text-muted-foreground/70">#</span>
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};

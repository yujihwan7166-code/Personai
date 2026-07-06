/**
 * 일기 카드 — 시간순 리스트의 한 항목 (클린 리스타일).
 *
 * 레퍼런스(Journiv·Moodiary·StoryPad) 공통 패턴:
 *   날짜 pill(좌) + 제목(본문 첫 줄) + 2줄 발췌 + 썸네일(우).
 * 카드 전체 클릭 = 편집 진입. 삭제는 hover 시 우상단 X.
 * 감정은 pill 옆 은은한 컬러 dot 으로만.
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_LABELS, MOOD_TINT } from '@/types/journal';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 본문 → 제목(첫 줄) + 발췌(나머지). */
function splitTitleBody(text: string): { title: string; excerpt: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: '', excerpt: '' };
  return { title: lines[0], excerpt: lines.slice(1).join(' ') };
}

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const d = new Date(entry.createdAt);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const weekday = WEEKDAY_KO[d.getDay()];
  const moodKey = entry.mood !== undefined ? (entry.mood as Mood) : null;

  const previewBody = entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body;
  const { title, excerpt } = splitTitleBody(previewBody);
  const hasBody = previewBody.trim().length > 0;
  const thumb = entry.images?.[0];

  return (
    <article
      onClick={onEdit}
      className={cn(
        'group relative flex cursor-pointer gap-4 rounded-2xl border border-[hsl(var(--hairline))] bg-card px-4 py-3.5',
        'transition-all duration-200 hover:border-foreground/15 hover:shadow-[0_6px_20px_-12px_hsl(220_20%_10%/0.15)]',
      )}
    >
      {/* 날짜 pill */}
      <div className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-accent/50">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">{month}월</span>
        <span className="text-[19px] font-bold leading-none tabular-nums text-foreground">{day}</span>
        <span className="mt-0.5 text-[9px] text-muted-foreground/60">{weekday}</span>
      </div>

      {/* 본문 컬럼 */}
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-1.5">
          {moodKey && (
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', MOOD_TINT[moodKey])}
              title={MOOD_LABELS[moodKey] ?? ''}
              aria-label={MOOD_LABELS[moodKey] ?? ''}
            />
          )}
          <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-foreground">
            {title || (hasBody ? '무제' : '이 날은 한 줄도 없어요')}
          </h3>
        </div>
        {excerpt && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.6] text-muted-foreground">
            {excerpt}
          </p>
        )}
        {(entry.tags?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entry.tags!.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-accent/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 */}
      {thumb && (
        <div className="hidden h-14 w-14 shrink-0 self-center overflow-hidden rounded-lg bg-accent/30 sm:block">
          <img src={thumb.src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}

      {/* 삭제 (hover) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="삭제"
        title="삭제"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </article>
  );
};

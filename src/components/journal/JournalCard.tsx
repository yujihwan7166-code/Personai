/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 디자인 (Hobonichi + Penzu + Bear + Stoic 모방):
 * - 큰 날짜 숫자 헤더 (Hobonichi 다이어리 패턴)
 * - serif 본문 + 줄친 노트 배경 (Penzu 노트북 패턴)
 * - drop cap 첫 글자 (책 챕터 시작)
 * - 좌측 mood 색띠 (Reflectly)
 * - 페이지 모서리 부드러운 그림자
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

const MOOD_STRIPE: Record<Mood, string> = {
  1: 'hsl(0 75% 65%)',     // rose
  2: 'hsl(35 85% 60%)',    // amber
  3: 'hsl(220 10% 60%)',   // slate
  4: 'hsl(155 50% 50%)',   // emerald
  5: 'hsl(200 75% 55%)',   // sky
};

const formatHeader = (iso: string): { day: string; month: string; weekday: string; time: string } => {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: `${d.getMonth() + 1}월`,
    weekday: d.toLocaleDateString('ko-KR', { weekday: 'long' }),
    time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const { day, month, weekday, time } = formatHeader(entry.createdAt);
  const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood] : null;
  const moodLabel = entry.mood !== undefined ? MOOD_LABELS[entry.mood] : null;
  const stripeColor = entry.mood !== undefined ? MOOD_STRIPE[entry.mood] : 'hsl(var(--hairline))';

  return (
    <article
      className={cn(
        'group relative flex items-stretch gap-0 rounded-xl border border-[hsl(var(--hairline))] bg-card overflow-hidden',
        // 책 페이지 그림자 (페이지 모서리 lift)
        'shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.08)]',
        'hover:border-foreground/20 hover:shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)]',
        'transition-all',
      )}
    >
      {/* 좌측 mood 색띠 (Reflectly) */}
      <span
        className="w-1 self-stretch shrink-0"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />

      <div className="flex-1 min-w-0 flex">
        {/* 큰 날짜 숫자 헤더 (Hobonichi 패턴) */}
        <header className="shrink-0 px-5 py-5 border-r border-[hsl(var(--hairline))] flex flex-col items-center justify-start min-w-[72px]">
          <span
            className="text-[44px] font-semibold tracking-tight leading-none tabular-nums text-foreground"
            style={{ fontFamily: 'var(--font-display, ui-serif, Georgia, serif)' }}
          >
            {day}
          </span>
          <span className="mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            {month}
          </span>
          <span className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground/80">
            {weekday.slice(0, 3)}
          </span>
        </header>

        {/* 본문 영역 */}
        <div className="flex-1 min-w-0 py-5 pr-5 pl-5">
          {/* 시간 + mood + hover 액션 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground tracking-wide">
                {time}
              </span>
              {moodEmoji && (
                <span
                  className="text-[18px] leading-none"
                  title={moodLabel ?? ''}
                  aria-label={moodLabel ?? ''}
                >
                  {moodEmoji}
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
          </div>

          {/* 본문 — serif + 첫 줄 들여쓰기 + 줄친 노트 배경 (Penzu 패턴, drop cap 제거) */}
          <p
            className={cn(
              'font-serif text-[15.5px] text-foreground whitespace-pre-wrap line-clamp-7',
            )}
            style={{
              lineHeight: '1.875rem',
              textIndent: '1.4em',
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                transparent 0,
                transparent calc(1.875rem - 1px),
                hsl(var(--hairline) / 0.32) calc(1.875rem - 1px),
                hsl(var(--hairline) / 0.32) 1.875rem
              )`,
            }}
          >
            {entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body}
          </p>

          {/* 풍부 편집 표시 — 작은 배지 */}
          {entry.bodyFormat === 'markdown' && (
            <span
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70"
              title="풍부한 편집으로 작성"
            >
              <Wand2 className="h-2.5 w-2.5" />
              풍부
            </span>
          )}

          {/* 사진 그리드 (있을 때만) */}
          {entry.images && entry.images.length > 0 && (
            <div
              className={cn(
                'mt-3 grid gap-1.5',
                entry.images.length === 1 && 'grid-cols-1',
                entry.images.length === 2 && 'grid-cols-2',
                entry.images.length >= 3 && 'grid-cols-3',
              )}
            >
              {entry.images.slice(0, 3).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-md overflow-hidden bg-card border border-[hsl(var(--hairline))]"
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
        </div>
      </div>
    </article>
  );
};

/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 디자인 (Apple 일기 + Day One + Reflectly 모방):
 * - 좌측 mood 색띠 (감정 시각 시그너처)
 * - 큰 날짜 헤더 + 작은 시각 부제
 * - 풍부한 본문 leading (긴 글 호흡)
 */
import { Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS } from '@/types/journal';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

/** Reflectly 패턴 — 감정별 좌측 색띠. */
const MOOD_STRIPE: Record<Mood, string> = {
  1: 'hsl(0 75% 65%)',     // rose
  2: 'hsl(35 85% 60%)',    // amber
  3: 'hsl(220 10% 60%)',   // slate (보통)
  4: 'hsl(155 50% 50%)',   // emerald
  5: 'hsl(200 75% 55%)',   // sky
};

const formatBigDate = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    }),
    time: d.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
  };
};

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const { date, time } = formatBigDate(entry.createdAt);
  const moodEmoji = entry.mood !== undefined ? MOOD_EMOJI[entry.mood] : null;
  const moodLabel = entry.mood !== undefined ? MOOD_LABELS[entry.mood] : null;
  const stripeColor = entry.mood !== undefined ? MOOD_STRIPE[entry.mood] : 'hsl(var(--hairline))';

  return (
    <article
      className={cn(
        'group relative flex items-stretch gap-4 rounded-xl border border-[hsl(var(--hairline))] bg-card overflow-hidden',
        'hover:border-foreground/20 hover:shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] transition-all',
      )}
    >
      {/* 좌측 mood 색띠 (Reflectly 패턴) */}
      <span
        className="w-1 self-stretch shrink-0"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />

      <div className="flex-1 min-w-0 py-5 pr-5">
        {/* 큰 날짜 헤더 (Apple 일기 패턴) */}
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h3 className="text-[18px] font-semibold tracking-tight leading-none text-foreground shrink-0">
              {date}
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground tracking-wide leading-none">
              {time}
            </span>
            {moodEmoji && (
              <span
                className="text-[20px] leading-none ml-1"
                title={moodLabel ?? ''}
                aria-label={moodLabel ?? ''}
              >
                {moodEmoji}
              </span>
            )}
          </div>

          {/* hover 우측 액션 */}
          <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0 -mr-1.5">
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

        {/* 본문 — Day One 패턴 (긴 글 호흡) */}
        <p className="text-[15px] leading-loose text-foreground whitespace-pre-wrap line-clamp-7">
          {entry.body}
        </p>
      </div>
    </article>
  );
};

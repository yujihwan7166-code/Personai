/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 디자인 (Day One · Hobonichi · Bear · Stoic 패턴 결합):
 * - 좌 날짜 컬럼: 일(day) 큰 숫자 + 월·요일 + mood 컬러 점 (페이지 헤더 톤)
 * - 우 본문 컬럼: 시각·풍부 배지(hover) → 본문(serif 16px 1.85) → 사진 → 태그
 * - 좌·우 사이 hairline 세로선으로 다이어리 페이지 느낌
 * - 짧은 일기에서도 좌 컬럼이 시각 앵커 → 카드가 비어 보이지 않음
 */
import { Pencil, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS, MOOD_TINT, ACTIVITY_META } from '@/types/journal';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

export const JournalCard = ({ entry, onEdit, onDelete }: JournalCardProps) => {
  const d = new Date(entry.createdAt);
  const day = d.getDate();                              // 29
  const month = d.getMonth() + 1;                        // 4
  const weekday = WEEKDAY_KO[d.getDay()];                // 수
  const timeLabel = formatTime(entry.createdAt);

  const moodKey = entry.mood !== undefined ? (entry.mood as Mood) : null;
  const moodEmoji = moodKey ? MOOD_EMOJI[moodKey] : null;
  const moodLabel = moodKey ? MOOD_LABELS[moodKey] : null;

  const previewBody = entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body;
  const hasBody = previewBody.trim().length > 0;

  return (
    <article
      className={cn(
        'group rounded-xl border border-[hsl(var(--hairline))] bg-card pl-4 pr-5 py-4',
        'hover:border-foreground/20 hover:shadow-[0_2px_12px_-6px_hsl(var(--foreground)/0.08)]',
        'transition-all',
      )}
    >
      <div className="flex gap-4">
        {/* ── 좌 날짜 컬럼 (Day One · Hobonichi 패턴) ── */}
        <div className="w-14 shrink-0 flex flex-col items-start pr-4 border-r border-[hsl(var(--hairline))]">
          <span
            className="text-[28px] font-bold tabular-nums leading-none text-foreground group-hover:text-primary transition-colors"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.02em' }}
          >
            {day}
          </span>
          <span className="mt-1.5 text-[10.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            {month}월 · {weekday}
          </span>
          {moodKey && (
            <span
              className={cn('mt-2.5 w-2 h-2 rounded-full', MOOD_TINT[moodKey])}
              title={`${moodLabel ?? ''} ${moodEmoji ?? ''}`.trim()}
              aria-label={moodLabel ?? ''}
            />
          )}
        </div>

        {/* ── 우 본문 컬럼 ── */}
        <div className="flex-1 min-w-0">
          {/* 상단 메타 — 시각 + 풍부 배지 (hover) + 액션 (hover) */}
          <header className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                {timeLabel}
              </span>
              {entry.bodyFormat === 'markdown' && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 h-4 rounded text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground bg-accent/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
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

          {/* 본문 — Bear 패턴: 큰 serif + 여유 leading */}
          {hasBody ? (
            <p
              className="font-serif text-[16px] leading-[1.85] text-foreground whitespace-pre-wrap line-clamp-7"
              style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
            >
              {previewBody}
            </p>
          ) : (
            <p
              className="font-serif text-[14.5px] italic text-muted-foreground/70"
              style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
            >
              이 날은 한 줄도 없어요
            </p>
          )}

          {/* 사진 그리드 (있을 때만) */}
          {entry.images && entry.images.length > 0 && (
            <div
              className={cn(
                'mt-4 grid gap-1.5',
                entry.images.length === 1 && 'grid-cols-1 max-w-[280px]',
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

          {/* 활동 칩 (있을 때만) — 이모지 우선 */}
          {entry.activities && entry.activities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {entry.activities.map((key) => {
                const meta = ACTIVITY_META[key];
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 h-5 rounded text-[10.5px] font-medium bg-accent/60 text-foreground/80"
                    title={meta?.label ?? key}
                  >
                    <span aria-hidden>{meta?.emoji ?? '·'}</span>
                    {meta?.label ?? key}
                  </span>
                );
              })}
            </div>
          )}

          {/* 태그 칩 (있을 때만) */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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

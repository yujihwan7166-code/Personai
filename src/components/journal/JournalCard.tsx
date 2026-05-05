/**
 * 일기 카드 — 시간순 리스트의 한 항목.
 *
 * 디자인 (Day One · Hobonichi · Bear · Stoic 패턴 결합):
 * - 좌 날짜 컬럼: 일(day) 큰 숫자 + 월·요일 + mood 컬러 점 (페이지 헤더 톤)
 * - 우 본문 컬럼: 시각·풍부 배지(hover) → 본문(serif 16px 1.85) → 사진 → 태그
 * - 좌·우 사이 hairline 세로선으로 다이어리 페이지 느낌
 * - 짧은 일기에서도 좌 컬럼이 시각 앵커 → 카드가 비어 보이지 않음
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Pencil, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS, MOOD_TINT, ACTIVITY_META } from '@/types/journal';

/**
 * 본문 미리보기 — 7줄 line-clamp + 잘렸을 때만 페이드 + "더" 시그널.
 * line-clamp 가 적용됐는지 (즉 잘렸는지) clientHeight vs scrollHeight 로 감지.
 */
function BodyPreview({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div className="relative">
      <p
        ref={ref}
        className="text-[17px] leading-[1.85] text-foreground/95 whitespace-pre-wrap line-clamp-7"
        style={{
          fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
          fontWeight: 400,
        }}
      >
        {text}
      </p>
      {truncated && (
        <>
          {/* 그라디언트 페이드 — 본문 자연스럽게 사라짐 */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-b from-transparent to-card"
          />
          {/* "더" 시그널 */}
          <span className="pointer-events-none absolute bottom-0 right-0 text-[10.5px] font-medium text-muted-foreground bg-card px-2 py-0.5 rounded font-mono uppercase tracking-[0.12em]">
            … 더
          </span>
        </>
      )}
    </div>
  );
}

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
        'group rounded-xl border border-[hsl(var(--hairline))] bg-card',
        'pl-5 pr-6 py-5',
        'hover:border-foreground/25 hover:shadow-[0_4px_18px_-6px_hsl(30_30%_8%/0.08)]',
        'transition-all duration-200',
      )}
    >
      <div className="flex gap-5">
        {/* ── 좌 날짜 컬럼 — Hobonichi/NYT 톤 ── */}
        <div className="w-16 shrink-0 flex flex-col items-start pr-5 border-r border-[hsl(var(--hairline))]">
          <span
            className="text-[36px] font-bold tabular-nums leading-none text-foreground group-hover:text-primary transition-colors"
            style={{
              fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
              letterSpacing: '-0.04em',
            }}
          >
            {day}
          </span>
          <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {month}월
          </span>
          <span className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80">
            {weekday}요일
          </span>
          {moodKey && (
            <span
              className={cn('mt-3 w-2.5 h-2.5 rounded-full', MOOD_TINT[moodKey])}
              title={`${moodLabel ?? ''} ${moodEmoji ?? ''}`.trim()}
              aria-label={moodLabel ?? ''}
            />
          )}
        </div>

        {/* ── 우 본문 컬럼 ── */}
        <div className="flex-1 min-w-0">
          {/* 상단 메타 — 시각 + 풍부 배지 (hover) + 액션 (hover) */}
          <header className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] tabular-nums text-muted-foreground">
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

          {/* 본문 — Bear/NYT 패턴: 큰 serif + 여유 leading */}
          {hasBody ? (
            <BodyPreview text={previewBody} />
          ) : (
            <p
              className="text-[15px] italic text-muted-foreground/75"
              style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
            >
              이 날은 한 줄도 없어요.
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

/**
 * 묻혀있던 한 페이지 — 30일+ 묵힌 일기 중 랜덤 1개 surface (Day One·Readwise 차용).
 *
 * 매일 자정 시드 회전 (같은 날 다시 들어가도 같은 entry).
 * 클릭 시 편집 모달 열림.
 */
import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI } from '@/types/journal';

interface JournalRandomCardProps {
  allEntries: JournalEntry[];
  /** OnThisDayCard 와 중복 방지 — 그쪽이 잡은 항목 id 들 (옵션). */
  excludeIds?: string[];
  onClickEntry: (entry: JournalEntry) => void;
}

const STALE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜 시드 — YYYYMMDD 정수. 같은 날엔 동일 결과. */
function todaySeed(): number {
  const t = new Date();
  return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
}

/** 결정론적 정수 → 인덱스. */
function pickIndex(seed: number, length: number): number {
  if (length <= 0) return 0;
  // 단순 LCG 한 단계
  const x = (seed * 1664525 + 1013904223) >>> 0;
  return x % length;
}

/** "OOO 전" 라벨 — 1년 미만은 N개월, 1년 이상은 N년. */
function timeAgoLabel(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / DAY_MS);
  if (days < 60) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}달 전`;
  const years = Math.floor(days / 365);
  return `${years}년 전`;
}

export const JournalRandomCard = ({ allEntries, excludeIds, onClickEntry }: JournalRandomCardProps) => {
  const picked = useMemo(() => {
    const cutoff = Date.now() - STALE_DAYS * DAY_MS;
    const exclude = new Set(excludeIds ?? []);
    const pool = allEntries.filter((e) => {
      if (exclude.has(e.id)) return false;
      const t = new Date(e.createdAt).getTime();
      return t < cutoff && e.body.trim().length > 0;
    });
    if (pool.length === 0) return null;
    const idx = pickIndex(todaySeed(), pool.length);
    return pool[idx];
  }, [allEntries, excludeIds]);

  if (!picked) return null;

  const moodEmoji = picked.mood !== undefined ? MOOD_EMOJI[picked.mood as Mood] : null;
  const previewBody = picked.bodyFormat === 'markdown' ? stripMarkdown(picked.body) : picked.body;
  const ago = timeAgoLabel(new Date(picked.createdAt));
  const dateLabel = new Date(picked.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/85 font-semibold">
          묻혀있던 한 페이지
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          매일 새롭게
        </span>
      </header>
      <button
        type="button"
        onClick={() => onClickEntry(picked)}
        className={cn(
          'group flex items-start gap-3.5 rounded-xl border border-[hsl(var(--hairline))] bg-violet-50/40 dark:bg-violet-950/15 px-4 py-3.5 text-left',
          'hover:border-primary/40 hover:shadow-[0_4px_14px_-6px_hsl(265_60%_55%_/_0.18)] transition-all',
        )}
      >
        <span className="inline-flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-violet-500/15 text-violet-800 dark:text-violet-300 shrink-0">
          <span
            className="text-[11px] font-bold tabular-nums leading-none tracking-tight"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            {ago}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              {dateLabel}
            </span>
            {moodEmoji && <span className="text-[14px] leading-none">{moodEmoji}</span>}
          </div>
          <p
            className="text-[14px] text-foreground/90 leading-[1.7] line-clamp-3"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            {previewBody}
          </p>
        </div>
      </button>
    </section>
  );
};

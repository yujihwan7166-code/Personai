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
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline gap-2 px-1">
        <Sparkles className="h-3 w-3 text-foreground/60" />
        <h3 className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/85 font-semibold">
          묻혀있던 한 페이지
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
      </header>
      <button
        type="button"
        onClick={() => onClickEntry(picked)}
        className={cn(
          'group flex flex-col gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 py-2.5 text-left',
          'hover:border-foreground/25 hover:shadow-[0_2px_10px_-4px_hsl(30_30%_8%/0.08)] transition-all',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[11.5px] font-bold tabular-nums text-foreground/90 tracking-tight"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            {ago}
          </span>
          <span className="w-1 h-1 rounded-full bg-foreground/30" aria-hidden />
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground truncate">
            {dateLabel}
          </span>
          {moodEmoji && <span className="text-[12px] leading-none ml-auto">{moodEmoji}</span>}
        </div>
        <p
          className="text-[12.5px] text-foreground/85 leading-[1.65] line-clamp-3"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
        >
          {previewBody}
        </p>
      </button>
    </section>
  );
};

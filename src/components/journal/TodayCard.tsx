/**
 * Today 카드 — 페이지 상단 빠른 진입 + 오늘 상태 한 줄 요약.
 *
 * Day One 'Today Card' 패턴:
 * - 작성 X = 큰 prompt + AI 가이드 질문 + CTA
 * - 작성 1+ = 작은 카운트 + '더 적기' 버튼 (시간순 리스트와 별개로 빠른 진입)
 */
import { useMemo } from 'react';
import { Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/types/journal';

const PROMPTS = [
  '오늘 어떤 결정을 했나요?',
  '기억에 남는 한 순간은?',
  '내일 한 가지 하고 싶은 것은?',
  '지금 어떤 기분인가요?',
  '오늘 배운 한 가지는?',
] as const;

interface TodayCardProps {
  todayEntries: JournalEntry[];
  onAdd: () => void;
}

export const TodayCard = ({ todayEntries, onAdd }: TodayCardProps) => {
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], []);
  const hasEntries = todayEntries.length > 0;
  const today = new Date();
  const dateLabel = today.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
  });

  if (!hasEntries) {
    // 작성 X — 큰 prompt 카드 (책 표지 톤)
    return (
      <article
        className={cn(
          'relative rounded-2xl border border-[hsl(var(--hairline))] bg-card p-7',
          'shadow-[0_4px_18px_-8px_hsl(30_30%_8%/0.08)]',
          'flex flex-col gap-4',
        )}
      >
        <header className="flex items-baseline gap-3">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/70 font-semibold">
            오늘
          </span>
          <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {dateLabel}
          </span>
        </header>
        <div className="flex items-start gap-4">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p
              className="text-[20px] sm:text-[22px] text-foreground leading-[1.5]"
              style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
            >
              {prompt}
            </p>
            <p
              className="mt-2 text-[12.5px] text-muted-foreground italic"
              style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
            >
              한 줄이라도 좋아요. 시간이 지나 다시 펼쳐 읽을 수 있어요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="self-start inline-flex items-center gap-1.5 px-4 h-9 text-[13px] font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <Pencil className="h-3.5 w-3.5" />
          오늘 일기 쓰기
        </button>
      </article>
    );
  }

  // 작성 1+ — 작은 카운트 + 더 적기
  return (
    <article
      className={cn(
        'flex items-center gap-3.5 rounded-xl border border-[hsl(var(--hairline))] bg-card px-5 py-3.5',
      )}
    >
      <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 text-[14px]">
        ✓
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] text-foreground font-medium">
          오늘 일기 {todayEntries.length}개 작성됨
        </p>
        <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground mt-1">
          {dateLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-3 h-8 text-[12px] font-semibold rounded-md border border-[hsl(var(--hairline))] bg-card hover:bg-accent text-foreground transition-colors shrink-0"
      >
        <Pencil className="h-3 w-3" />
        더 적기
      </button>
    </article>
  );
};

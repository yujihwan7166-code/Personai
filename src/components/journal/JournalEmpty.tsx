/**
 * 일기 빈 상태 — '아직 일기가 없어요' + 정적 인용 + CTA.
 *
 * 5Minute Journal / Reflectly 톤 — 큰 아이콘 + 따뜻한 카피 + 동기부여 한 줄.
 */
import { useMemo } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 정적 인용 — 매 진입 시 랜덤 (Stoic 패턴). */
const QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: '오늘은 다시 오지 않습니다.', author: '단테' },
  { text: '하루를 살아낸다는 것은 작은 기적이에요.', author: '랄프 왈도 에머슨' },
  { text: '글쓰기는 마음의 산책이다.', author: '버지니아 울프' },
  { text: '오늘 한 줄이 내일의 나를 만든다.', author: '앤 딜라드' },
  { text: '쓰는 행위가 곧 생각하는 일이다.', author: '데이비드 매컬로' },
];

interface JournalEmptyProps {
  onAdd: () => void;
  className?: string;
}

export const JournalEmpty = ({ onAdd, className }: JournalEmptyProps) => {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-6 text-center',
        'rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-card/40',
        className,
      )}
    >
      {/* 큰 아이콘 + 그림자 */}
      <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/60 text-foreground/70 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.15)]">
        <BookOpen className="h-8 w-8" strokeWidth={1.5} />
      </div>

      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
        오늘의 첫 줄을 적어보세요
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed max-w-[320px]">
        하루의 한 순간, 기분, 생각을 남기면<br />
        시간이 지나 다시 읽을 수 있어요.
      </p>

      {/* 정적 인용 — 동기부여 (5MJ 패턴) */}
      <blockquote className="mt-7 max-w-[340px] border-l-2 border-[hsl(var(--hairline))] pl-4 text-left">
        <p className="text-[13px] text-foreground/80 italic leading-relaxed">
          "{quote.text}"
        </p>
        <footer className="mt-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          — {quote.author}
        </footer>
      </blockquote>

      <button
        type="button"
        onClick={onAdd}
        className="mt-7 inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity shadow-sm"
      >
        <Pencil className="h-3.5 w-3.5" />
        오늘 일기 쓰기
      </button>
    </div>
  );
};

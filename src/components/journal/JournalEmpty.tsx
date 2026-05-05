/**
 * 일기 빈 상태 — 책·노트북 톤.
 *
 * Stoic + 5MJ + 책 첫 페이지 패턴 — 따뜻한 페이퍼 + 인용.
 */
import { useMemo } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: '오늘은 다시 오지 않습니다.', author: '단테' },
  { text: '하루를 살아낸다는 것은 작은 기적이에요.', author: '에머슨' },
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
        'relative flex flex-col items-center justify-center py-20 px-6 text-center',
        // 책 첫 페이지 그림자
        'rounded-2xl border border-[hsl(var(--hairline))] bg-card',
        'shadow-[0_4px_16px_-8px_hsl(var(--foreground)/0.1)]',
        // 줄친 노트 배경 (subtle, 페이지 자체)
        className,
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent 0,
          transparent calc(2rem - 1px),
          hsl(var(--hairline) / 0.35) calc(2rem - 1px),
          hsl(var(--hairline) / 0.35) 2rem
        )`,
      }}
    >
      {/* 큰 아이콘 */}
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/60 text-foreground/70 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.15)]">
        <BookOpen className="h-8 w-8" strokeWidth={1.5} />
      </div>

      <h2
        className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground"
        style={{
          fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
          letterSpacing: '-0.015em',
        }}
      >
        오늘의 첫 페이지
      </h2>
      <p
        className="mt-3 text-[15px] text-muted-foreground leading-[1.75] max-w-[380px]"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        한 순간, 한 기분, 한 생각.<br />
        시간이 지나 다시 펼쳐 읽을 수 있도록.
      </p>

      {/* 인용 — 책 챕터 인용 패턴 */}
      <blockquote className="mt-9 max-w-[400px] border-l-2 border-[hsl(var(--hairline))] pl-5 text-left">
        <p
          className="text-[15px] text-foreground/85 italic leading-[1.7]"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
        >
          "{quote.text}"
        </p>
        <footer className="mt-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
          — {quote.author}
        </footer>
      </blockquote>

      <button
        type="button"
        onClick={onAdd}
        className="mt-9 inline-flex items-center gap-1.5 px-5 h-10 text-[13px] font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        <Pencil className="h-3.5 w-3.5" />
        오늘 일기 쓰기
      </button>
    </div>
  );
};

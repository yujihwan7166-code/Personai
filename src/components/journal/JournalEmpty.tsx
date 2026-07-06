import { BookOpen, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalEmptyProps {
  onAdd: (starter?: string) => void;
  className?: string;
}

export const JournalEmpty = ({ onAdd, className }: JournalEmptyProps) => {
  return (
    <section
      aria-label="첫 일기 작성"
      className={cn(
        'relative min-h-[520px] overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-[0_10px_28px_-26px_hsl(30_30%_8%/0.32)]',
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-75"
        aria-hidden
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(2rem - 1px),
            hsl(var(--foreground) / 0.065) calc(2rem - 1px),
            hsl(var(--foreground) / 0.065) 2rem
          )`,
        }}
      />

      <div className="relative z-10 flex min-h-[520px] items-center justify-center px-5 py-14 text-center">
        <div className="w-full max-w-[560px]">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/[0.035] text-foreground/70 shadow-[0_10px_30px_-24px_hsl(var(--foreground)/0.45)]">
            <BookOpen className="h-8 w-8" strokeWidth={1.6} />
          </div>

          <h2 className="font-display text-[32px] font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[38px]">
            오늘의 첫 페이지
          </h2>

          <p className="mx-auto mt-6 max-w-[360px] text-[15px] leading-7 text-muted-foreground">
            한 순간, 한 기분, 한 생각.
            <br />
            시간이 지나 다시 펼쳐 읽을 수 있도록.
          </p>

          <figure className="mx-auto mt-8 max-w-[360px] border-l-2 border-[hsl(var(--hairline))] py-1 pl-6 text-left">
            <blockquote className="font-display text-[16px] leading-7 text-foreground/85">
              "오늘 한 줄이 내일의 나를 만든다."
            </blockquote>
            <figcaption className="mt-2 text-[13px] text-muted-foreground">
              - 앤 딜라드
            </figcaption>
          </figure>

          <button
            type="button"
            onClick={() => onAdd()}
            className="mt-9 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.7)] transition-colors hover:bg-primary/90"
          >
            <PenLine className="h-4 w-4" strokeWidth={1.8} />
            오늘의 일기 쓰기
          </button>
        </div>
      </div>
    </section>
  );
};

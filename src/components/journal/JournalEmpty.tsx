/**
 * 일기 빈 상태 — '아직 일기가 없어요' + CTA.
 *
 * PlannerEmpty 톤 차용 (dashed border, 페이퍼 톤).
 */
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalEmptyProps {
  onAdd: () => void;
  className?: string;
}

export const JournalEmpty = ({ onAdd, className }: JournalEmptyProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      'rounded-xl border border-dashed border-[hsl(var(--hairline))]',
      className,
    )}
  >
    <BookOpen className="h-7 w-7 text-muted-foreground mb-3" />
    <p className="text-[14px] text-foreground font-medium">
      아직 일기가 없어요
    </p>
    <p className="mt-1.5 text-[12px] text-muted-foreground leading-snug max-w-[260px]">
      오늘 한 줄 적어보세요. 날짜·시각은 자동으로 기록돼요.
    </p>
    <button
      type="button"
      onClick={onAdd}
      className="mt-4 px-3.5 py-2 text-[12.5px] font-semibold rounded-md border border-[hsl(var(--hairline))] bg-card text-foreground hover:bg-accent hover:border-foreground/30 transition-colors"
    >
      + 첫 일기
    </button>
  </div>
);

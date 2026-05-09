/**
 * 빈 상태 — 인박스/시간표/주간뷰 모두 사용. variant 로 톤 조절.
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PlannerEmptyProps {
  /** 메인 카피. */
  title: string;
  /** 보조 카피 또는 액션 힌트. */
  hint?: string;
  /** 좌측 아이콘 (lucide 등). */
  icon?: ReactNode;
  /** 빈 상태 CTA — 사용자가 다음 행동을 명확히 할 수 있게. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const PlannerEmpty = ({ title, hint, icon, action, className }: PlannerEmptyProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center mt-2',
      'rounded-2xl border border-dashed border-[hsl(var(--hairline))]',
      'text-muted-foreground/80 bg-card/30',
      className,
    )}
  >
    {icon && (
      <div className="mb-3 inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-foreground/[0.04] text-muted-foreground/80">
        {icon}
      </div>
    )}
    <p className="text-[13.5px] leading-tight text-foreground font-medium">{title}</p>
    {hint && (
      <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-snug max-w-[240px]">
        {hint}
      </p>
    )}
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="mt-3.5 px-3.5 py-1.5 text-[11.5px] font-semibold rounded-full border border-primary/35 bg-card text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

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
      'flex flex-col items-center justify-center py-10 px-4 text-center mt-2',
      'rounded-lg border border-dashed border-foreground/20',
      'text-muted-foreground/80',
      className,
    )}
  >
    {icon && <div className="mb-2.5 text-muted-foreground">{icon}</div>}
    <p className="text-[13px] leading-tight text-foreground font-medium">{title}</p>
    {hint && (
      <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-snug max-w-[220px]">
        {hint}
      </p>
    )}
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="mt-3 px-3 py-1.5 text-[11.5px] font-semibold rounded-md border border-foreground/20 bg-card text-foreground hover:bg-accent hover:border-foreground/30 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

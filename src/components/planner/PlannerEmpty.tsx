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
  className?: string;
}

export const PlannerEmpty = ({ title, hint, icon, className }: PlannerEmptyProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-10 px-4 text-center',
      'text-muted-foreground/80',
      className,
    )}
  >
    {icon && <div className="mb-2 opacity-60">{icon}</div>}
    <p className="text-[13px] leading-tight">{title}</p>
    {hint && (
      <p className="mt-1 text-[11px] text-muted-foreground/60 leading-tight">
        {hint}
      </p>
    )}
  </div>
);

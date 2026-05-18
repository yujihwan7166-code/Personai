/**
 * 빈 상태 (Empty State) — 공용.
 *
 * 각 페이지가 빈 화면 안내를 각자 다른 모양으로 표시 중. 일관 톤 위해 공용.
 *
 * 사용:
 *   <EmptyState
 *     icon={<Inbox className="w-8 h-8" />}
 *     title="할 일 없음"
 *     description="첫 항목을 추가해보세요."
 *     action={<Button onClick={addOne}>추가</Button>}
 *   />
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** 'compact' (좁은 영역) / 'centered' (전체 중앙, 기본). */
  variant?: 'compact' | 'centered';
  className?: string;
}

export function EmptyState({
  icon, title, description, action, variant = 'centered', className,
}: Props) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center select-none',
        isCompact ? 'py-6 gap-2' : 'py-12 gap-3',
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="text-muted-foreground/50">
          {icon}
        </div>
      )}
      <h3 className={cn('font-medium text-foreground', isCompact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-xs', isCompact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && (
        <div className={cn(isCompact ? 'mt-1' : 'mt-2')}>
          {action}
        </div>
      )}
    </div>
  );
}

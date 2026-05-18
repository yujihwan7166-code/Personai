/**
 * Progress — 진행 막대 (determinate / indeterminate).
 *
 * Radix Progress 보다 가볍게. value 0~100. indeterminate 시 애니메이션.
 */

import { cn } from '@/lib/utils';

interface Props {
  /** 0 ~ 100. undefined → indeterminate */
  value?: number;
  className?: string;
  /** 막대 색 (Tailwind class) */
  barClassName?: string;
  /** aria-label */
  label?: string;
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function Progress({ value, className, barClassName, label = '진행률' }: Props) {
  const indeterminate = value === undefined || value === null;
  const v = indeterminate ? 0 : clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : v}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full bg-primary transition-[width] duration-200',
          indeterminate && 'animate-pulse w-1/3',
          barClassName,
        )}
        style={indeterminate ? undefined : { width: `${v}%` }}
      />
    </div>
  );
}

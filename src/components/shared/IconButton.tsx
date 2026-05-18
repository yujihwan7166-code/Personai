/**
 * 아이콘 전용 버튼 — toolbar / 사이드바 / 카드 우상단 등 표준화.
 *
 * aria-label 필수 (a11y). tooltip 도 자동 (title).
 * variant: 'ghost' (기본 — hover bg) / 'subtle' (덜 띄게) / 'active' (현재 상태)
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** 스크린리더용 + tooltip 자동. 필수. */
  label: string;
  variant?: 'ghost' | 'subtle' | 'active';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={rest.title ?? label}
      className={cn(
        'inline-flex items-center justify-center rounded transition-colors',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        variant === 'ghost' && 'text-muted-foreground hover:text-foreground hover:bg-accent',
        variant === 'subtle' && 'text-muted-foreground/70 hover:text-foreground hover:bg-accent/60',
        variant === 'active' && 'bg-accent text-foreground shadow-sm',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});

/**
 * 구분선 — 가로/세로 + 옵션 label.
 *
 * 메뉴/리스트/카드 사이. Radix Separator 보다 가볍게 + label 지원.
 */

import { cn } from '@/lib/utils';

interface Props {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Divider({ orientation = 'horizontal', label, className }: Props) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block w-px self-stretch bg-border/60', className)}
      />
    );
  }
  if (label) {
    return (
      <div role="separator" aria-orientation="horizontal" className={cn('flex items-center gap-2 my-2', className)}>
        <span className="h-px flex-1 bg-border/60" aria-hidden />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
        <span className="h-px flex-1 bg-border/60" aria-hidden />
      </div>
    );
  }
  return <hr role="separator" className={cn('border-0 h-px bg-border/60 my-2', className)} />;
}

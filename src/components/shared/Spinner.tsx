/**
 * Spinner — 로딩 표시 (SVG 회전).
 *
 * size: 'sm' | 'md' | 'lg'.
 * 버튼 안 / 인라인 / 풀 화면 어디나.
 */

import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const SIZE = { sm: 14, md: 18, lg: 28 } as const;

export function Spinner({ size = 'md', className, label = '로딩 중' }: Props) {
  const px = SIZE[size];
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        className="animate-spin text-muted-foreground"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

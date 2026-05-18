/**
 * Pill — 작은 둥근 라벨 (태그/카테고리/카운트).
 *
 * Badge 보다 더 둥글고 컴팩트. 색 톤 변형.
 */

import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

interface Props {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function Pill({ tone = 'neutral', className, children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[10px] font-medium leading-4',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

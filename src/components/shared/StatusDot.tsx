/**
 * 상태 인디케이터 작은 점 — 활성/대기/에러 등.
 *
 * tone: 'live' (초록), 'busy' (앰버), 'idle' (회색), 'error' (빨강), 'info' (파랑).
 * 옵션: pulse — 살짝 깜박이는 애니메이션 (실시간 진행 표시).
 */

import { cn } from '@/lib/utils';

type Tone = 'live' | 'busy' | 'idle' | 'error' | 'info';

interface Props {
  tone?: Tone;
  pulse?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

const TONE_BG: Record<Tone, string> = {
  live: 'bg-emerald-500',
  busy: 'bg-amber-500',
  idle: 'bg-muted-foreground/50',
  error: 'bg-destructive',
  info: 'bg-blue-500',
};

export function StatusDot({ tone = 'idle', pulse = false, size = 'sm', label, className }: Props) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      role={label ? 'status' : undefined}
      aria-label={label}
    >
      <span
        className={cn(
          'inline-block rounded-full',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          TONE_BG[tone],
          pulse && 'animate-pulse',
        )}
        aria-hidden
      />
      {label && <span className="text-[11px] text-muted-foreground">{label}</span>}
    </span>
  );
}

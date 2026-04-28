/**
 * 한 항목(Event 또는 Task) 표시 — variant 2종.
 *
 * - inbox: 시간 미배정 할일 (체크박스 + 제목)
 * - block: 시간표 위 시간 블록 (시간칩 + 제목, 이벤트는 색 띠)
 *
 * Phase 1 = 최소 시각. Phase 2 에서 hover/색·간격 정교화.
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxCardProps {
  variant: 'inbox';
  title: string;
  done: boolean;
  onToggle: () => void;
  onClick?: () => void;
}

interface BlockCardProps {
  variant: 'block';
  title: string;
  /** "14:00" 형식. */
  startLabel: string;
  /** Event 면 색 띠, Task 면 회색. */
  kind: 'event' | 'task';
  done?: boolean;
  color?: string;
  onClick?: () => void;
}

type PlannerCardProps = InboxCardProps | BlockCardProps;

export const PlannerCard = (props: PlannerCardProps) => {
  if (props.variant === 'inbox') {
    const { title, done, onToggle, onClick } = props;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${title}${done ? ' (완료됨)' : ''} — 클릭해서 시간 배정`}
        className={cn(
          'group flex items-center gap-2.5 px-2 py-1.5 rounded-md',
          'hover:bg-accent cursor-pointer transition-colors',
          'focus:outline-none focus:bg-accent',
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border transition-all shrink-0',
            done
              ? 'bg-foreground border-foreground text-background'
              : 'border-[hsl(var(--hairline))] hover:border-foreground/50 hover:scale-110',
          )}
          aria-label={done ? '완료 취소' : '완료'}
        >
          {done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
        </button>
        <span
          className={cn(
            'text-[13.5px] leading-tight truncate flex-1 text-foreground',
            done && 'line-through text-muted-foreground',
          )}
        >
          {title}
        </span>
      </div>
    );
  }

  // variant === 'block'
  const { title, startLabel, kind, done, color, onClick } = props;
  const stripeColor = color ?? (kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(var(--muted-foreground) / 0.6)');
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${kind === 'event' ? '일정' : '할 일'} ${startLabel} ${title}${done ? ' (완료됨)' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group flex items-stretch gap-2.5 pr-2.5 py-2 rounded-lg cursor-pointer overflow-hidden',
        'border border-[hsl(var(--hairline))] bg-card',
        'hover:border-foreground/20 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.1)] transition-all',
        'focus:outline-none focus:border-foreground/40',
        done && 'opacity-50',
      )}
    >
      <span
        className="w-[3px] self-stretch shrink-0"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 py-px">
        <span className="block text-[10.5px] font-mono tabular-nums text-muted-foreground tracking-wide font-semibold">
          {startLabel}
        </span>
        <p className={cn(
          'text-[13px] leading-snug mt-0.5 truncate text-foreground font-medium',
          done && 'line-through',
        )}>
          {title}
        </p>
      </div>
    </div>
  );
};

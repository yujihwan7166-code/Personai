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
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md',
          'hover:bg-[hsl(var(--accent))] cursor-pointer transition-colors',
        )}
        onClick={onClick}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors shrink-0',
            done
              ? 'bg-foreground border-foreground text-background'
              : 'border-[hsl(var(--hairline))] hover:border-foreground/40',
          )}
          aria-label={done ? '완료 취소' : '완료'}
        >
          {done && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
        <span
          className={cn(
            'text-[13px] leading-tight truncate',
            done && 'line-through text-muted-foreground/60',
          )}
        >
          {title}
        </span>
      </div>
    );
  }

  // variant === 'block'
  const { title, startLabel, kind, done, color, onClick } = props;
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer',
        'border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
        'hover:bg-[hsl(var(--accent))] transition-colors',
        done && 'opacity-50',
      )}
    >
      <span
        className="mt-0.5 inline-block w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: color ?? (kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(var(--muted-foreground))') }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">{startLabel}</span>
        </div>
        <p className={cn('text-[12.5px] leading-tight mt-0.5 truncate', done && 'line-through')}>
          {title}
        </p>
      </div>
    </div>
  );
};

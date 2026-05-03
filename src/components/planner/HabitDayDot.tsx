/**
 * 습관 체크 dot — list/calendar 공통.
 *
 * 상태:
 *   - 스케줄 X       → 회색 작은 점
 *   - 스케줄 O 미체크 → 빈 원 (보더만)
 *   - 스케줄 O 체크   → habit color 채움
 *   - timesPerDay > 1 → 빈 원 안에 N/M 작게
 */
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS, type TaskListColor } from '@/types/planner';

interface HabitDayDotProps {
  scheduled: boolean;
  count: number;          // 체크인 count (0 = 미체크)
  timesPerDay: number;    // 1 또는 N
  color: TaskListColor;
  isToday?: boolean;
  isFuture?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  onShiftClick?: () => void;
  ariaLabel?: string;
}

export const HabitDayDot = ({
  scheduled, count, timesPerDay, color,
  isToday, isFuture, size = 'md', onClick, onShiftClick, ariaLabel,
}: HabitDayDotProps) => {
  const completed = count >= timesPerDay;
  const partial = count > 0 && count < timesPerDay;
  const stripe = (TASK_LIST_COLORS[color] ?? TASK_LIST_COLORS.blue).stripe;
  const dim = `color-mix(in oklab, ${stripe} 78%, hsl(var(--background)))`;

  const sz = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const fontSz = size === 'sm' ? 'text-[8px]' : 'text-[9.5px]';

  if (!scheduled) {
    return (
      <span
        aria-label={ariaLabel ?? '스케줄 없음'}
        className={cn(
          sz, 'inline-flex items-center justify-center rounded-full',
          'bg-foreground/8',
          isFuture && 'opacity-60',
        )}
      >
        <span className="h-[3px] w-[3px] rounded-full bg-foreground/25" aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (completed ? '체크 해제' : '체크')}
      onClick={(e) => {
        if (e.shiftKey && onShiftClick) onShiftClick();
        else onClick?.();
      }}
      style={completed
        ? { backgroundColor: dim, borderColor: stripe }
        : partial
          ? { borderColor: stripe }
          : undefined
      }
      className={cn(
        sz,
        'inline-flex items-center justify-center rounded-full transition-all',
        'border-[1.5px] hover:scale-110 active:scale-95',
        !completed && !partial && 'border-foreground/25 hover:border-foreground/45',
        isToday && !completed && 'ring-2 ring-foreground/15 ring-offset-1 ring-offset-background',
        isFuture && 'opacity-50',
      )}
    >
      {timesPerDay > 1 && partial && (
        <span
          className={cn(fontSz, 'font-mono font-semibold tabular-nums')}
          style={{ color: stripe }}
        >
          {count}
        </span>
      )}
    </button>
  );
};

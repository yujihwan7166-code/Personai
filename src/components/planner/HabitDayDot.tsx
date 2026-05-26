/**
 * 습관 체크 dot — list/calendar 공통.
 *
 * 상태:
 *   - 스케줄 X       → 작은 회색 점만 (시각적 노이즈 최소)
 *   - 스케줄 O 미체크 → 회색 빈 원
 *   - 스케줄 O 체크   → habit color 채움 + 흰색 ✓
 *   - timesPerDay > 1 + partial → 빈 원 안에 N (color text)
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS, type TaskListColor } from '@/types/planner';

interface HabitDayDotProps {
  scheduled: boolean;
  count: number;
  timesPerDay: number;
  color: TaskListColor;
  isToday?: boolean;
  isFuture?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onShiftClick?: () => void;
  ariaLabel?: string;
}

const SZ = {
  sm: { box: 'h-[18px] w-[18px]', font: 'text-[9px]',  check: 'h-2.5 w-2.5' },
  md: { box: 'h-6 w-6',           font: 'text-[10.5px]', check: 'h-3 w-3' },
  lg: { box: 'h-8 w-8',           font: 'text-[12px]',   check: 'h-4 w-4' },
} as const;

export const HabitDayDot = ({
  scheduled, count, timesPerDay, color,
  isToday, isFuture, size = 'md', onClick, onShiftClick, ariaLabel,
}: HabitDayDotProps) => {
  const completed = count >= timesPerDay;
  const partial = count > 0 && count < timesPerDay;
  const stripe = (TASK_LIST_COLORS[color] ?? TASK_LIST_COLORS.blue).stripe;
  const sz = SZ[size];

  if (!scheduled) {
    return (
      <span
        aria-label={ariaLabel ?? '스케줄 없음'}
        className={cn(
          sz.box, 'inline-flex items-center justify-center',
          isFuture && 'opacity-50',
        )}
      >
        <span className="h-1 w-1 rounded-full bg-foreground/20" aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isFuture}
      aria-disabled={isFuture}
      aria-label={ariaLabel ?? (isFuture ? '미래 — 체크 불가' : completed ? '체크 해제' : '체크')}
      title={isFuture ? '미래 날짜는 체크할 수 없어요' : undefined}
      onClick={isFuture ? undefined : (e) => {
        if (e.shiftKey && onShiftClick) onShiftClick();
        else onClick?.();
      }}
      style={completed
        ? { backgroundColor: stripe, borderColor: stripe }
        : partial
          ? { borderColor: stripe }
          : undefined
      }
      className={cn(
        sz.box,
        'inline-flex items-center justify-center rounded-full transition-all',
        'border-[1.5px]',
        !isFuture && 'hover:scale-110 active:scale-95',
        !completed && !partial && 'border-foreground/22 bg-transparent',
        !completed && !partial && !isFuture && 'hover:border-primary/45',
        isToday && !completed && 'border-primary/35 ring-2 ring-primary/18 ring-offset-1 ring-offset-background',
        isFuture && 'opacity-50 cursor-not-allowed',
      )}
    >
      {completed && (
        <Check
          className={cn(sz.check, 'text-white')}
          strokeWidth={3.5}
          aria-hidden
        />
      )}
      {!completed && partial && (
        <span
          className={cn(sz.font, 'font-mono font-bold tabular-nums')}
          style={{ color: stripe }}
        >
          {count}
        </span>
      )}
    </button>
  );
};

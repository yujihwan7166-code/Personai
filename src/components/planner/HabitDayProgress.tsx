/**
 * 7일 헤더의 진행률 도넛 — 그날의 (완료된 스케줄 habit) / (스케줄 habit) 비율.
 *
 * SVG circle stroke-dasharray 트릭. 28×28px 원 + 위 요일 + 아래 날짜.
 */
import { cn } from '@/lib/utils';

interface HabitDayProgressProps {
  weekday: string;       // '월'
  day: number;           // 27
  completed: number;
  scheduled: number;
  isToday?: boolean;
  isPast?: boolean;
}

const WEEKDAY_TONE = {
  sun: 'text-rose-500/70',
  sat: 'text-blue-500/70',
  base: 'text-foreground/45',
  today: 'text-blue-500',
} as const;

export const HabitDayProgress = ({
  weekday, day, completed, scheduled, isToday, isPast,
}: HabitDayProgressProps) => {
  const ratio = scheduled === 0 ? 0 : Math.min(1, completed / scheduled);
  const r = 11;                // 원 반지름
  const c = 2 * Math.PI * r;   // 둘레
  const dashOffset = c * (1 - ratio);

  // 색조: 오늘=파란, 과거 완료=초록계열, 미완 = 옅은 회색
  const ringColor = isToday
    ? 'hsl(220 70% 55%)'
    : ratio === 1
      ? 'hsl(160 60% 45%)'
      : ratio > 0
        ? 'hsl(220 70% 55%)'
        : 'hsl(220 10% 60% / 0.25)';

  const wdToneClass =
    weekday === '일' ? WEEKDAY_TONE.sun
    : weekday === '토' ? WEEKDAY_TONE.sat
    : isToday ? WEEKDAY_TONE.today
    : WEEKDAY_TONE.base;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn('text-[10px] font-mono uppercase tracking-wide leading-none', wdToneClass)}>
        {weekday}
      </span>
      <span className={cn(
        'text-[12px] font-mono tabular-nums leading-none',
        isToday ? 'text-blue-500 font-bold' : 'text-foreground/65',
      )}>
        {day}
      </span>
      <svg
        width={28} height={28}
        viewBox="0 0 28 28"
        className={cn('mt-0.5', isPast && !isToday && ratio === 0 && 'opacity-50')}
        aria-hidden
      >
        {/* 배경 원 */}
        <circle
          cx={14} cy={14} r={r}
          fill="none"
          stroke="hsl(var(--hairline))"
          strokeWidth={2.5}
        />
        {/* 진행 원 */}
        {scheduled > 0 && (
          <circle
            cx={14} cy={14} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 14 14)"
            style={{ transition: 'stroke-dashoffset 200ms ease' }}
          />
        )}
      </svg>
    </div>
  );
};

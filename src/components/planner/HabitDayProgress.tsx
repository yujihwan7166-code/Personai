/**
 * 7일 헤더의 진행률 도넛 — 그날의 (완료된 스케줄 habit) / (스케줄 habit) 비율.
 *
 * SVG circle stroke-dasharray 트릭. 30×30px 원 + 위 요일 + 아래 날짜.
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
  sun: 'text-rose-500/80',
  sat: 'text-blue-500/80',
  base: 'text-foreground/65',
  today: 'text-primary',
} as const;

export const HabitDayProgress = ({
  weekday, day, completed, scheduled, isToday, isPast,
}: HabitDayProgressProps) => {
  const ratio = scheduled === 0 ? 0 : Math.min(1, completed / scheduled);
  const r = 11.5;              // 원 반지름
  const c = 2 * Math.PI * r;   // 둘레
  const dashOffset = c * (1 - ratio);

  // 색조: 오늘은 주말 색과 헷갈리지 않게 보라 포인트로, 완료/진행은 진행 상태 색으로 표시한다.
  const ringColor = isToday
    ? 'hsl(var(--primary))'
    : ratio === 1
      ? 'hsl(160 60% 45%)'
      : ratio > 0
        ? 'hsl(220 70% 55%)'
        : 'hsl(220 10% 60% / 0.25)';

  const wdToneClass =
    isToday ? WEEKDAY_TONE.today
    : weekday === '일' ? WEEKDAY_TONE.sun
    : weekday === '토' ? WEEKDAY_TONE.sat
    : WEEKDAY_TONE.base;

  return (
    <div className="flex flex-col items-center gap-[3px]">
      <span className={cn('text-[10.5px] uppercase tracking-[0.04em] leading-none font-semibold', wdToneClass)}>
        {weekday}
      </span>
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={30} height={30}
          viewBox="0 0 30 30"
          className={cn(isPast && !isToday && ratio === 0 && 'opacity-70')}
          aria-hidden
        >
          {/* 배경 원 */}
          <circle
            cx={15} cy={15} r={r}
            fill="none"
            stroke="hsl(var(--foreground) / 0.18)"
            strokeWidth={2.2}
          />
          {/* 진행 원 */}
          {scheduled > 0 && (
            <circle
              cx={15} cy={15} r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 15 15)"
              style={{ transition: 'stroke-dashoffset 200ms ease' }}
            />
          )}
        </svg>
        {/* 날짜 — 도넛 가운데 */}
        <span className={cn(
          'absolute inset-0 flex items-center justify-center text-[12.5px] tabular-nums leading-none',
          isToday ? 'text-primary font-bold' : 'text-foreground/82 font-medium',
        )}>
          {day}
        </span>
      </div>
    </div>
  );
};

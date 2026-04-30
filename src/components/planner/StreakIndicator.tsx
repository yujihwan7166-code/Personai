/**
 * Streak indicator — 반복 task 의 연속 완료 시각화.
 *
 * 점진 단계 (Habitica/Streaks 패턴):
 * - 0회:  표시 없음
 * - 1-2회: 작은 채워진 점 N개 (visible 시작)
 * - 3-6회: 🔥 N
 * - 7+회: 🔥 N · ★ (주 단위 milestone)
 *
 * 두 사이즈:
 * - compact (시간 블록 / 인박스 카드 inline): 9.5px
 * - full (모달 streak 카드): 11px
 */
import { cn } from '@/lib/utils';
import { streakDisplay } from '@/lib/planner/streak';

interface StreakIndicatorProps {
  current: number;
  compact?: boolean;
}

export const StreakIndicator = ({ current, compact = true }: StreakIndicatorProps) => {
  const display = streakDisplay(current);
  if (display.kind === 'none') return null;

  const textSize = compact ? 'text-[9.5px]' : 'text-[11px]';

  if (display.kind === 'dots') {
    return (
      <span
        className={cn('inline-flex items-center gap-0.5', compact ? 'h-3' : 'h-4')}
        aria-label={`${display.count}회 연속 완료`}
        title={`${display.count}회 연속`}
      >
        {Array.from({ length: display.count }, (_, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-emerald-500"
            aria-hidden
          />
        ))}
      </span>
    );
  }

  if (display.kind === 'fire') {
    return (
      <span
        className={cn('inline-flex items-center gap-0.5 tabular-nums font-semibold text-amber-600', textSize)}
        aria-label={`${display.count}회 연속 완료 (streak)`}
        title={`${display.count}회 연속`}
      >
        <span aria-hidden>🔥</span>
        <span>{display.count}</span>
      </span>
    );
  }

  // fire-star (7+)
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 tabular-nums font-semibold text-amber-600', textSize)}
      aria-label={`${display.count}회 연속 완료 (장기 streak)`}
      title={`${display.count}회 연속 — 주 단위 마일스톤`}
    >
      <span aria-hidden>🔥</span>
      <span>{display.count}</span>
      <span className="text-amber-500" aria-hidden>★</span>
    </span>
  );
};

/** 모달용 streak 카드 — 통계 풀세트 + bar. */
interface StreakCardProps {
  current: number;
  best: number;
  rate: number;
  missed: number;
  total: number;
}

export const StreakCard = ({ current, best, rate, missed, total }: StreakCardProps) => {
  const ratePct = Math.round(rate * 100);
  const doneCount = total - missed;

  // 0회 시 — 부드러운 onboarding 톤.
  if (total === 0) {
    return (
      <div className="rounded-md border border-[hsl(var(--hairline))] bg-accent/30 px-3 py-2.5 text-[12px] text-muted-foreground leading-snug">
        아직 시작 단계예요. 처음 한 번 체크하면 streak 이 시작돼요.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[hsl(var(--hairline))] bg-card px-3 py-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <StreakIndicator current={current} compact={false} />
        {best > current && best >= 3 && (
          <span className="text-[10.5px] text-muted-foreground tabular-nums">
            (역대 최장 {best}회)
          </span>
        )}
        <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground">
          {doneCount}/{total} · {ratePct}%
        </span>
      </div>
      {/* progress bar */}
      <div className="h-1 rounded-full bg-accent overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            ratePct >= 80 ? 'bg-emerald-500' :
            ratePct >= 50 ? 'bg-amber-500' :
            'bg-rose-400',
          )}
          style={{ width: `${ratePct}%` }}
          aria-hidden
        />
      </div>
      {missed > 0 && current === 0 && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          하루 쉬셨네요. 오늘 한 번이면 다시 시작할 수 있어요.
        </p>
      )}
    </div>
  );
};

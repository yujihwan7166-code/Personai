/**
 * 습관 list 상단 인사이트 바 — 오늘 진행 / 주 평균 / streak 위기.
 * 한 줄로 핵심 시그널만, 왼쪽부터 우선순위 순.
 */
import { Flame, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Habit, HabitCheckin } from '@/types/habit';
import {
  currentStreak, isScheduledOn, toDateKey,
} from '@/lib/planner/habitStats';

interface HabitInsightBarProps {
  habits: Habit[];
  allCheckins: HabitCheckin[];
}

export const HabitInsightBar = ({ habits, allCheckins }: HabitInsightBarProps) => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const checkinByKey = new Map<string, HabitCheckin>();
  for (const c of allCheckins) checkinByKey.set(`${c.habitId}|${c.date}`, c);

  // 오늘 진행
  let todayScheduled = 0;
  let todayDone = 0;
  for (const h of habits) {
    if (!isScheduledOn(h, todayKey)) continue;
    todayScheduled++;
    const ci = checkinByKey.get(`${h.id}|${todayKey}`);
    const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
    if (ci && (ci.count ?? 0) >= tpd) todayDone++;
  }

  // 주 평균 — 최근 7일 (오늘 포함) 완료/스케줄 비율
  let weekScheduled = 0;
  let weekDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dk = toDateKey(d);
    for (const h of habits) {
      if (!isScheduledOn(h, dk)) continue;
      weekScheduled++;
      const ci = checkinByKey.get(`${h.id}|${dk}`);
      const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
      if (ci && (ci.count ?? 0) >= tpd) weekDone++;
    }
  }
  const weekRate = weekScheduled === 0 ? 0 : weekDone / weekScheduled;

  // streak 위기 — 오늘 스케줄인데 미체크 + currentStreak >= 3 인 habit 개수
  const atRisk = habits.filter((h) => {
    if (!isScheduledOn(h, todayKey)) return false;
    const ci = checkinByKey.get(`${h.id}|${todayKey}`);
    const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
    if (ci && (ci.count ?? 0) >= tpd) return false;
    const cs = currentStreak(h, allCheckins.filter((c) => c.habitId === h.id));
    return cs >= 3;
  });

  if (habits.length === 0) return null;

  const todayPct = todayScheduled === 0 ? 0 : Math.round((todayDone / todayScheduled) * 100);
  const allDone = todayScheduled > 0 && todayDone === todayScheduled;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--hairline))] bg-card">
      {/* 오늘 */}
      <Stat
        Icon={Target}
        tone={allDone ? 'emerald' : todayDone > 0 ? 'blue' : 'gray'}
        label={allDone ? '오늘 완료!' : `오늘 ${todayDone}/${todayScheduled}`}
        sub={todayScheduled > 0 ? `${todayPct}%` : '예정 없음'}
      />

      {/* 주 평균 */}
      <Stat
        Icon={TrendingUp}
        tone={weekRate >= 0.7 ? 'emerald' : weekRate >= 0.4 ? 'amber' : 'gray'}
        label={`이번 주 ${Math.round(weekRate * 100)}%`}
        sub={`${weekDone}/${weekScheduled}회`}
      />

      {/* streak 위기 */}
      {atRisk.length > 0 && (
        <Stat
          Icon={AlertTriangle}
          tone="rose"
          label={`streak 위기 ${atRisk.length}`}
          sub={atRisk[0].title.length > 8 ? atRisk[0].title.slice(0, 8) + '…' : atRisk[0].title}
          tooltip={atRisk.map((h) => h.title).join(', ')}
        />
      )}

      {/* 최장 streak (오늘 갖고있는 사람) — 정보용 */}
      <div className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-mono tabular-nums text-foreground/55">
        <Flame className="h-3 w-3" />
        총 {habits.length}개 습관
      </div>
    </div>
  );
};

const TONE_BG = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  rose:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  gray:    'bg-foreground/5 text-foreground/65',
} as const;

const Stat = ({
  Icon, tone, label, sub, tooltip,
}: {
  Icon: typeof Target;
  tone: keyof typeof TONE_BG;
  label: string;
  sub: string;
  tooltip?: string;
}) => (
  <div
    title={tooltip}
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
      TONE_BG[tone],
    )}
  >
    <Icon className="h-3.5 w-3.5 shrink-0" />
    <div className="leading-tight">
      <div className="text-[12px] font-semibold">{label}</div>
      <div className="text-[10.5px] opacity-70 font-mono tabular-nums">{sub}</div>
    </div>
  </div>
);

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Inbox,
  ListChecks,
  Search,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { goalStore } from '@/services/planner/goalStore';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { computePlannerOverviewMetrics } from '@/lib/planner/overview';
import type { PlannerTask } from '@/types/planner';
import { PLANNER_EVENT_CHANGED, PLANNER_GOAL_CHANGED, PLANNER_TASK_CHANGED } from '@/types/planner';
import { cn } from '@/lib/utils';

interface PlannerOverviewBarProps {
  anchorIso: string;
  onOpenCommand: () => void;
  onOpenGoals: () => void;
  onFocusQuickAdd: () => void;
}

const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const startOfDay = (iso: string): Date => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatTime = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const usePlannerTasks = (): PlannerTask[] => {
  const [tasks, setTasks] = useState<PlannerTask[]>(() => taskStore.list());

  useEffect(() => {
    const refresh = () => setTasks(taskStore.list());
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  return tasks;
};

const usePlannerVersion = (): number => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, bump);
    window.addEventListener(PLANNER_EVENT_CHANGED, bump);
    window.addEventListener(PLANNER_GOAL_CHANGED, bump);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, bump);
      window.removeEventListener(PLANNER_EVENT_CHANGED, bump);
      window.removeEventListener(PLANNER_GOAL_CHANGED, bump);
    };
  }, []);

  return version;
};

export function PlannerOverviewBar({
  anchorIso,
  onOpenCommand,
  onOpenGoals,
  onFocusQuickAdd,
}: PlannerOverviewBarProps) {
  const dayStart = useMemo(() => startOfDay(anchorIso), [anchorIso]);
  const dayEnd = useMemo(() => new Date(dayStart.getTime() + 86_400_000), [dayStart]);
  const dayItems = usePlannerRange(dayStart.toISOString(), dayEnd.toISOString());
  const tasks = usePlannerTasks();
  const version = usePlannerVersion();

  const todayKey = localDayKey(new Date());
  const anchorKey = localDayKey(dayStart);

  const metrics = useMemo(
    () =>
      computePlannerOverviewMetrics({
        anchorKey,
        todayKey,
        dayItems,
        tasks,
        goals: goalStore.listActive(),
        milestones: goalStore.listMilestones(),
      }),
    [anchorKey, dayItems, tasks, todayKey, version],
  );

  const status = useMemo(() => {
    if (metrics.overdue > 0) {
      return {
        tone: 'warning' as const,
        label: '정리 필요',
        detail: `밀린 항목 ${metrics.overdue}개를 먼저 줄이세요.`,
      };
    }
    if (metrics.goalAtRisk > 0) {
      return {
        tone: 'attention' as const,
        label: '목표 연결 필요',
        detail: `다음 행동이 없는 목표 ${metrics.goalAtRisk}개가 있습니다.`,
      };
    }
    if (metrics.focusCount === 0 && metrics.inbox === 0) {
      return {
        tone: 'quiet' as const,
        label: '깨끗한 하루',
        detail: '추가할 일이 있으면 바로 입력하세요.',
      };
    }
    return {
      tone: 'good' as const,
      label: '진행 가능',
      detail: `${metrics.focusCount}개 집중 항목과 ${metrics.inbox}개 대기 항목이 있습니다.`,
    };
  }, [metrics]);

  const cells: Array<{
    label: string;
    value: string | number;
    detail: string;
    Icon: LucideIcon;
    onClick: () => void;
    accent: boolean;
    warning?: boolean;
  }> = [
    {
      label: '집중 항목',
      value: metrics.focusCount,
      detail: metrics.eventCount > 0
        ? `시간배정 ${metrics.scheduledTaskCount} · 일정 ${metrics.eventCount}`
        : metrics.plannedTaskCount > 0 ? `할 일 ${metrics.plannedTaskCount}` : '계획 없음',
      Icon: ListChecks,
      onClick: onFocusQuickAdd,
      accent: metrics.focusCount > 0,
    },
    {
      label: '대기함',
      value: metrics.inbox,
      detail: '빠른 정리',
      Icon: Inbox,
      onClick: onFocusQuickAdd,
      accent: metrics.inbox > 0,
    },
    {
      label: '밀린 항목',
      value: metrics.overdue,
      detail: metrics.overdue > 0 ? '정리 필요' : '안정적',
      Icon: AlertTriangle,
      onClick: onOpenCommand,
      accent: metrics.overdue > 0,
      warning: metrics.overdue > 0,
    },
    {
      label: '목표 진척',
      value: `${metrics.averageGoalProgress}%`,
      detail: metrics.goalAtRisk > 0 ? `위험 ${metrics.goalAtRisk}` : `${metrics.activeGoalCount}개 진행`,
      Icon: Target,
      onClick: onOpenGoals,
      accent: metrics.activeGoalCount > 0,
      warning: metrics.goalAtRisk > 0,
    },
  ];

  return (
    <section
      aria-label="플래너 상태 요약"
    className="mb-4 grid grid-cols-1 gap-2 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)_minmax(240px,0.9fr)]"
    >
      <div
        className={cn(
          'rounded-lg border hairline bg-card px-3.5 py-3 shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]',
          status.tone === 'warning' && 'border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/20',
          status.tone === 'attention' && 'border-primary/25 bg-primary/5',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
              (status.tone === 'good' || status.tone === 'quiet') && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
              status.tone === 'warning' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
              status.tone === 'attention' && 'bg-primary/10 text-primary',
            )}
          >
            {status.tone === 'good' || status.tone === 'quiet' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              Plan health
            </div>
            <div className="mt-1 text-[15px] font-semibold text-foreground">{status.label}</div>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
              {status.detail}
            </p>
          </div>
        </div>
      </div>

      <div className="planner-overview-metrics grid gap-2">
        {cells.map(({ label, value, detail, Icon, onClick, accent, warning }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cn(
              'group flex min-h-[72px] items-center gap-3 rounded-lg border hairline bg-card px-3 py-2.5 text-left shadow-[0_1px_2px_hsl(30_15%_8%/0.04)] transition-colors',
              'hover:border-foreground/25 hover:bg-accent/50',
              accent && 'border-foreground/20',
              warning && 'border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/20',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors',
                accent && 'bg-primary/10 text-primary',
                warning && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="text-[20px] sm:text-[22px] font-semibold leading-none tabular-nums text-foreground">{value}</span>
                <span className="truncate text-[12px] text-muted-foreground">{detail}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="flex min-h-[68px] items-center gap-3 rounded-lg border hairline bg-card px-3 py-2.5 text-left shadow-[0_1px_2px_hsl(30_15%_8%/0.04)] transition-colors hover:border-foreground/25 hover:bg-accent/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {metrics.next ? <CalendarClock className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {metrics.next ? '다음 일정' : 'Command'}
          </span>
          {metrics.next ? (
            <span className="mt-1 block truncate text-[13px] font-medium text-foreground">
              <span className="mr-2 font-mono tabular-nums text-muted-foreground">
                {formatTime(metrics.next.data.startAt)}
              </span>
              {metrics.next.data.title}
            </span>
          ) : (
            <span className="mt-1 block truncate text-[13px] font-medium text-foreground">
              검색 또는 빠른 이동
            </span>
          )}
          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
            클릭해서 명령 팔레트 열기
          </span>
        </span>
      </button>
    </section>
  );
}

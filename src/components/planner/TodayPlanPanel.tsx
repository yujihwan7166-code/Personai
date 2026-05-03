import { useEffect, useMemo, useState } from 'react';
import { Clock3, Target } from 'lucide-react';
import { PlannerSection } from './PlannerSection';
import { WeekStrip } from './WeekStrip';
import { usePlannerRange } from '@/hooks/planner/usePlannerRange';
import { taskStore } from '@/services/planner/taskStore';
import { goalStore } from '@/services/planner/goalStore';
import { computeAllGoalProgress } from '@/lib/planner/goalProgress';
import type { PlannerGoal, PlannerTask } from '@/types/planner';
import { GOAL_COLORS, PLANNER_GOAL_CHANGED, PLANNER_TASK_CHANGED } from '@/types/planner';

interface TodayPlanPanelProps {
  anchorIso: string;
  onDayClick?: (dayIso: string) => void;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

const startOfDay = (iso: string) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatTime = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const useOpenTasks = () => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const refresh = () => {
      setTasks(taskStore.list().filter((task) => !task.done && !task.canceled && !task.someday));
    };

    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  return tasks;
};

const useGoals = () => {
  const [goals, setGoals] = useState<PlannerGoal[]>([]);

  useEffect(() => {
    const refresh = () => setGoals(goalStore.listActive());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_GOAL_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_GOAL_CHANGED, refresh);
  }, []);

  return goals;
};

export const TodayPlanPanel = ({ anchorIso, onDayClick, onTaskClick }: TodayPlanPanelProps) => {
  const dayStart = useMemo(() => startOfDay(anchorIso), [anchorIso]);
  const dayEnd = useMemo(() => new Date(dayStart.getTime() + 86_400_000), [dayStart]);
  const items = usePlannerRange(dayStart.toISOString(), dayEnd.toISOString());
  const openTasks = useOpenTasks();
  const goals = useGoals();

  const scheduledTasks = useMemo(
    () => items.filter((item) => item.kind === 'task').map((item) => item.data as PlannerTask),
    [items],
  );

  const nextItem = useMemo(
    () =>
      [...items]
        .filter((item) => item.data.startAt && new Date(item.data.startAt).getTime() >= Date.now())
        .sort((a, b) => a.data.startAt.localeCompare(b.data.startAt))[0],
    [items],
  );

  const goalFocus = useMemo(() => {
    const relevantTasks = openTasks.filter(
      (task) => task.goalId && (!task.startAt || scheduledTasks.some((scheduled) => scheduled.id === task.id)),
    );
    const progress = computeAllGoalProgress(goals, relevantTasks, goalStore.listMilestones());
    return progress
      .filter((item) => item.openTasks > 0 || item.scheduledTasks > 0)
      .sort((a, b) => b.scheduledTasks - a.scheduledTasks || b.openTasks - a.openTasks)
      .slice(0, 4);
  }, [goals, openTasks, scheduledTasks]);

  return (
    <aside className="h-full min-h-0 flex flex-col gap-4">
      <WeekStrip anchorIso={anchorIso} onDayClick={onDayClick} />

      <PlannerSection label="다음 일정" count={nextItem ? formatTime(nextItem.data.startAt) : undefined} className="shrink-0">
        {nextItem ? (
          <button
            type="button"
            onClick={() => {
              if (nextItem.kind === 'task') onTaskClick?.({ id: nextItem.data.id, title: nextItem.data.title });
            }}
            className="w-full rounded-md border border-[hsl(var(--hairline))] bg-background/60 px-3 py-2.5 text-left hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">{formatTime(nextItem.data.startAt)}</span>
            </div>
            <p className="mt-1 truncate text-[13px] font-medium text-foreground">{nextItem.data.title}</p>
          </button>
        ) : (
          <div className="rounded-md border border-dashed border-[hsl(var(--hairline))] px-3 py-3 text-[12.5px] text-muted-foreground">
            남은 예정 항목 없음
          </div>
        )}
      </PlannerSection>

      {goalFocus.length > 0 && (
        <PlannerSection label="오늘 목표" count={goalFocus.length} className="min-h-0">
          <div className="space-y-1.5">
            {goalFocus.map((item) => {
              const color = GOAL_COLORS[item.goal.color];
              return (
                <div
                  key={item.goal.id}
                  className="rounded-md border border-[hsl(var(--hairline))] bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: color.stripe }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
                      {item.goal.title}
                    </span>
                    <span className="text-[10.5px] tabular-nums text-muted-foreground">{item.percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.percent}%`, backgroundColor: color.stripe }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      남은 작업 {item.openTasks}
                    </span>
                    <span>오늘 배치 {item.scheduledTasks}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </PlannerSection>
      )}
    </aside>
  );
};

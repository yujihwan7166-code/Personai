import { computeAllGoalProgress } from '@/lib/planner/goalProgress';
import type { PlannerGoal, PlannerMilestone, PlannerTask, PlannerTimelineItem } from '@/types/planner';

export interface PlannerOverviewMetrics {
  eventCount: number;
  scheduledTaskCount: number;
  plannedTaskCount: number;
  focusCount: number;
  inbox: number;
  overdue: number;
  next?: PlannerTimelineItem;
  activeGoalCount: number;
  goalAtRisk: number;
  averageGoalProgress: number;
}

interface ComputePlannerOverviewMetricsInput {
  anchorKey: string;
  todayKey: string;
  dayItems: PlannerTimelineItem[];
  tasks: PlannerTask[];
  goals: PlannerGoal[];
  milestones: PlannerMilestone[];
  now?: Date;
}

const isOpenTask = (task: PlannerTask): boolean =>
  !task.done && !task.canceled && task.status !== 'done' && task.status !== 'canceled' && !task.someday;

const startTime = (item: PlannerTimelineItem): string | undefined => item.data.startAt;

export const computePlannerOverviewMetrics = ({
  anchorKey,
  todayKey,
  dayItems,
  tasks,
  goals,
  milestones,
  now = new Date(),
}: ComputePlannerOverviewMetricsInput): PlannerOverviewMetrics => {
  const openTasks = tasks.filter(isOpenTask);
  const eventCount = dayItems.filter((item) => item.kind === 'event').length;
  const scheduledTaskCount = dayItems.filter(
    (item) => item.kind === 'task' && isOpenTask(item.data),
  ).length;
  const plannedTaskCount = openTasks.filter((task) => task.plannedFor === anchorKey && !task.startAt).length;
  const inbox = openTasks.filter(
    (task) => !task.startAt && !task.plannedFor && !task.listId && !task.goalId,
  ).length;
  const overdue = openTasks.filter((task) => {
    if (task.startAt) return new Date(task.startAt).getTime() < now.getTime();
    return !!task.plannedFor && task.plannedFor < todayKey;
  }).length;
  const next = [...dayItems]
    .filter((item) => {
      const start = startTime(item);
      return !!start && new Date(start).getTime() >= now.getTime();
    })
    .sort((a, b) => (startTime(a) ?? '').localeCompare(startTime(b) ?? ''))[0];

  const goalProgress = computeAllGoalProgress(goals, tasks, milestones);
  const activeGoalProgress = goalProgress.filter((item) => item.goal.status !== 'done');
  const goalAtRisk = activeGoalProgress.filter((item) => item.openTasks === 0 && item.percent < 100).length;
  const averageGoalProgress = activeGoalProgress.length
    ? Math.round(activeGoalProgress.reduce((sum, item) => sum + item.percent, 0) / activeGoalProgress.length)
    : 0;

  return {
    eventCount,
    scheduledTaskCount,
    plannedTaskCount,
    focusCount: scheduledTaskCount + plannedTaskCount,
    inbox,
    overdue,
    next,
    activeGoalCount: activeGoalProgress.length,
    goalAtRisk,
    averageGoalProgress,
  };
};

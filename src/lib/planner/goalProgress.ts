import type { PlannerGoal, PlannerMilestone, PlannerTask } from '@/types/planner';

export interface GoalProgress {
  goal: PlannerGoal;
  milestones: PlannerMilestone[];
  tasks: PlannerTask[];
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  scheduledTasks: number;
  milestoneTotal: number;
  milestoneDone: number;
  percent: number;
  nextTask?: PlannerTask;
}

const isDone = (task: PlannerTask) => task.done || task.status === 'done';
const isOpen = (task: PlannerTask) => !task.done && !task.canceled && task.status !== 'canceled';

export const computeGoalProgress = (
  goal: PlannerGoal,
  tasks: PlannerTask[],
  milestones: PlannerMilestone[],
): GoalProgress => {
  const goalTasks = tasks.filter((task) => task.goalId === goal.id);
  const openTasks = goalTasks.filter(isOpen);
  const doneTasks = goalTasks.filter(isDone);
  const milestoneDone = milestones.filter((milestone) => milestone.done).length;
  const totalUnits = goalTasks.length + milestones.length;
  const doneUnits = doneTasks.length + milestoneDone;
  const nextTask = [...openTasks].sort((a, b) => {
    if (a.startAt && b.startAt) return a.startAt.localeCompare(b.startAt);
    if (a.startAt && !b.startAt) return -1;
    if (!a.startAt && b.startAt) return 1;
    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    return b.createdAt.localeCompare(a.createdAt);
  })[0];

  return {
    goal,
    milestones,
    tasks: goalTasks,
    totalTasks: goalTasks.length,
    doneTasks: doneTasks.length,
    openTasks: openTasks.length,
    scheduledTasks: goalTasks.filter((task) => Boolean(task.startAt)).length,
    milestoneTotal: milestones.length,
    milestoneDone,
    percent: totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0,
    nextTask,
  };
};

export const computeAllGoalProgress = (
  goals: PlannerGoal[],
  tasks: PlannerTask[],
  milestones: PlannerMilestone[],
): GoalProgress[] =>
  goals.map((goal) =>
    computeGoalProgress(
      goal,
      tasks,
      milestones.filter((milestone) => milestone.goalId === goal.id),
    ),
  );

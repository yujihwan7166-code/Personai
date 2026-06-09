import type { PlannerTask } from '@/types/planner';

export const todoOrderValue = (task: Pick<PlannerTask, 'todoOrder'>): number =>
  typeof task.todoOrder === 'number' && Number.isFinite(task.todoOrder)
    ? task.todoOrder
    : Number.POSITIVE_INFINITY;

export const compareTodoTasks = (a: PlannerTask, b: PlannerTask): number => {
  const byOrder = todoOrderValue(a) - todoOrderValue(b);
  if (byOrder !== 0) return byOrder;
  const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
  if (priorityDelta !== 0) return priorityDelta;
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  return b.createdAt.localeCompare(a.createdAt);
};

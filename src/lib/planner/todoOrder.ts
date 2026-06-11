import type { PlannerTask } from '@/types/planner';

export const todoOrderValue = (task: Pick<PlannerTask, 'todoOrder'>): number =>
  typeof task.todoOrder === 'number' && Number.isFinite(task.todoOrder)
    ? task.todoOrder
    : Number.POSITIVE_INFINITY;

export const compareTodoTasks = (a: PlannerTask, b: PlannerTask): number => {
  const aOrder = todoOrderValue(a);
  const bOrder = todoOrderValue(b);
  const aHasOrder = Number.isFinite(aOrder);
  const bHasOrder = Number.isFinite(bOrder);
  if (aHasOrder && bHasOrder && aOrder !== bOrder) return aOrder - bOrder;
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
  if (priorityDelta !== 0) return priorityDelta;
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  return b.createdAt.localeCompare(a.createdAt);
};

export const nextTodoOrderForDay = (
  tasks: PlannerTask[],
  dayKey: string,
  excludeTaskId?: string,
): number => {
  const orders = tasks
    .filter((task) =>
      task.id !== excludeTaskId
      && !task.startAt
      && task.plannedFor === dayKey
      && typeof task.todoOrder === 'number'
      && Number.isFinite(task.todoOrder),
    )
    .map((task) => task.todoOrder as number);

  return orders.length > 0 ? Math.max(...orders) + 10 : 10;
};

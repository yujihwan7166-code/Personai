import type { PlannerDragData } from '@/components/planner/dnd/plannerDndTypes';
import type { PlannerEvent, PlannerTask } from '@/types/planner';

export const weekDragDataForTask = (task: PlannerTask): PlannerDragData =>
  task.startAt
    ? { kind: 'scheduled-task', task }
    : { kind: 'planned-task', task };

export const weekDragDataForEvent = (event: PlannerEvent): PlannerDragData => ({
  kind: 'scheduled-event',
  event,
});

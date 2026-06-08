import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PlannerEvent, PlannerTask } from '@/types/planner';
import type { PlannerDragData } from './plannerDndTypes';

interface DraggableWeekItemProps {
  id: string;
  data: PlannerDragData;
  children: ReactNode;
}

export const DraggableWeekItem = ({ id, data, children }: DraggableWeekItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'relative cursor-grabbing')}
    >
      {children}
    </div>
  );
};

export const weekDragDataForTask = (task: PlannerTask): PlannerDragData =>
  task.startAt
    ? { kind: 'scheduled-task', task }
    : { kind: 'planned-task', task };

export const weekDragDataForEvent = (event: PlannerEvent): PlannerDragData => ({
  kind: 'scheduled-event',
  event,
});

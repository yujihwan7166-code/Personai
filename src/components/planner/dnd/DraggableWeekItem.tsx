import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
    opacity: isDragging ? 0.84 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-draggable-id={id}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'relative cursor-grabbing rounded-lg shadow-[0_12px_28px_-20px_hsl(220_18%_10%/0.55)] ring-2 ring-primary/24',
      )}
    >
      {children}
    </div>
  );
};

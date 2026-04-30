/**
 * 인박스 카드 드래그 wrapper.
 *
 * 카드 클릭(편집 모달) 과 드래그(시간표로 이동)을 모두 지원.
 * - PointerSensor activationConstraint(distance: 5px) 가 충돌 방지.
 * - 드래그 중: opacity 50% + scale.
 */
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '@/types/planner';
import type { PlannerDragData } from './plannerDndTypes';

interface DraggableInboxCardProps {
  task: PlannerTask;
  children: React.ReactNode;
}

export const DraggableInboxCard = ({ task, children }: DraggableInboxCardProps) => {
  const data: PlannerDragData = { kind: 'inbox-task', task };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `inbox-${task.id}`,
    data,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'cursor-grabbing')}
    >
      {children}
    </div>
  );
};

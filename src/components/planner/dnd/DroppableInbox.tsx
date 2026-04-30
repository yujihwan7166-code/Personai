/**
 * 인박스 컨테이너 droppable — 시간표에서 카드 드래그해서 떨어뜨리면 unschedule.
 */
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PlannerDropData } from './plannerDndTypes';

interface DroppableInboxProps {
  children: React.ReactNode;
  className?: string;
}

export const DroppableInbox = ({ children, className }: DroppableInboxProps) => {
  const data: PlannerDropData = { kind: 'inbox' };
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox-zone', data });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors h-full',
        isOver && 'bg-primary/5 ring-2 ring-primary/30 ring-inset rounded-lg',
        className,
      )}
    >
      {children}
    </div>
  );
};

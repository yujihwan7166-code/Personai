/**
 * 주(Week) 뷰 컬럼 droppable — 컬럼에 드롭 시 시:분 유지 + 날짜만 교체.
 */
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PlannerDropData } from './plannerDndTypes';

interface DroppableDayColumnProps {
  dayIso: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableDayColumn = ({ dayIso, children, className }: DroppableDayColumnProps) => {
  const data: PlannerDropData = { kind: 'day-column', dayIso };
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIso}`,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/30 ring-inset',
        className,
      )}
    >
      {children}
    </div>
  );
};

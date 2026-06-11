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
        'relative transition-colors',
        isOver && 'bg-foreground/[0.006]',
        className,
      )}
    >
      {isOver && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 z-10 rounded-lg border border-primary/18 bg-primary/[0.018] shadow-[inset_0_0_0_1px_hsl(var(--background)/0.55)]"
        />
      )}
      {children}
    </div>
  );
};

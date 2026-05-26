/**
 * 30분 시간 슬롯 droppable.
 *
 * TodayTimeline 안 빈 슬롯 위에 깔림.
 * - over 시 시각 피드백 (Notion 스타일 ring + bg).
 */
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PlannerDropData } from './plannerDndTypes';

interface DroppableTimeSlotProps {
  /** 슬롯 시작 ISO. */
  startIso: string;
  /** 슬롯 클릭 핸들러 (드래그가 아닌 포인터 클릭일 때). */
  onClick?: () => void;
  /** 개발/테스트 보조: 슬롯 시간 텍스트. */
  ariaLabel?: string;
  className?: string;
}

export const DroppableTimeSlot = ({ startIso, onClick, ariaLabel, className }: DroppableTimeSlotProps) => {
  const data: PlannerDropData = { kind: 'time-slot', startIso };
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${startIso}`,
    data,
  });

  // 빈 슬롯 48개를 모두 탭 가능한 버튼으로 만들면 키보드 탐색이 과해진다.
  // 키보드 일정 추가는 "일정" 카드의 + 버튼이 담당하고, 이 표면은 포인터/드롭 전용으로 둔다.
  return (
    <div
      ref={setNodeRef}
      data-time-slot={ariaLabel}
      onClick={onClick}
      className={cn(
        'group relative transition-colors cursor-pointer',
        isOver
          ? 'bg-primary/10 ring-1 ring-primary/40 ring-inset'
          : 'hover:bg-accent/50',
        className,
      )}
    >
      {/* hover 시 좌측에 작은 + — "여기 누르면 추가" affordance */}
      <span
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-transparent group-hover:text-foreground/45 transition-colors"
        aria-hidden
      >
        +
      </span>
    </div>
  );
};

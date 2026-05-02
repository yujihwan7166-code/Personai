/**
 * 시간 블록 드래그 wrapper — TodayTimeline 의 절대좌표 블록을 감쌈.
 *
 * - 본체 드래그 = 시간 이동 (다른 슬롯 / 다른 day column / 인박스 으로)
 * - 하단 4px 핸들 = 길이 조정 (resize) — 별도 useDraggable 로 분리
 *
 * 가상 인스턴스 id (`master@iso`) 도 그대로 받음. onDragEnd 에서 detach 분기.
 */
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { PlannerEvent, PlannerTask } from '@/types/planner';
import type { PlannerDragData } from './plannerDndTypes';

interface DraggableBlockProps {
  item:
    | { kind: 'task'; data: PlannerTask }
    | { kind: 'event'; data: PlannerEvent };
  /** 절대좌표 + 크기. TodayTimeline 가 이미 계산해서 넘김. */
  style: React.CSSProperties;
  children: React.ReactNode;
  /** resize 핸들 활성화 여부 — 일정/할일 모두 지원. */
  enableResize?: boolean;
  /** 길이 핸들 드래그 중에 화면에서 보이는 임시 height 변경값 (px). */
  resizeDeltaPx?: number;
}

export const DraggableBlock = ({ item, style, children, enableResize = true, resizeDeltaPx }: DraggableBlockProps) => {
  const dragData: PlannerDragData =
    item.kind === 'task'
      ? { kind: 'scheduled-task', task: item.data }
      : { kind: 'scheduled-event', event: item.data };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${item.data.id}`,
    data: dragData,
  });

  const resizeData: PlannerDragData =
    item.kind === 'task'
      ? { kind: 'resize-task', task: item.data }
      : { kind: 'resize-event', event: item.data };
  const resize = useDraggable({ id: `resize-${item.data.id}`, data: resizeData });

  const composedStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    height:
      typeof style.height === 'number' && resize.isDragging && resizeDeltaPx
        ? Math.max(20, (style.height as number) + resizeDeltaPx)
        : style.height,
    zIndex: isDragging || resize.isDragging ? 30 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={composedStyle}
      {...listeners}
      {...attributes}
      className={cn(
        'group touch-none absolute left-1 right-2 pointer-events-auto cursor-grab',
        isDragging && 'cursor-grabbing shadow-lg',
      )}
    >
      {children}
      {/* 길이 조정 핸들 — 하단 6px. 블록 hover 시 살짝 보이고, 핸들 hover 시 진하게. */}
      {enableResize && (
        <div
          ref={resize.setNodeRef}
          {...resize.listeners}
          {...resize.attributes}
          aria-label="길이 조정"
          className={cn(
            'absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize rounded-b transition-all',
            'bg-transparent group-hover:bg-foreground/15 hover:!bg-foreground/45',
            resize.isDragging && '!bg-primary/55',
          )}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

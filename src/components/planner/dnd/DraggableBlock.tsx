/**
 * 시간 블록 wrapper — TodayTimeline 의 절대좌표 블록을 감쌈.
 *
 * - 본체 드래그 = 시간 이동 (다른 슬롯 / 다른 day column / 인박스 으로) — dnd-kit 사용
 * - 하단 6px 핸들 = 길이 조정 (resize) — **네이티브 pointer events** 사용
 *   (Google Calendar / Apple Calendar 표준: 블록 자체가 실시간으로 늘어남)
 *
 * 가상 인스턴스 id (`master@iso`) 도 그대로 받음. 부모 onResize/onDragEnd 에서 detach 분기.
 */
import { useEffect, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { PlannerEvent, PlannerTask } from '@/types/planner';
import type { PlannerDragData } from './plannerDndTypes';

const HOUR_PX = 56;
const SNAP_MIN = 15;
const MIN_DURATION_MIN = 15;
const SNAP_PX = (HOUR_PX / 60) * SNAP_MIN; // 14px

interface DraggableBlockProps {
  item:
    | { kind: 'task'; data: PlannerTask }
    | { kind: 'event'; data: PlannerEvent };
  /** 절대좌표 + 크기. TodayTimeline 가 이미 계산해서 넘김. */
  style: React.CSSProperties;
  children: React.ReactNode;
  /** resize 핸들 활성화 여부 — 일정/할일 모두 지원. */
  enableResize?: boolean;
  /** Resize 완료 시 호출 — 부모가 store 업데이트. */
  onResize?: (newEndIso: string) => void;
}

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

const formatDur = (mins: number): string => {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

export const DraggableBlock = ({
  item, style, children, enableResize = true, onResize,
}: DraggableBlockProps) => {
  const dragData: PlannerDragData =
    item.kind === 'task'
      ? { kind: 'scheduled-task', task: item.data }
      : { kind: 'scheduled-event', event: item.data };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${item.data.id}`,
    data: dragData,
  });

  // ── 네이티브 pointer-event 기반 resize ──
  const [resizeDeltaPx, setResizeDeltaPx] = useState<number | null>(null);
  // 정리: 컴포넌트 언마운트 시 listener 강제 해제 + cursor 복구.
  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableResize || !item.data.startAt || !item.data.endAt) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const baseHeight = typeof style.height === 'number' ? (style.height as number) : 0;

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      const raw = ev.clientY - startY;
      const snapped = Math.round(raw / SNAP_PX) * SNAP_PX;
      // 최소 길이 enforce.
      const minHeight = (MIN_DURATION_MIN / 60) * HOUR_PX;
      const proposedHeight = baseHeight + snapped;
      const clampedDelta = proposedHeight < minHeight ? minHeight - baseHeight : snapped;
      setResizeDeltaPx(clampedDelta);
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const raw = ev.clientY - startY;
      const snapped = Math.round(raw / SNAP_PX) * SNAP_PX;
      const deltaMin = (snapped / HOUR_PX) * 60;

      const oldEnd = new Date(item.data.endAt!);
      const start = new Date(item.data.startAt!);
      const newEnd = new Date(oldEnd.getTime() + deltaMin * 60_000);
      const minEnd = new Date(start.getTime() + MIN_DURATION_MIN * 60_000);
      const finalEnd = newEnd.getTime() < minEnd.getTime() ? minEnd : newEnd;

      // delta 0 면 호출 X (실수 클릭).
      if (deltaMin !== 0) {
        onResize?.(finalEnd.toISOString());
      }
      setResizeDeltaPx(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const isResizing = resizeDeltaPx !== null;
  const baseHeight = typeof style.height === 'number' ? (style.height as number) : 0;
  const liveHeight = isResizing ? Math.max(20, baseHeight + (resizeDeltaPx ?? 0)) : style.height;

  // 라이브 종료 시각 — resize 중에만 inline chip 으로 표시.
  const liveEndLabel = (() => {
    if (!isResizing || !item.data.startAt || !item.data.endAt) return null;
    const deltaMin = ((resizeDeltaPx ?? 0) / HOUR_PX) * 60;
    const oldEnd = new Date(item.data.endAt);
    const start = new Date(item.data.startAt);
    const newEnd = new Date(oldEnd.getTime() + deltaMin * 60_000);
    const minEnd = new Date(start.getTime() + MIN_DURATION_MIN * 60_000);
    const finalEnd = newEnd.getTime() < minEnd.getTime() ? minEnd : newEnd;
    const totalMin = Math.round((finalEnd.getTime() - start.getTime()) / 60_000);
    return { time: formatHm(finalEnd.toISOString()), dur: formatDur(totalMin) };
  })();

  // 라이브 이동 라벨 — 본체 드래그 중 새 시작/종료 시각 (Google Calendar 패턴).
  const liveMoveLabel = (() => {
    if (!isDragging || !transform || !item.data.startAt || !item.data.endAt) return null;
    const oldStart = new Date(item.data.startAt);
    const oldEnd = new Date(item.data.endAt);
    const deltaMin = Math.round((transform.y / HOUR_PX) * 60 / 15) * 15;
    if (deltaMin === 0) return null;
    const newStart = new Date(oldStart.getTime() + deltaMin * 60_000);
    const newEnd = new Date(oldEnd.getTime() + deltaMin * 60_000);
    return `${formatHm(newStart.toISOString())} ~ ${formatHm(newEnd.toISOString())}`;
  })();

  const composedStyle: React.CSSProperties = {
    ...style,
    transform: isDragging ? CSS.Translate.toString(transform) : undefined,
    // 블록 자체가 따라오게 — opacity 0.5(반투명 ghost) → 0.92 (블록이 그대로 옮겨가는 느낌)
    opacity: isDragging ? 0.92 : 1,
    height: liveHeight,
    zIndex: isDragging || isResizing ? 30 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={composedStyle}
      {...listeners}
      {...attributes}
      data-block="true"
      className={cn(
        'group touch-none absolute left-1 right-2 pointer-events-auto cursor-grab',
        isDragging && 'cursor-grabbing shadow-lg',
        isResizing && 'shadow-lg ring-1 ring-foreground/30',
      )}
    >
      {children}

      {/* 라이브 종료시각·길이 inline chip — resize 중에만 노출 (블록 우측 하단) */}
      {liveEndLabel && (
        <div
          className="pointer-events-none absolute right-1.5 bottom-2 px-1.5 py-0.5 rounded bg-foreground text-background text-[10.5px] font-mono tabular-nums shadow-sm"
          aria-hidden
        >
          → {liveEndLabel.time}  ·  {liveEndLabel.dur}
        </div>
      )}

      {/* 라이브 이동 시각 chip — 본체 드래그 중 좌상단에 새 시간 (Google Calendar 패턴) */}
      {liveMoveLabel && (
        <div
          className="pointer-events-none absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded bg-foreground text-background text-[10.5px] font-mono tabular-nums shadow-sm"
          aria-hidden
        >
          {liveMoveLabel}
        </div>
      )}

      {/* 길이 조정 핸들 — 하단 6px. 블록 hover 시 살짝 보이고, 핸들 hover/drag 시 진하게. */}
      {enableResize && (
        <div
          aria-label="길이 조정"
          role="slider"
          onPointerDown={handleResizePointerDown}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize rounded-b transition-all',
            'bg-transparent group-hover:bg-foreground/15 hover:!bg-foreground/45',
            isResizing && '!bg-primary/55',
          )}
        />
      )}
    </div>
  );
};

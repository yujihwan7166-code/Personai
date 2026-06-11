/**
 * 플래너 드래그 드롭 — draggable / droppable 타입 정의.
 *
 * dnd-kit 의 `data` 필드로 흘려보내 onDragEnd 에서 분기.
 */
import type { PlannerEvent, PlannerTask } from '@/types/planner';
import type { PlannerLibraryItem } from '@/services/planner/libraryStore';

// ───── Draggable 종류 ─────
export type PlannerDragData =
  | { kind: 'inbox-task'; task: PlannerTask }
  | { kind: 'planned-task'; task: PlannerTask }
  | { kind: 'scheduled-task'; task: PlannerTask }
  | { kind: 'scheduled-event'; event: PlannerEvent }
  | { kind: 'library-template'; item: PlannerLibraryItem };
// resize-task / resize-event 는 제거 — DraggableBlock 안 네이티브 pointer event 가 처리.

// ───── Droppable 종류 ─────
export type PlannerDropData =
  | { kind: 'time-slot'; startIso: string }
  | { kind: 'day-column'; dayIso: string }
  | { kind: 'schedule-day'; dayIso: string; dayKey: string }
  | { kind: 'inbox' }
  | { kind: 'todo-list'; dayKey: string };

// 드래그 활성화 거리 (px) — 우발적 드래그 방지.
export const DRAG_ACTIVATION_DISTANCE = 5;

// 길이 드래그 시 최소 길이 (분).
export const MIN_BLOCK_MINUTES = 15;

/** 30분 단위로 스냅. */
export const snapToHalfHour = (date: Date): Date => {
  const minutes = date.getMinutes();
  const snapped = Math.round(minutes / 30) * 30;
  const result = new Date(date);
  result.setMinutes(snapped, 0, 0);
  return result;
};

/** 시간:분 만 dest 의 날짜에 적용. dest 의 다른 부분(연/월/일) 유지. */
export const transposeTimeToDate = (timeSrc: Date, dest: Date): Date => {
  const result = new Date(dest);
  result.setHours(timeSrc.getHours(), timeSrc.getMinutes(), 0, 0);
  return result;
};

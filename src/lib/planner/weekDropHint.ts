import type { PlannerDragData, PlannerDropData } from '@/components/planner/dnd/plannerDndTypes';

export const weekDropHintLabel = (
  data: PlannerDropData,
  dragData: PlannerDragData | undefined,
  blocked: boolean,
  fallback: string,
): string => {
  if (blocked) return '놓을 수 없음';
  if (data.kind === 'todo-list') {
    if (dragData?.kind === 'library-template') return '놓으면 할 일로 추가';
    if (dragData?.kind === 'scheduled-task') return '놓으면 시간 없이 할 일로';
    return '놓으면 이 날짜 할 일로';
  }
  if (data.kind === 'schedule-day') {
    if (dragData?.kind === 'inbox-task' || dragData?.kind === 'planned-task') return '놓으면 시간 선택';
    if (dragData?.kind === 'library-template') return '놓으면 일정으로 추가';
    return '놓으면 이 날짜 일정으로';
  }
  if (data.kind === 'day-column') return '놓으면 날짜만 이동';
  return fallback;
};

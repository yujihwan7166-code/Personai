/**
 * AI 액션을 실제 store 에 적용 — 사용자가 [확인] 버튼 누르면 호출.
 *
 * 반환: 생성된 항목 id (undo 시 remove 에 사용).
 * 실패 시 null 반환.
 */
import type { AIAction } from '@/types/plannerAI';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';

export const applyAIAction = (action: AIAction): string | null => {
  try {
    switch (action.type) {
      case 'add_event': {
        const created = eventStore.add({
          title: action.title.trim(),
          startAt: new Date(action.startAt).toISOString(),
          endAt: new Date(action.endAt).toISOString(),
          source: 'user',
        });
        return created.id;
      }
      case 'add_scheduled_task': {
        const created = taskStore.add({
          title: action.title.trim(),
          startAt: new Date(action.startAt).toISOString(),
          endAt: new Date(action.endAt).toISOString(),
          done: false,
          ...(action.priority ? { priority: action.priority } : {}),
        });
        return created.id;
      }
      case 'add_inbox_task': {
        const created = taskStore.add({
          title: action.title.trim(),
          done: false,
          ...(action.plannedFor ? { plannedFor: action.plannedFor } : {}),
          ...(action.priority ? { priority: action.priority } : {}),
        });
        return created.id;
      }
      default:
        return null;
    }
  } catch (err) {
    console.error('[applyAIAction] 실패:', err);
    return null;
  }
};

/** 적용 취소 — store 에서 제거. */
export const undoAIAction = (action: AIAction, appliedId: string): void => {
  try {
    if (action.type === 'add_event') {
      eventStore.remove(appliedId);
    } else {
      taskStore.remove(appliedId);
    }
  } catch (err) {
    console.error('[undoAIAction] 실패:', err);
  }
};

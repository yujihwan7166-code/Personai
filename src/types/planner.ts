/**
 * 통합 플래너 데이터 모델 — v1 (Event + Task 2종).
 *
 * 설계 원칙:
 * - 모든 시각은 ISO 8601 문자열로 직렬화 (LocalStorage 호환).
 * - source 필드로 외부 캘린더 연동 미래 대비 (v1 = 'user' 만 사용).
 * - goalId 필드는 미리 두되 v1 UI 노출 X (v3 목표 기능 도입 시 활용).
 */

export type EventSource = 'user' | 'gcal' | 'outlook';

/** 캘린더 일정 — 시작·끝 시간이 고정된 외부 약속 또는 시간 블록. */
export interface PlannerEvent {
  id: string;
  title: string;
  /** ISO 8601 시작 시각. 필수. */
  startAt: string;
  /** ISO 8601 종료 시각. 필수. */
  endAt: string;
  /** 시간 블록 색상 (HSL 또는 hex). 미지정 시 기본 색. */
  color?: string;
  source: EventSource;
  createdAt: string;
}

/** 할일 — 시간 미배정(인박스) 또는 시간 배정(시간표) 양쪽 가능. */
export interface PlannerTask {
  id: string;
  title: string;
  done: boolean;
  /** 시간 배정된 경우 ISO 8601. 없으면 인박스. */
  startAt?: string;
  /** 시간 배정된 경우 ISO 8601. 없으면 인박스. */
  endAt?: string;
  /** 연결된 목표 id (v3 활용, v1 미사용). */
  goalId?: string;
  createdAt: string;
}

/** 시간표 합쳐서 보여줄 때의 통합 항목 (Event + 시간 배정 Task). */
export type PlannerTimelineItem =
  | { kind: 'event'; data: PlannerEvent }
  | { kind: 'task'; data: PlannerTask };

/** Store 변경 broadcast 이벤트 이름. */
export const PLANNER_EVENT_CHANGED = 'planner:event:changed';
export const PLANNER_TASK_CHANGED = 'planner:task:changed';

/**
 * Task 도메인 규칙 — 할 일/일정 경계.
 *
 * 같은 PlannerTask 타입이 두 도메인을 표현한다:
 *   - 할 일 (인박스/계획): startAt 없음. priority 의미 있음.
 *   - 일정 (시간 배정):   startAt 있음. priority 무의미 (편집 UI 에도 없음).
 *
 * 사용자가 할 일 → 일정 으로 토글하면 priority 가 데이터에 잔존해 표시가
 * 새 도메인(일정)과 맞지 않게 깃발이 떠버린다. 표시·저장 두 길목을 이
 * 헬퍼 한 곳으로 좁혀 일관성 유지.
 */
import type { PlannerTask, Priority } from '@/types/planner';

/**
 * task 가 일정(시간 배정)인지 — startAt 유무로 판단.
 * 인스턴스/마스터 무관, 단순 쿼리.
 */
export const isScheduled = (t: Pick<PlannerTask, 'startAt'>): boolean =>
  Boolean(t.startAt);

/**
 * 표시용 priority — 일정이면 없음으로 처리.
 * 데이터에 priority 가 잔존해도 UI 에는 노출하지 않음.
 *
 * 일정 도메인에 우선순위 깃발이 새는 사이트 (TodayTimeline,
 * TodayScheduledList, WeekView block 등) 에서 이 헬퍼만 거치면 됨.
 */
export const displayedPriority = (t: Pick<PlannerTask, 'startAt' | 'priority'>): Priority | undefined =>
  isScheduled(t) ? undefined : t.priority;

/**
 * 저장 시 도메인 일관성 강제 — 일정으로 저장될 데이터에서 할 일 전용 필드 제거.
 *
 * - priority: 일정에서는 의미 없음 → undefined.
 * - plannedFor: startAt 가 있으면 의미 없음 → undefined.
 *
 * 반대 방향 (일정 → 할 일) 은 호출부가 직접 startAt/endAt 을 undefined 로
 * 비우고 plannedFor 를 채워주므로 별도 처리 불필요.
 */
export const sanitizeForDomain = <T extends Partial<PlannerTask>>(patch: T): T => {
  if (patch.startAt) {
    return { ...patch, priority: undefined, plannedFor: undefined };
  }
  return patch;
};

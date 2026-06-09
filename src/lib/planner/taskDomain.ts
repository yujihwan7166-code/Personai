/**
 * Task 도메인 규칙 — 할 일/일정 경계.
 *
 * 같은 PlannerTask 타입은 이제 "할 일"의 의미를 유지한 채 시간 배정도 가능하다.
 *
 * - plannedFor: 이 날 하기로 한 날짜
 * - startAt/endAt: 실제 시간 배정
 *
 * 즉, 시간 배정된 항목도 여전히 할 일일 수 있으므로 priority/plannedFor 를
 * 자동으로 지우지 않는다.
 */
import type { PlannerTask, Priority } from '@/types/planner';

/**
 * task 가 일정(시간 배정)인지 — startAt 유무로 판단.
 * 인스턴스/마스터 무관, 단순 쿼리.
 */
export const isScheduled = (t: Pick<PlannerTask, 'startAt'>): boolean =>
  Boolean(t.startAt);

/**
 * 표시용 priority. 시간 배정된 할 일도 여전히 할 일이므로 priority 를 보존한다.
 */
export const displayedPriority = (t: Pick<PlannerTask, 'startAt' | 'priority'>): Priority | undefined =>
  t.priority;

/**
 * 저장 시 도메인 정규화. 레거시 dueDate 는 버린다.
 * plannedFor/startAt/endAt 은 각각 "할 날짜"와 "시간 배정" 의미로 보존한다.
 */
export const sanitizeForDomain = <T extends Partial<PlannerTask>>(patch: T): T => {
  const { dueDate: _dueDate, ...rest } = patch as T & { dueDate?: unknown };
  void _dueDate;
  return rest as T;
};

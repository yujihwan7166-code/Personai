/**
 * 플래너 task 분류 헬퍼.
 *
 * 시간 필터(오늘/내일/이번주/이번달)는 헤더의 날짜 조절+뷰 토글로 표현하므로 별도 정의 X.
 * 사이드바 "대기함" 박스 멤버십 판정만 여기서 노출.
 */
import type { PlannerTask } from '@/types/planner';

const isActive = (t: PlannerTask): boolean => !t.done && !t.canceled && !t.someday;

/** 사이드바 "대기함" 멤버십 — 시간/계획/리스트/목표 어디에도 안 묶인 task. */
export const isWaiting = (t: PlannerTask): boolean =>
  isActive(t) && !t.startAt && !t.plannedFor && !t.listId && !t.goalId;

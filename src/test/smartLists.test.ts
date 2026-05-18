import { describe, it, expect } from 'vitest';
import { isWaiting } from '@/lib/planner/smartLists';
import type { PlannerTask } from '@/types/planner';

function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: 'x', title: 'x', done: false,
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

describe('isWaiting', () => {
  it('아무 배정 없는 active task → true', () => {
    expect(isWaiting(task())).toBe(true);
  });

  it('done → false', () => {
    expect(isWaiting(task({ done: true }))).toBe(false);
  });

  it('canceled → false', () => {
    expect(isWaiting(task({ canceled: true }))).toBe(false);
  });

  it('someday → false', () => {
    expect(isWaiting(task({ someday: true }))).toBe(false);
  });

  it('시간 배정 (startAt) → false', () => {
    expect(isWaiting(task({ startAt: '2026-05-04T09:00:00Z' }))).toBe(false);
  });

  it('plannedFor → false', () => {
    expect(isWaiting(task({ plannedFor: '2026-05-04' }))).toBe(false);
  });

  it('listId → false', () => {
    expect(isWaiting(task({ listId: 'list_1' }))).toBe(false);
  });

  it('goalId → false', () => {
    expect(isWaiting(task({ goalId: 'goal_1' }))).toBe(false);
  });
});

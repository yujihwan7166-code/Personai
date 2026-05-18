import { describe, it, expect } from 'vitest';
import { computeGoalProgress } from '@/lib/planner/goalProgress';
import type { PlannerGoal, PlannerTask, PlannerMilestone } from '@/types/planner';

function goal(): PlannerGoal {
  return {
    id: 'g1', title: '책 12권', color: 'blue', status: 'active', order: 0,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function task(id: string, opts: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id, title: id, done: false, createdAt: '2026-05-01T00:00:00Z',
    goalId: 'g1', ...opts,
  };
}

function milestone(id: string, done = false): PlannerMilestone {
  return {
    id, goalId: 'g1', title: id, done, order: 0,
    createdAt: '2026-05-01T00:00:00Z',
  };
}

describe('computeGoalProgress', () => {
  it('빈 목표 → 0%', () => {
    const r = computeGoalProgress(goal(), [], []);
    expect(r.percent).toBe(0);
    expect(r.totalTasks).toBe(0);
    expect(r.doneTasks).toBe(0);
  });

  it('절반 완료 → 50%', () => {
    const tasks = [task('a', { done: true }), task('b', { done: false })];
    const r = computeGoalProgress(goal(), tasks, []);
    expect(r.totalTasks).toBe(2);
    expect(r.doneTasks).toBe(1);
    expect(r.openTasks).toBe(1);
    expect(r.percent).toBe(50);
  });

  it('마일스톤 포함 가중', () => {
    const tasks = [task('a', { done: true })];
    const ms = [milestone('m1', true), milestone('m2', false)];
    const r = computeGoalProgress(goal(), tasks, ms);
    // total = 3 (task 1 + milestone 2), done = 2 (task done + milestone done)
    expect(r.totalTasks).toBe(1);
    expect(r.milestoneTotal).toBe(2);
    expect(r.milestoneDone).toBe(1);
    expect(r.percent).toBe(Math.round((2 / 3) * 100));
  });

  it('canceled task 는 open 아님', () => {
    const tasks = [task('a', { canceled: true }), task('b', { done: false })];
    const r = computeGoalProgress(goal(), tasks, []);
    expect(r.openTasks).toBe(1);
  });

  it('다른 목표의 task 는 무시', () => {
    const tasks = [task('a', { goalId: 'other' }), task('b', { done: true })];
    const r = computeGoalProgress(goal(), tasks, []);
    expect(r.totalTasks).toBe(1);
    expect(r.doneTasks).toBe(1);
  });
});

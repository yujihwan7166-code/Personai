import { describe, it, expect, beforeEach } from 'vitest';
import { goalStore } from '@/services/planner/goalStore';
import { taskStore } from '@/services/planner/taskStore';
import { computeGoalProgress } from '@/lib/planner/goalProgress';

describe('goalStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds and finds goals by normalized title', () => {
    const goal = goalStore.add({ title: 'Launch Plan', color: 'teal' });

    expect(goal.id).toMatch(/^goal_/);
    expect(goalStore.findByTitle('launch plan')?.id).toBe(goal.id);
    expect(goalStore.listActive()[0].title).toBe('Launch Plan');
  });

  it('stores milestones per goal', () => {
    const goal = goalStore.add({ title: 'Project' });
    const milestone = goalStore.addMilestone({ goalId: goal.id, title: 'Draft' });

    expect(goalStore.listMilestones(goal.id)).toHaveLength(1);
    goalStore.updateMilestone(milestone.id, { done: true });
    expect(goalStore.findMilestone(milestone.id)?.done).toBe(true);
  });

  it('computes progress from tasks and milestones', () => {
    const goal = goalStore.add({ title: 'Course' });
    goalStore.addMilestone({ goalId: goal.id, title: 'Week 1', done: true });
    taskStore.add({ title: 'Read', goalId: goal.id, done: true });
    taskStore.add({ title: 'Review', goalId: goal.id });

    const progress = computeGoalProgress(
      goal,
      taskStore.list(),
      goalStore.listMilestones(goal.id),
    );

    expect(progress.totalTasks).toBe(2);
    expect(progress.openTasks).toBe(1);
    expect(progress.percent).toBe(67);
  });
});

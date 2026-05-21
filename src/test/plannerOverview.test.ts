import { describe, expect, it } from 'vitest';
import { computePlannerOverviewMetrics } from '@/lib/planner/overview';
import type { PlannerGoal, PlannerMilestone, PlannerTask, PlannerTimelineItem } from '@/types/planner';

const task = (patch: Partial<PlannerTask> & Pick<PlannerTask, 'id' | 'title'>): PlannerTask => ({
  done: false,
  createdAt: '2026-05-20T00:00:00.000Z',
  ...patch,
});

const goal = (patch: Partial<PlannerGoal> & Pick<PlannerGoal, 'id' | 'title'>): PlannerGoal => ({
  color: 'blue',
  status: 'active',
  order: 0,
  createdAt: '2026-05-20T00:00:00.000Z',
  ...patch,
});

const milestone = (patch: Partial<PlannerMilestone> & Pick<PlannerMilestone, 'id' | 'goalId' | 'title'>): PlannerMilestone => ({
  done: false,
  order: 0,
  createdAt: '2026-05-20T00:00:00.000Z',
  ...patch,
});

describe('computePlannerOverviewMetrics', () => {
  it('separates scheduled focus, planned focus, inbox, overdue, and next item', () => {
    const scheduled = task({
      id: 't1',
      title: 'scheduled',
      startAt: '2026-05-21T02:00:00.000Z',
      endAt: '2026-05-21T03:00:00.000Z',
    });
    const planned = task({ id: 't2', title: 'planned', plannedFor: '2026-05-21' });
    const inbox = task({ id: 't3', title: 'inbox' });
    const overdue = task({ id: 't4', title: 'overdue', plannedFor: '2026-05-20' });
    const done = task({ id: 't5', title: 'done', done: true, plannedFor: '2026-05-21' });
    const dayItems: PlannerTimelineItem[] = [
      { kind: 'task', data: scheduled },
      {
        kind: 'event',
        data: {
          id: 'e1',
          title: 'standup',
          startAt: '2026-05-21T01:00:00.000Z',
          endAt: '2026-05-21T01:30:00.000Z',
          source: 'user',
          createdAt: '2026-05-20T00:00:00.000Z',
        },
      },
    ];

    const metrics = computePlannerOverviewMetrics({
      anchorKey: '2026-05-21',
      todayKey: '2026-05-21',
      dayItems,
      tasks: [scheduled, planned, inbox, overdue, done],
      goals: [],
      milestones: [],
      now: new Date('2026-05-21T00:30:00.000Z'),
    });

    expect(metrics.eventCount).toBe(1);
    expect(metrics.scheduledTaskCount).toBe(1);
    expect(metrics.plannedTaskCount).toBe(1);
    expect(metrics.focusCount).toBe(2);
    expect(metrics.inbox).toBe(1);
    expect(metrics.overdue).toBe(1);
    expect(metrics.next?.data.title).toBe('standup');
  });

  it('uses all goal tasks when computing progress instead of only open tasks', () => {
    const doneTask = task({ id: 'done', title: 'done', done: true, goalId: 'g1' });
    const openTask = task({ id: 'open', title: 'open', goalId: 'g1' });
    const metrics = computePlannerOverviewMetrics({
      anchorKey: '2026-05-21',
      todayKey: '2026-05-21',
      dayItems: [],
      tasks: [doneTask, openTask],
      goals: [goal({ id: 'g1', title: 'Launch' })],
      milestones: [milestone({ id: 'm1', goalId: 'g1', title: 'Spec', done: true })],
      now: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(metrics.activeGoalCount).toBe(1);
    expect(metrics.averageGoalProgress).toBe(67);
    expect(metrics.goalAtRisk).toBe(0);
  });

  it('counts only truly unassigned tasks as inbox', () => {
    const metrics = computePlannerOverviewMetrics({
      anchorKey: '2026-05-21',
      todayKey: '2026-05-21',
      dayItems: [],
      tasks: [
        task({ id: 'plain', title: 'plain inbox' }),
        task({ id: 'listed', title: 'listed', listId: 'work' }),
        task({ id: 'goal', title: 'goal task', goalId: 'g1' }),
        task({ id: 'planned', title: 'planned', plannedFor: '2026-05-21' }),
      ],
      goals: [goal({ id: 'g1', title: 'Launch' })],
      milestones: [],
      now: new Date('2026-05-21T00:00:00.000Z'),
    });

    expect(metrics.inbox).toBe(1);
  });
});

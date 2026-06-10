import { describe, expect, it } from 'vitest';
import { compareTodoTasks, nextTodoOrderForDay } from '@/lib/planner/todoOrder';
import type { PlannerTask } from '@/types/planner';

const task = (id: string, patch: Partial<PlannerTask> = {}): PlannerTask => ({
  id,
  title: id,
  done: false,
  createdAt: `2026-06-10T09:00:0${id.length}.000Z`,
  ...patch,
});

describe('planner todo ordering', () => {
  it('uses manual todoOrder before priority, pinned, and creation fallback', () => {
    const ordered = [
      task('fallback-new', { createdAt: '2026-06-10T09:10:00.000Z' }),
      task('manual-last', { todoOrder: 30, priority: 3, pinned: true }),
      task('manual-first', { todoOrder: 10 }),
      task('manual-middle', { todoOrder: 20 }),
      task('fallback-high', { priority: 3 }),
    ].sort(compareTodoTasks);

    expect(ordered.map((item) => item.id)).toEqual([
      'manual-first',
      'manual-middle',
      'manual-last',
      'fallback-high',
      'fallback-new',
    ]);
  });

  it('keeps the existing fallback order when no manual order exists', () => {
    const ordered = [
      task('newest', { createdAt: '2026-06-10T09:30:00.000Z' }),
      task('pinned', { pinned: true, createdAt: '2026-06-10T09:00:00.000Z' }),
      task('high', { priority: 3, createdAt: '2026-06-10T09:05:00.000Z' }),
      task('normal', { createdAt: '2026-06-10T09:20:00.000Z' }),
    ].sort(compareTodoTasks);

    expect(ordered.map((item) => item.id)).toEqual([
      'high',
      'pinned',
      'newest',
      'normal',
    ]);
  });

  it('appends moved todos after the target day manual order', () => {
    const tasks = [
      task('target-a', { plannedFor: '2026-06-12', todoOrder: 10 }),
      task('target-b', { plannedFor: '2026-06-12', todoOrder: 40 }),
      task('moving', { plannedFor: '2026-06-11', todoOrder: 90 }),
      task('scheduled', { plannedFor: '2026-06-12', startAt: '2026-06-12T09:00:00.000Z', todoOrder: 200 }),
      task('other-day', { plannedFor: '2026-06-13', todoOrder: 300 }),
    ];

    expect(nextTodoOrderForDay(tasks, '2026-06-12', 'moving')).toBe(50);
  });

  it('starts a target day todo order at 10 when no manual order exists', () => {
    const tasks = [
      task('fallback-only', { plannedFor: '2026-06-12' }),
      task('moving', { plannedFor: '2026-06-12', todoOrder: 20 }),
    ];

    expect(nextTodoOrderForDay(tasks, '2026-06-12', 'moving')).toBe(10);
  });
});

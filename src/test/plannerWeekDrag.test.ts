import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLocalIsoForDayTime,
  buildWeekSchedulePatch,
  buildWeekTodoMovePatch,
  defaultWeekScheduleTime,
} from '@/lib/planner/weekDrag';

describe('planner week drag helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a local schedule time on the dropped week day', () => {
    const startIso = buildLocalIsoForDayTime(new Date(2026, 5, 11, 0, 0).toISOString(), '14:30');
    const start = new Date(startIso);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(30);
  });

  it('falls back to 09:00 for invalid schedule time input', () => {
    const startIso = buildLocalIsoForDayTime('2026-06-11', '25:99');
    const start = new Date(startIso);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
  });

  it('falls back to today instead of the current moment for invalid day input', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 9, 17, 42, 0, 0));

    const startIso = buildLocalIsoForDayTime('2026-02-31', '25:99');
    const start = new Date(startIso);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(9);
    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
  });

  it('creates a schedule patch that clears todo-only placement fields', () => {
    const patch = buildWeekSchedulePatch('2026-06-11', '14:30', 90);
    const start = new Date(patch.startAt!);
    const end = new Date(patch.endAt!);

    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(30);
    expect(end.getTime() - start.getTime()).toBe(90 * 60_000);
    expect(patch.plannedFor).toBeUndefined();
    expect(patch.todoOrder).toBeUndefined();
    expect(patch.laneOrder).toBeUndefined();
  });

  it('clamps tiny schedule durations to at least 15 minutes', () => {
    const patch = buildWeekSchedulePatch('2026-06-11', '14:30', 1);

    expect(new Date(patch.endAt!).getTime() - new Date(patch.startAt!).getTime()).toBe(15 * 60_000);
  });

  it('creates a todo move patch that clears schedule placement fields', () => {
    expect(buildWeekTodoMovePatch('2026-06-12')).toEqual({
      plannedFor: '2026-06-12',
      startAt: undefined,
      endAt: undefined,
      laneOrder: undefined,
      todoOrder: undefined,
    });
  });

  it('uses the next half-hour only when the dropped day is today', () => {
    const now = new Date(2026, 5, 11, 10, 12, 0, 0);

    expect(defaultWeekScheduleTime('2026-06-11', now)).toBe('10:30');
    expect(defaultWeekScheduleTime(new Date(2026, 5, 11, 0, 0).toISOString(), now)).toBe('10:30');
    expect(defaultWeekScheduleTime(new Date(2026, 5, 12, 0, 0).toISOString(), now)).toBe('09:00');
  });
});

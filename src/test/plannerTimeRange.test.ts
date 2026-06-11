import { describe, expect, it } from 'vitest';
import { clampStartToLocalDay, moveIntervalToLocalDayStart } from '@/lib/planner/timeRange';

describe('planner time range helpers', () => {
  it('keeps timeline drag moves inside the anchor day', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 11, 1, 30, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 30 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(23);
    expect(clamped.getMinutes()).toBe(30);
  });

  it('keeps candidates before the anchor day at day start', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 9, 22, 0, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(0);
    expect(clamped.getMinutes()).toBe(0);
  });

  it('allows a long moved item to continue into the next day', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 10, 22, 0, 0, 0);
    const start = clampStartToLocalDay(candidate, anchor);
    const end = new Date(start.getTime() + 4 * 60 * 60_000);

    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(22);
    expect(end.getDate()).toBe(11);
    expect(end.getHours()).toBe(2);
  });

  it('moves a long item to the dropped late slot without pulling it before midnight', () => {
    const currentStart = new Date(2026, 5, 11, 18, 0, 0, 0).toISOString();
    const currentEnd = new Date(2026, 5, 11, 21, 40, 0, 0).toISOString();
    const targetStart = new Date(2026, 5, 11, 22, 0, 0, 0).toISOString();
    const moved = moveIntervalToLocalDayStart(
      currentStart,
      currentEnd,
      targetStart,
      targetStart,
      30 * 60_000,
    );
    const start = new Date(moved.startAt);
    const end = new Date(moved.endAt);

    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(22);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(12);
    expect(end.getHours()).toBe(1);
    expect(end.getMinutes()).toBe(40);
  });
});

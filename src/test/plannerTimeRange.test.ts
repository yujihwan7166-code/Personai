import { describe, expect, it } from 'vitest';
import { clampStartToLocalDay } from '@/lib/planner/timeRange';

describe('planner time range helpers', () => {
  it('keeps timeline drag moves inside the anchor day', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 11, 1, 30, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 60 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(23);
    expect(clamped.getMinutes()).toBe(0);
  });

  it('keeps candidates before the anchor day at day start', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 9, 22, 0, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 30 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(0);
    expect(clamped.getMinutes()).toBe(0);
  });
});

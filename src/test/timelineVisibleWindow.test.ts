import { describe, expect, it } from 'vitest';
import { getTimelineVisibleWindow } from '@/lib/planner/timelineVisibleWindow';

const localIso = (day: number, hour: number, minute = 0) =>
  new Date(2026, 5, day, hour, minute, 0, 0).toISOString();

describe('getTimelineVisibleWindow', () => {
  it('keeps the normal compact window when no item spills outside it', () => {
    expect(
      getTimelineVisibleWindow({
        compact: true,
        dateIso: localIso(12, 9),
        items: [{ startAt: localIso(12, 10), endAt: localIso(12, 11) }],
      }),
    ).toEqual({ startHour: 7, endHour: 23 });
  });

  it('expands compact view to show an overnight carryover on the next day', () => {
    expect(
      getTimelineVisibleWindow({
        compact: true,
        dateIso: localIso(12, 9),
        items: [{ startAt: localIso(11, 22), endAt: localIso(12, 2) }],
      }),
    ).toEqual({ startHour: 0, endHour: 23 });
  });

  it('expands compact view to show late blocks that run past 23:00', () => {
    expect(
      getTimelineVisibleWindow({
        compact: true,
        dateIso: localIso(11, 9),
        items: [{ startAt: localIso(11, 22), endAt: localIso(12, 2) }],
      }),
    ).toEqual({ startHour: 7, endHour: 24 });
  });

  it('uses the full day when compact mode is off', () => {
    expect(
      getTimelineVisibleWindow({
        compact: false,
        dateIso: localIso(12, 9),
        items: [{ startAt: localIso(11, 22), endAt: localIso(12, 2) }],
      }),
    ).toEqual({ startHour: 0, endHour: 24 });
  });
});

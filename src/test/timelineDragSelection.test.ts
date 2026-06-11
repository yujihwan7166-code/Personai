import { describe, expect, it } from 'vitest';
import {
  buildTimelineDragSelection,
  formatTimelineMinuteLabel,
} from '@/lib/planner/timelineDragSelection';

describe('timeline drag selection', () => {
  it('allows a dragged selection to end after midnight', () => {
    const selection = buildTimelineDragSelection({
      startMin: 22 * 60,
      endMin: 26 * 60,
      minVisibleMinute: 0,
      maxVisibleMinute: 24 * 60,
      minDurationMin: 15,
    });

    expect(selection.startMin).toBe(22 * 60);
    expect(selection.endMin).toBe(26 * 60);
    expect(selection.durationMin).toBe(4 * 60);
  });

  it('keeps a late 3h40m selection anchored at the dropped start time', () => {
    const selection = buildTimelineDragSelection({
      startMin: 22 * 60,
      endMin: 25 * 60 + 40,
      minVisibleMinute: 0,
      maxVisibleMinute: 24 * 60,
      minDurationMin: 15,
    });

    expect(selection.startMin).toBe(22 * 60);
    expect(selection.endMin).toBe(25 * 60 + 40);
    expect(selection.durationMin).toBe(220);
  });

  it('still clamps the start inside the visible day', () => {
    const selection = buildTimelineDragSelection({
      startMin: 25 * 60,
      endMin: 26 * 60,
      minVisibleMinute: 0,
      maxVisibleMinute: 24 * 60,
      minDurationMin: 30,
    });

    expect(selection.startMin).toBe(23 * 60 + 30);
    expect(selection.durationMin).toBe(150);
  });

  it('formats labels that continue into the next day', () => {
    expect(formatTimelineMinuteLabel(22 * 60)).toBe('22:00');
    expect(formatTimelineMinuteLabel(26 * 60)).toBe('다음날 02:00');
  });
});

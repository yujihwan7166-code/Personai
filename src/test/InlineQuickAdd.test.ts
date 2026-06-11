import { describe, expect, it } from 'vitest';
import { buildInlineQuickAddTaskInput } from '@/lib/planner/inlineQuickAdd';

describe('buildInlineQuickAddTaskInput', () => {
  it('keeps relative date words as title text when a timeline slot is already selected', () => {
    const startIso = new Date(2026, 4, 12, 9, 0, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('내일 운동하기', startIso, 45);

    expect(input.title).toBe('내일 운동하기');
    expect(input.startAt).toBe(startIso);
    expect(input.endAt).toBe(new Date(new Date(startIso).getTime() + 45 * 60_000).toISOString());
  });

  it('keeps explicit time words as title text instead of moving the selected slot', () => {
    const startIso = new Date(2026, 4, 12, 14, 30, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('오후 3시 회의', startIso);

    expect(input.title).toBe('오후 3시 회의');
    expect(input.startAt).toBe(startIso);
    expect(input.endAt).toBe(new Date(new Date(startIso).getTime() + 30 * 60_000).toISOString());
  });

  it('uses an inline duration token while keeping the selected slot start time', () => {
    const startIso = new Date(2026, 4, 12, 14, 30, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('회의 1시간', startIso, 30);

    expect(input.title).toBe('회의');
    expect(input.startAt).toBe(startIso);
    expect(input.endAt).toBe(new Date(new Date(startIso).getTime() + 60 * 60_000).toISOString());
  });

  it('keeps explicit time words in the title but removes duration text', () => {
    const startIso = new Date(2026, 4, 12, 14, 30, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('오후 3시 회의 1시간 30분', startIso);

    expect(input.title).toBe('오후 3시 회의');
    expect(input.startAt).toBe(startIso);
    expect(input.endAt).toBe(new Date(new Date(startIso).getTime() + 90 * 60_000).toISOString());
  });

  it('still extracts non-schedule metadata from plain slot titles', () => {
    const startIso = new Date(2026, 4, 12, 9, 0, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('운동 #건강 !2', startIso);

    expect(input.title).toBe('운동');
    expect(input.tags).toEqual(['건강']);
    expect(input.priority).toBe(2);
  });
  it('applies quick toolbar color and priority selections', () => {
    const startIso = new Date(2026, 4, 12, 9, 0, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('운동 #건강 !2', startIso, 60, {
      color: 'green',
      priority: 3,
    });

    expect(input.color).toBe('green');
    expect(input.priority).toBe(3);
    expect(input.tags).toEqual(['건강']);
  });

  it('keeps overnight custom durations instead of clamping them to midnight', () => {
    const startIso = new Date(2026, 5, 11, 22, 0, 0).toISOString();
    const input = buildInlineQuickAddTaskInput('coding', startIso, 240);
    const end = new Date(input.endAt!);

    expect(input.startAt).toBe(startIso);
    expect(end.getDate()).toBe(12);
    expect(end.getHours()).toBe(2);
    expect(end.getMinutes()).toBe(0);
  });
});

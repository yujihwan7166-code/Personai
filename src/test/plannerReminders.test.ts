import { describe, expect, it } from 'vitest';
import {
  floatingTaskBaseIso,
  formatReminderSummary,
  normalizeReminderMinutes,
  reminderFireIso,
  reminderOccurrencesForEvent,
  reminderOccurrencesForTask,
} from '@/lib/planner/reminders';

describe('planner reminders', () => {
  it('normalizes reminder minute arrays', () => {
    expect(normalizeReminderMinutes([10, '5', 10, -1, Number.NaN, 0])).toEqual([0, 5, 10]);
    expect(normalizeReminderMinutes([])).toBeUndefined();
    expect(normalizeReminderMinutes('10')).toBeUndefined();
  });

  it('formats reminder summaries', () => {
    expect(formatReminderSummary()).toBe('없음');
    expect(formatReminderSummary([0])).toBe('시작 시각');
    expect(formatReminderSummary([60])).toBe('1시간 전');
  });

  it('uses 09:00 local time for floating planned tasks', () => {
    expect(floatingTaskBaseIso('2026-06-09')).toBe(new Date(2026, 5, 9, 9, 0, 0, 0).toISOString());
  });

  it('builds task reminder occurrences from plannedFor when startAt is absent', () => {
    const occurrences = reminderOccurrencesForTask({
      id: 'tsk_1',
      title: '대출 심사 전화하기',
      plannedFor: '2026-06-09',
      reminderMinutes: [30],
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({
      itemId: 'tsk_1',
      title: '대출 심사 전화하기',
      kindLabel: '할 일',
      minutesBefore: 30,
    });
    expect(occurrences[0].baseIso).toBe(new Date(2026, 5, 9, 9, 0, 0, 0).toISOString());
    expect(occurrences[0].fireIso).toBe(new Date(2026, 5, 9, 8, 30, 0, 0).toISOString());
  });

  it('builds event reminder occurrences from startAt', () => {
    const startAt = new Date(2026, 5, 9, 12, 30, 0, 0).toISOString();
    const occurrences = reminderOccurrencesForEvent({
      id: 'evt_1',
      title: '헬스장 가기',
      startAt,
      reminderMinutes: [10, 0],
    });

    expect(occurrences.map((item) => item.minutesBefore)).toEqual([0, 10]);
    expect(occurrences[0].fireIso).toBe(startAt);
    expect(occurrences[1].fireIso).toBe(new Date(2026, 5, 9, 12, 20, 0, 0).toISOString());
  });

  it('computes fire times by subtracting minutes', () => {
    const startAt = new Date(2026, 5, 9, 14, 0, 0, 0).toISOString();
    expect(reminderFireIso(startAt, 60)).toBe(new Date(2026, 5, 9, 13, 0, 0, 0).toISOString());
  });
});

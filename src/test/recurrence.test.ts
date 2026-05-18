/**
 * Planner 반복 규칙 expand — 핵심 로직 회귀 방지.
 * (직전까지 미커버였던 영역 — site-map audit 에서 지적됨)
 */
import { describe, it, expect } from 'vitest';
import { expandRecurrence, isInstanceId, parseInstanceId, isRecurringMaster } from '@/lib/planner/recurrence';
import type { PlannerTask, RecurrenceRule } from '@/types/planner';

function makeTask(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: 'tsk_test',
    title: '운동',
    done: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    startAt: '2026-05-04T09:00:00.000Z', // 월
    endAt: '2026-05-04T10:00:00.000Z',
    ...overrides,
  };
}

const RANGE_START = new Date('2026-05-04T00:00:00.000Z');
const RANGE_END = new Date('2026-05-11T00:00:00.000Z'); // 1주

describe('expandRecurrence — DAILY', () => {
  it('하루 1회 × 7일 → 7 instances', () => {
    const t = makeTask({ recurrence: { freq: 'daily', interval: 1 } as RecurrenceRule });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out).toHaveLength(7);
  });

  it('interval 2 → 4 instances (월/수/금/일)', () => {
    const t = makeTask({ recurrence: { freq: 'daily', interval: 2 } as RecurrenceRule });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out.length).toBeGreaterThanOrEqual(3); // 정확 개수는 timezone 영향
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it('count: 3 → 3 instances 만', () => {
    const t = makeTask({ recurrence: { freq: 'daily', interval: 1, count: 3 } as RecurrenceRule });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out).toHaveLength(3);
  });

  it('count: 0 → 0 instances (명시적)', () => {
    const t = makeTask({ recurrence: { freq: 'daily', interval: 1, count: 0 } as RecurrenceRule });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out).toHaveLength(0);
  });
});

describe('expandRecurrence — WEEKLY byday', () => {
  it('월/수/금 매주 → 1주 범위에 3회', () => {
    const t = makeTask({
      recurrence: { freq: 'weekly', interval: 1, byday: ['MO', 'WE', 'FR'] } as RecurrenceRule,
    });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.length).toBeLessThanOrEqual(4);
  });
});

describe('expandRecurrence — until / exdates', () => {
  it('until 가 범위 시작 이전 → 0', () => {
    const t = makeTask({
      recurrence: { freq: 'daily', interval: 1, until: '2026-04-01T00:00:00Z' } as RecurrenceRule,
    });
    expect(expandRecurrence(t, RANGE_START, RANGE_END)).toHaveLength(0);
  });

  it('exdates 로 일부 제거', () => {
    const t = makeTask({
      recurrence: {
        freq: 'daily', interval: 1,
        exdates: ['2026-05-05T09:00:00.000Z', '2026-05-06T09:00:00.000Z'],
      } as RecurrenceRule,
    });
    const out = expandRecurrence(t, RANGE_START, RANGE_END);
    expect(out.length).toBe(5); // 7일 - 2 exdate
  });
});

describe('expandRecurrence — recurrence 없음', () => {
  it('빈 결과', () => {
    const t = makeTask();
    expect(expandRecurrence(t, RANGE_START, RANGE_END)).toEqual([]);
  });
});

describe('isInstanceId / parseInstanceId', () => {
  it('@ 포함 → instance', () => {
    expect(isInstanceId('master_abc@2026-05-04T09:00:00.000Z')).toBe(true);
    expect(isInstanceId('master_abc')).toBe(false);
  });

  it('parseInstanceId → masterId + occurrenceIso', () => {
    const p = parseInstanceId('master_abc@2026-05-04T09:00:00.000Z');
    expect(p?.masterId).toBe('master_abc');
    expect(p?.occurrenceIso).toBe('2026-05-04T09:00:00.000Z');
  });

  it('parseInstanceId 잘못된 형식 → null', () => {
    expect(parseInstanceId('no_at_sign')).toBeNull();
  });
});

describe('isRecurringMaster', () => {
  it('recurrence 있음 → true', () => {
    expect(isRecurringMaster({ recurrence: { freq: 'daily', interval: 1 } as RecurrenceRule })).toBe(true);
  });
  it('recurrence 없음 → false', () => {
    expect(isRecurringMaster({})).toBe(false);
  });
});

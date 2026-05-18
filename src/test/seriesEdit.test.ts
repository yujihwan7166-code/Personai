import { describe, it, expect } from 'vitest';
import { editAll, editThisOnly, editThisAndFuture } from '@/lib/planner/seriesEdit';
import type { PlannerTask, RecurrenceRule } from '@/types/planner';

interface MockStore {
  list: () => PlannerTask[];
  update: (id: string, patch: Partial<Omit<PlannerTask, 'id' | 'createdAt'>>) => void;
  add: (input: Omit<PlannerTask, 'id' | 'createdAt'> & Partial<Pick<PlannerTask, 'createdAt'>>) => PlannerTask;
}

function makeStore(initial: PlannerTask[]): MockStore {
  let items = [...initial];
  let counter = 100;
  return {
    list: () => items,
    update: (id, patch) => {
      items = items.map((t) => (t.id === id ? { ...t, ...patch } : t));
    },
    add: (input) => {
      const next: PlannerTask = {
        ...input,
        id: `tsk_${++counter}`,
        createdAt: input.createdAt ?? new Date().toISOString(),
      } as PlannerTask;
      items.push(next);
      return next;
    },
  };
}

function master(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: 'master',
    title: '운동',
    done: false,
    createdAt: '2026-05-01T00:00:00Z',
    startAt: '2026-05-04T09:00:00.000Z',
    endAt: '2026-05-04T10:00:00.000Z',
    recurrence: { freq: 'daily', interval: 1 } as RecurrenceRule,
    ...overrides,
  };
}

describe('editAll', () => {
  it('마스터에 patch 직접 적용', () => {
    const m = master();
    const store = makeStore([m]);
    editAll(store, m, { title: '아침 운동' });
    expect(store.list()[0].title).toBe('아침 운동');
  });
});

describe('editThisOnly', () => {
  it('exdate 추가 + 새 단발 항목 생성', () => {
    const m = master();
    const store = makeStore([m]);
    editThisOnly(store, m, '2026-05-05T09:00:00.000Z', { title: '쉽게 가볍게' });
    const updated = store.list().find((t) => t.id === 'master');
    expect(updated?.recurrence?.exdates).toContain('2026-05-05T09:00:00.000Z');
    // 새 항목 추가됨
    const newItems = store.list().filter((t) => t.id !== 'master');
    expect(newItems).toHaveLength(1);
    expect(newItems[0].title).toBe('쉽게 가볍게');
    expect(newItems[0].recurrence).toBeUndefined();
  });

  it('createNew=false → exdate 만, 신규 X', () => {
    const m = master();
    const store = makeStore([m]);
    editThisOnly(store, m, '2026-05-05T09:00:00.000Z', {}, { createNew: false });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].recurrence?.exdates).toContain('2026-05-05T09:00:00.000Z');
  });
});

describe('editThisAndFuture', () => {
  it('원본 series 잘라내기 + 새 series 신설', () => {
    const m = master();
    const store = makeStore([m]);
    editThisAndFuture(store, m, '2026-05-10T09:00:00.000Z', { title: '바뀐 운동' });
    const old = store.list().find((t) => t.id === 'master');
    // 원본은 until 가 잘림
    expect(old?.recurrence?.until).toBeTruthy();
    // 새 series 추가
    const news = store.list().filter((t) => t.id !== 'master');
    expect(news).toHaveLength(1);
    expect(news[0].title).toBe('바뀐 운동');
    expect(news[0].recurrence?.freq).toBe('daily');
  });

  it('recurrence 없는 master → no-op', () => {
    const m = master({ recurrence: undefined });
    const store = makeStore([m]);
    editThisAndFuture(store, m, '2026-05-10T09:00:00.000Z', { title: 'x' });
    expect(store.list()).toHaveLength(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { habitStore } from '@/services/planner/habitStore';

const baseSchedule = { type: 'daily' as const };

describe('habitStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('add → list 동기화', () => {
    const h = habitStore.add({ title: '운동', emoji: '🏃', color: 'green', schedule: baseSchedule });
    expect(h.id).toBeTruthy();
    expect(habitStore.list()).toHaveLength(1);
    expect(habitStore.list()[0].title).toBe('운동');
  });

  it('add 기본값 — archived=false, pinned=false', () => {
    const h = habitStore.add({ title: '독서', emoji: '📖', color: 'blue', schedule: baseSchedule });
    expect(h.archived).toBe(false);
    expect(h.pinned).toBe(false);
  });

  it('update — 부분 patch + updatedAt 갱신', async () => {
    const h = habitStore.add({ title: '명상', emoji: '🧘', color: 'purple', schedule: baseSchedule });
    const t1 = h.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    habitStore.update(h.id, { title: '아침 명상' });
    const updated = habitStore.find(h.id)!;
    expect(updated.title).toBe('아침 명상');
    expect(updated.updatedAt).not.toBe(t1);
  });

  it('listActive — archived 제외', () => {
    const h1 = habitStore.add({ title: 'a', emoji: '⭐', color: 'amber', schedule: baseSchedule });
    habitStore.add({ title: 'b', emoji: '⭐', color: 'amber', schedule: baseSchedule });
    habitStore.update(h1.id, { archived: true });
    expect(habitStore.listActive()).toHaveLength(1);
    expect(habitStore.list()).toHaveLength(2);
  });

  it('find — 존재 / 없음', () => {
    const h = habitStore.add({ title: 'x', emoji: '⭐', color: 'red', schedule: baseSchedule });
    expect(habitStore.find(h.id)?.id).toBe(h.id);
    expect(habitStore.find('nope')).toBeUndefined();
  });
});

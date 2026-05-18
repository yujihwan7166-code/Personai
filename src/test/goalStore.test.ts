import { describe, it, expect, beforeEach } from 'vitest';
import { goalStore } from '@/services/planner/goalStore';

describe('goalStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('add → list', () => {
    const g = goalStore.add({ title: '책 12권 읽기' });
    expect(g.id).toMatch(/^goal/);
    expect(g.status).toBe('active');
    expect(g.color).toBe('blue');
    expect(goalStore.list()).toHaveLength(1);
  });

  it('add 옵션 (status / color / dueDate)', () => {
    const g = goalStore.add({
      title: '실리콘밸리',
      color: 'green',
      status: 'done',
      dueDate: '2026-12-31',
    });
    expect(g.color).toBe('green');
    expect(g.status).toBe('done');
    expect(g.dueDate).toBe('2026-12-31');
  });

  it('update — 부분 patch', () => {
    const g = goalStore.add({ title: '운동' });
    goalStore.update(g.id, { title: '아침 운동', status: 'done' });
    const u = goalStore.find(g.id)!;
    expect(u.title).toBe('아침 운동');
    expect(u.status).toBe('done');
  });

  it('remove', () => {
    const g = goalStore.add({ title: 'temp' });
    goalStore.remove(g.id);
    expect(goalStore.find(g.id)).toBeUndefined();
  });

  it('find 없으면 undefined', () => {
    expect(goalStore.find('nope')).toBeUndefined();
  });
});

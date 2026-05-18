import { describe, it, expect, beforeEach } from 'vitest';
import { taskListStore } from '@/services/planner/taskListStore';

describe('taskListStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('add + list', () => {
    const l = taskListStore.add({ name: '업무', color: 'blue' });
    expect(l.id).toBeTruthy();
    expect(l.name).toBe('업무');
    expect(taskListStore.list()).toHaveLength(1);
  });

  it('add 옵션 (emoji)', () => {
    const l = taskListStore.add({ name: '개인', color: 'green', emoji: '🌱' });
    expect(l.emoji).toBe('🌱');
  });

  it('update — 이름 변경', () => {
    const l = taskListStore.add({ name: '업무', color: 'blue' });
    taskListStore.update(l.id, { name: '회사' });
    expect(taskListStore.find(l.id)?.name).toBe('회사');
  });

  it('remove', () => {
    const l = taskListStore.add({ name: 'x', color: 'blue' });
    taskListStore.remove(l.id);
    expect(taskListStore.find(l.id)).toBeUndefined();
  });

  it('reorder — id 배열 순서 적용', () => {
    const a = taskListStore.add({ name: 'A', color: 'blue' });
    const b = taskListStore.add({ name: 'B', color: 'green' });
    const c = taskListStore.add({ name: 'C', color: 'red' });
    taskListStore.reorder([c.id, a.id, b.id]);
    const list = taskListStore.list();
    expect(list[0].id).toBe(c.id);
    expect(list[1].id).toBe(a.id);
    expect(list[2].id).toBe(b.id);
  });
});

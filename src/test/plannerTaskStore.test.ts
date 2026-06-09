import { describe, it, expect, beforeEach } from 'vitest';
import { taskStore } from '@/services/planner/taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('list() empty initially', () => {
    expect(taskStore.list()).toEqual([]);
  });

  it('add() creates task with id, createdAt, default done=false', () => {
    const t = taskStore.add({ title: '보고서' });
    expect(t.id).toMatch(/^tsk_/);
    expect(t.done).toBe(false);
    expect(t.createdAt).toBeTruthy();
  });

  it('listInbox() returns tasks without startAt only', () => {
    taskStore.add({ title: 'inbox-1' });
    taskStore.add({ title: 'inbox-2' });
    taskStore.add({ title: 'scheduled', startAt: '2026-04-29T14:00:00Z', endAt: '2026-04-29T15:00:00Z' });
    const inbox = taskStore.listInbox();
    expect(inbox).toHaveLength(2);
    expect(inbox.every((t) => !t.startAt)).toBe(true);
  });

  it('listScheduled() filters to one day with startAt', () => {
    taskStore.add({ title: 'today',     startAt: '2026-04-29T14:00:00Z', endAt: '2026-04-29T15:00:00Z' });
    taskStore.add({ title: 'tomorrow',  startAt: '2026-04-30T14:00:00Z', endAt: '2026-04-30T15:00:00Z' });
    taskStore.add({ title: 'inbox' });
    const today = taskStore.listScheduled('2026-04-29T00:00:00Z');
    expect(today).toHaveLength(1);
    expect(today[0].title).toBe('today');
  });

  it('toggleDone() flips done state', () => {
    const t = taskStore.add({ title: 'X' });
    taskStore.toggleDone(t.id);
    expect(taskStore.list()[0].done).toBe(true);
    taskStore.toggleDone(t.id);
    expect(taskStore.list()[0].done).toBe(false);
  });

  it('schedule() moves task from inbox to scheduled', () => {
    const t = taskStore.add({ title: 'X' });
    expect(taskStore.listInbox()).toHaveLength(1);
    taskStore.schedule(t.id, '2026-04-29T14:00:00Z', '2026-04-29T15:00:00Z');
    expect(taskStore.listInbox()).toHaveLength(0);
    expect(taskStore.listScheduled('2026-04-29T00:00:00Z')).toHaveLength(1);
  });

  it('unschedule() moves task back to inbox', () => {
    const t = taskStore.add({
      title: 'X',
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
    });
    taskStore.unschedule(t.id);
    expect(taskStore.listInbox()).toHaveLength(1);
    expect(taskStore.listScheduled('2026-04-29T00:00:00Z')).toHaveLength(0);
  });

  it('update() applies partial patch', () => {
    const t = taskStore.add({ title: '원본' });
    taskStore.update(t.id, { title: '수정됨' });
    expect(taskStore.list()[0].title).toBe('수정됨');
  });

  it('remove() deletes task', () => {
    const t = taskStore.add({ title: 'X' });
    taskStore.remove(t.id);
    expect(taskStore.list()).toHaveLength(0);
  });

  it('remove() moves task to trash and restore() brings it back', () => {
    const t = taskStore.add({ title: 'X' });
    taskStore.remove(t.id);
    expect(taskStore.list()).toHaveLength(0);
    expect(taskStore.listDeleted()).toHaveLength(1);
    expect(taskStore.listDeleted()[0].deletedAt).toBeTruthy();

    taskStore.restore(t.id);
    expect(taskStore.listDeleted()).toHaveLength(0);
    expect(taskStore.list()[0].title).toBe('X');
  });

  it('purge() permanently removes a trashed task', () => {
    const t = taskStore.add({ title: 'X' });
    taskStore.remove(t.id);
    taskStore.purge(t.id);
    expect(taskStore.list()).toHaveLength(0);
    expect(taskStore.listDeleted()).toHaveLength(0);
  });
});

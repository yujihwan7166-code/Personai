import { describe, it, expect, beforeEach } from 'vitest';
import { eventStore } from '@/services/planner/eventStore';

describe('eventStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('list() returns empty when no events', () => {
    expect(eventStore.list()).toEqual([]);
  });

  it('add() creates event with auto id and createdAt', () => {
    const e = eventStore.add({
      title: '회의',
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
      source: 'user',
    });
    expect(e.id).toMatch(/^evt_/);
    expect(e.createdAt).toBeTruthy();
    expect(e.title).toBe('회의');
  });

  it('list() returns added events sorted by startAt asc', () => {
    eventStore.add({ title: 'B', startAt: '2026-04-29T15:00:00Z', endAt: '2026-04-29T16:00:00Z', source: 'user' });
    eventStore.add({ title: 'A', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    const list = eventStore.list();
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe('A');
    expect(list[1].title).toBe('B');
  });

  it('listByDate() filters to single day', () => {
    eventStore.add({ title: 'today',     startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.add({ title: 'tomorrow',  startAt: '2026-04-30T10:00:00Z', endAt: '2026-04-30T11:00:00Z', source: 'user' });
    const today = eventStore.listByDate('2026-04-29T00:00:00Z');
    expect(today).toHaveLength(1);
    expect(today[0].title).toBe('today');
  });

  it('listByDate() includes events that overlap the day after midnight', () => {
    const startAt = new Date(2026, 3, 29, 23, 0).toISOString();
    const endAt = new Date(2026, 3, 30, 2, 0).toISOString();
    const firstDay = new Date(2026, 3, 29, 0, 0).toISOString();
    const nextDay = new Date(2026, 3, 30, 0, 0).toISOString();
    const after = new Date(2026, 4, 1, 0, 0).toISOString();

    eventStore.add({ title: 'overnight', startAt, endAt, source: 'user' });

    expect(eventStore.listByDate(firstDay).map((event) => event.title)).toEqual(['overnight']);
    expect(eventStore.listByDate(nextDay).map((event) => event.title)).toEqual(['overnight']);
    expect(eventStore.listByDate(after)).toHaveLength(0);
  });

  it('update() applies partial patch', () => {
    const e = eventStore.add({ title: '원본', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.update(e.id, { title: '변경됨' });
    expect(eventStore.list()[0].title).toBe('변경됨');
  });

  it('persists normalized reminder minutes', () => {
    const e = eventStore.add({
      title: '알림',
      startAt: '2026-04-29T10:00:00Z',
      endAt: '2026-04-29T11:00:00Z',
      source: 'user',
      reminderMinutes: [60, 5, 5, -10],
    });
    expect(e.reminderMinutes).toEqual([5, 60]);

    eventStore.update(e.id, { reminderMinutes: [0, 10] });
    expect(eventStore.list()[0].reminderMinutes).toEqual([0, 10]);

    eventStore.update(e.id, { reminderMinutes: undefined });
    expect(eventStore.list()[0].reminderMinutes).toBeUndefined();
  });

  it('update() with unknown id is no-op', () => {
    eventStore.add({ title: 'A', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.update('unknown', { title: 'B' });
    expect(eventStore.list()[0].title).toBe('A');
  });

  it('remove() deletes event', () => {
    const e = eventStore.add({ title: 'X', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.remove(e.id);
    expect(eventStore.list()).toHaveLength(0);
  });

  it('remove() moves event to trash and restore() brings it back', () => {
    const e = eventStore.add({ title: 'X', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.remove(e.id);
    expect(eventStore.list()).toHaveLength(0);
    expect(eventStore.listDeleted()).toHaveLength(1);
    expect(eventStore.listDeleted()[0].deletedAt).toBeTruthy();

    eventStore.restore(e.id);
    expect(eventStore.listDeleted()).toHaveLength(0);
    expect(eventStore.list()[0].title).toBe('X');
  });

  it('purge() permanently removes a trashed event', () => {
    const e = eventStore.add({ title: 'X', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.remove(e.id);
    eventStore.purge(e.id);
    expect(eventStore.list()).toHaveLength(0);
    expect(eventStore.listDeleted()).toHaveLength(0);
  });

  it('clear() removes all', () => {
    eventStore.add({ title: 'A', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    eventStore.add({ title: 'B', startAt: '2026-04-29T15:00:00Z', endAt: '2026-04-29T16:00:00Z', source: 'user' });
    eventStore.clear();
    expect(eventStore.list()).toEqual([]);
  });

  it('add() persists across re-read (localStorage round-trip)', () => {
    eventStore.add({ title: '저장됨', startAt: '2026-04-29T10:00:00Z', endAt: '2026-04-29T11:00:00Z', source: 'user' });
    // 새 호출은 localStorage 에서 다시 읽음
    const restored = eventStore.list();
    expect(restored[0].title).toBe('저장됨');
  });
});

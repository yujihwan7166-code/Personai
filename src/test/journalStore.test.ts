import { describe, it, expect, beforeEach } from 'vitest';
import { journalStore } from '@/services/journalStore';

describe('journalStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('list() empty initially', () => {
    expect(journalStore.list()).toEqual([]);
  });

  it('add() creates entry with id, createdAt, updatedAt, date(today)', () => {
    const e = journalStore.add({ body: '오늘은 좋은 날' });
    expect(e.id).toMatch(/^jr_/);
    expect(e.createdAt).toBeTruthy();
    expect(e.updatedAt).toBe(e.createdAt);
    expect(e.date).toBe(new Date().toISOString().slice(0, 10));
    expect(e.body).toBe('오늘은 좋은 날');
  });

  it('list() returns entries sorted by createdAt desc (latest first)', async () => {
    journalStore.add({ body: '첫번째' });
    await new Promise((r) => setTimeout(r, 5));
    journalStore.add({ body: '두번째' });
    await new Promise((r) => setTimeout(r, 5));
    journalStore.add({ body: '세번째' });
    const list = journalStore.list();
    expect(list).toHaveLength(3);
    expect(list[0].body).toBe('세번째');
    expect(list[2].body).toBe('첫번째');
  });

  it('listByDate() filters to specific date', () => {
    journalStore.add({ body: 'today1', date: '2026-04-30' });
    journalStore.add({ body: 'yesterday', date: '2026-04-29' });
    journalStore.add({ body: 'today2', date: '2026-04-30' });
    const today = journalStore.listByDate('2026-04-30');
    expect(today).toHaveLength(2);
    expect(today.every((e) => e.date === '2026-04-30')).toBe(true);
  });

  it('getLatestToday() returns most recent today entry or null', async () => {
    expect(journalStore.getLatestToday()).toBeNull();
    journalStore.add({ body: '1' });
    await new Promise((r) => setTimeout(r, 5));
    journalStore.add({ body: '2' });
    const latest = journalStore.getLatestToday();
    expect(latest?.body).toBe('2');
  });

  it('update() applies partial patch and bumps updatedAt', async () => {
    const e = journalStore.add({ body: '원본' });
    await new Promise((r) => setTimeout(r, 5));
    journalStore.update(e.id, { body: '수정', mood: 4 });
    const list = journalStore.list();
    expect(list[0].body).toBe('수정');
    expect(list[0].mood).toBe(4);
    expect(list[0].updatedAt > e.updatedAt).toBe(true);
  });

  it('update() with unknown id is no-op', () => {
    journalStore.add({ body: 'A' });
    journalStore.update('unknown', { body: 'B' });
    expect(journalStore.list()[0].body).toBe('A');
  });

  it('remove() deletes entry', () => {
    const e = journalStore.add({ body: 'X' });
    journalStore.remove(e.id);
    expect(journalStore.list()).toHaveLength(0);
  });

  it('clear() removes all', () => {
    journalStore.add({ body: 'A' });
    journalStore.add({ body: 'B' });
    journalStore.clear();
    expect(journalStore.list()).toEqual([]);
  });

  it('add() persists across re-read (localStorage round-trip)', () => {
    journalStore.add({ body: '저장됨', mood: 5 });
    const restored = journalStore.list();
    expect(restored[0].body).toBe('저장됨');
    expect(restored[0].mood).toBe(5);
  });
  it('normalizes legacy or corrupted stored entries instead of throwing', () => {
    window.localStorage.setItem('journal.entries.v1', JSON.stringify([
      {
        id: 'legacy',
        body: null,
        mood: 9,
        tags: null,
        images: [{ src: 'data:image/png;base64,abc' }],
      },
      null,
    ]));

    const restored = journalStore.list();
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe('legacy');
    expect(restored[0].body).toBe('');
    expect(restored[0].mood).toBeUndefined();
    expect(restored[0].tags).toEqual([]);
    expect(restored[0].createdAt).toBeTruthy();
    expect(restored[0].images?.[0].id).toBe('img_0');
  });
});

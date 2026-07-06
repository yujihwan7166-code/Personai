import { describe, it, expect, beforeEach } from 'vitest';
import { listEntries, addEntry, updateEntry, removeEntry, getEntry, listByDate, toggleStar } from '@/lib/diary/diaryStore';
import { emptyBody } from '@/lib/diary/bodyText';

beforeEach(() => window.localStorage.clear());

describe('diaryStore', () => {
  it('추가/조회/날짜필터', () => {
    const e = addEntry({ date: '2026-07-06', body: emptyBody(), feelings: ['haengbok'], primaryFeeling: 'haengbok' });
    expect(getEntry(e.id)?.primaryFeeling).toBe('haengbok');
    expect(listByDate('2026-07-06')).toHaveLength(1);
    expect(listEntries()).toHaveLength(1);
  });
  it('수정/별표/삭제', () => {
    const e = addEntry({ date: '2026-07-06', body: emptyBody(), feelings: [] });
    updateEntry(e.id, { title: '제목' });
    expect(getEntry(e.id)?.title).toBe('제목');
    toggleStar(e.id);
    expect(getEntry(e.id)?.starred).toBe(true);
    removeEntry(e.id);
    expect(getEntry(e.id)).toBeUndefined();
  });
  it('최신 업데이트 우선 정렬', () => {
    const a = addEntry({ date: '2026-07-01', body: emptyBody(), feelings: [] });
    const b = addEntry({ date: '2026-07-05', body: emptyBody(), feelings: [] });
    updateEntry(a.id, { title: 'touched' });
    expect(listEntries()[0].id).toBe(a.id);
    expect(b.id).toBeDefined();
  });
});

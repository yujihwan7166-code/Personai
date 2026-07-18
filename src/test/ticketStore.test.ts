import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeEntry, normalizeWatch, loadTickets, saveTickets, type TicketEntry } from '@/lib/tickets/ticketStore';

const base = (over: Partial<TicketEntry> = {}): TicketEntry => ({
  id: 'tkt_a', kind: 'movie', title: '기생충', creator: '봉준호', year: 2019,
  rating: 4.5, watchedAt: '2026-07-01', oneLiner: '수직의 영화', rewatch: false,
  createdAt: 1000, ...over,
});

describe('normalizeEntry', () => {
  it('정상 항목은 그대로 통과한다', () => {
    expect(normalizeEntry(base(), 0)).toEqual(base());
  });
  it('title 없는 항목은 버린다(null)', () => {
    expect(normalizeEntry({ ...base(), title: '' }, 0)).toBeNull();
    expect(normalizeEntry({ ...base(), title: undefined }, 0)).toBeNull();
    expect(normalizeEntry(null, 0)).toBeNull();
  });
  it('알 수 없는 kind는 movie로, 범위 밖 rating은 클램프', () => {
    const n = normalizeEntry({ ...base(), kind: 'vhs', rating: 9 }, 0)!;
    expect(n.kind).toBe('movie');
    expect(n.rating).toBe(5);
  });
  it('rating은 0.5 단위로 반올림', () => {
    expect(normalizeEntry({ ...base(), rating: 3.3 }, 0)!.rating).toBe(3.5);
    expect(normalizeEntry({ ...base(), rating: 3.1 }, 0)!.rating).toBe(3);
  });
  it('watchedAt이 YMD가 아니면 오늘(로컬)로 대체', () => {
    const n = normalizeEntry({ ...base(), watchedAt: 'not-a-date' }, 0)!;
    expect(n.watchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('id 없으면 복구 id 부여', () => {
    expect(normalizeEntry({ ...base(), id: undefined }, 3)!.id).toMatch(/^tkt_recovered_3/);
  });
  it('빈 배열 필드는 undefined 로 정규화', () => {
    const n = normalizeEntry({ ...base(), genres: [], quotes: [''], photoIds: [] }, 0)!;
    expect(n.genres).toBeUndefined();
    expect(n.quotes).toBeUndefined();
    expect(n.photoIds).toBeUndefined();
  });
  it('photoIds 배열을 보존한다', () => {
    expect(normalizeEntry({ ...base(), photoIds: ['p1', 'p2'] }, 0)!.photoIds).toEqual(['p1', 'p2']);
  });
});

describe('load/save', () => {
  beforeEach(() => localStorage.clear());
  it('빈 저장소면 빈 entries', () => {
    expect(loadTickets()).toEqual({ entries: [] });
  });
  it('저장 후 다시 읽으면 동일 (yearGoal·accent 포함)', () => {
    const s = { entries: [base()], yearGoal: { year: 2026, count: 50 }, accent: '#4cc38a' };
    saveTickets(s);
    expect(loadTickets()).toEqual(s);
  });
  it('손상 JSON이면 빈 entries로 폴백', () => {
    localStorage.setItem('ticketbook.v1', '{{{broken');
    expect(loadTickets()).toEqual({ entries: [] });
  });
  it('count가 0 이하인 yearGoal은 버린다', () => {
    saveTickets({ entries: [], yearGoal: { year: 2026, count: 0 } });
    expect(loadTickets().yearGoal).toBeUndefined();
  });
  it('watchlist 왕복 + 빈 배열은 undefined', () => {
    const wl = { entries: [], watchlist: [{ id: 'w1', kind: 'movie' as const, title: '듄', addedAt: 5 }] };
    saveTickets(wl);
    expect(loadTickets().watchlist).toEqual(wl.watchlist);
    saveTickets({ entries: [], watchlist: [] });
    expect(loadTickets().watchlist).toBeUndefined();
  });
});

describe('normalizeWatch', () => {
  it('title 없으면 null, 알 수 없는 kind는 movie', () => {
    expect(normalizeWatch({ title: '' }, 0)).toBeNull();
    expect(normalizeWatch({ title: '엘든 링', kind: 'zzz' }, 0)!.kind).toBe('movie');
  });
  it('id 없으면 복구 id', () => {
    expect(normalizeWatch({ title: '엘든 링' }, 2)!.id).toMatch(/^wl_recovered_2/);
  });
});

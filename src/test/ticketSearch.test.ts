import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMedia, trendingMedia, hasApiFor, __setKeysForTest } from '@/lib/tickets/search';

beforeEach(() => {
  vi.restoreAllMocks();
  __setKeysForTest(undefined, undefined);
});

describe('hasApiFor', () => {
  it('키 없으면 전부 false', () => {
    expect(hasApiFor('movie')).toBe(false);
    expect(hasApiFor('book')).toBe(false);
  });
  it('TMDB 키만 있으면 movie/drama만 true', () => {
    __setKeysForTest('tmdb-key', undefined);
    expect(hasApiFor('movie')).toBe(true);
    expect(hasApiFor('drama')).toBe(true);
    expect(hasApiFor('book')).toBe(false);
    expect(hasApiFor('game')).toBe(false);   // game/show 는 API 자체가 없음
    expect(hasApiFor('show')).toBe(false);
  });
});

describe('searchMedia', () => {
  it('키 없으면 fetch 없이 빈 배열', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    expect(await searchMedia('movie', '기생충')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
  it('TMDB 응답을 매핑하고 person은 제외', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [
        { media_type: 'movie', title: '기생충', release_date: '2019-05-30', poster_path: '/p.jpg', genre_ids: [53, 18] },
        { media_type: 'tv', name: '오징어 게임', first_air_date: '2021-09-17', genre_ids: [18] },
        { media_type: 'person', name: '봉준호' },
      ],
    })));
    const r = await searchMedia('movie', '기생충');
    expect(r).toHaveLength(2);  // person 제외
    expect(r[0]).toMatchObject({
      kind: 'movie', title: '기생충', year: 2019,
      posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg',
      genres: ['스릴러', '드라마'],
    });
    expect(r[1]).toMatchObject({ kind: 'drama', title: '오징어 게임', year: 2021 });
  });
  it('카카오 책 응답을 매핑한다', async () => {
    __setKeysForTest(undefined, 'kk');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      documents: [{ title: '채식주의자', authors: ['한강'], thumbnail: 'https://t.jpg', datetime: '2007-10-30T00:00:00.000+09:00' }],
    })));
    const r = await searchMedia('book', '채식주의자');
    expect(r[0]).toMatchObject({ kind: 'book', title: '채식주의자', creator: '한강', year: 2007, posterUrl: 'https://t.jpg' });
  });
  it('네트워크 실패 시 빈 배열(throw 금지)', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await searchMedia('movie', 'x')).toEqual([]);
  });
  it('응답이 not-ok면 빈 배열', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 401 }));
    expect(await searchMedia('movie', 'x')).toEqual([]);
  });
});

describe('trendingMedia', () => {
  it('키 없으면 fetch 없이 빈 배열, 책은 키 있어도 빈 배열', async () => {
    __setKeysForTest(undefined, 'kk');
    const spy = vi.spyOn(globalThis, 'fetch');
    expect(await trendingMedia('movie')).toEqual([]);   // TMDB 키 없음
    expect(await trendingMedia('book')).toEqual([]);     // 트렌딩 API 자체 없음
    expect(spy).not.toHaveBeenCalled();
  });
  it('TMDB 트렌딩 응답을 매핑한다', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [{ title: '위키드', release_date: '2024-11-22', poster_path: '/w.jpg', genre_ids: [10402] }],
    })));
    const r = await trendingMedia('movie');
    expect(r[0]).toMatchObject({ kind: 'movie', title: '위키드', year: 2024, posterUrl: 'https://image.tmdb.org/t/p/w342/w.jpg', genres: ['음악'] });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cloudDoc/ai', () => ({
  quickAi: vi.fn(),
  QUICK_MODEL: 'test-model',
}));
import { quickAi } from '@/lib/cloudDoc/ai';
import { aiFillEntry, aiRecommend, aiDiscover, MIN_ENTRIES_FOR_RECO } from '@/lib/tickets/aiFill';
import type { TicketEntry } from '@/lib/tickets/ticketStore';

let seq = 0;
const liked = (title: string): TicketEntry => ({
  id: `${title}${seq++}`, kind: 'movie', title, creator: '', rating: 4.5,
  watchedAt: '2026-01-01', oneLiner: '좋았다', rewatch: false, createdAt: 0,
});

beforeEach(() => vi.mocked(quickAi).mockReset());

describe('aiFillEntry', () => {
  it('JSON 응답을 파싱해 부분 필드를 반환 (코드펜스 포함)', async () => {
    vi.mocked(quickAi).mockResolvedValue('```json\n{"creator":"봉준호","year":2019,"genres":["스릴러"]}\n```');
    expect(await aiFillEntry('movie', '기생충')).toEqual({ creator: '봉준호', year: 2019, genres: ['스릴러'] });
  });
  it('빈 제목이면 호출 없이 null', async () => {
    expect(await aiFillEntry('movie', '   ')).toBeNull();
    expect(quickAi).not.toHaveBeenCalled();
  });
  it('깨진 응답이면 null', async () => {
    vi.mocked(quickAi).mockResolvedValue('그건 좋은 영화죠!');
    expect(await aiFillEntry('movie', '기생충')).toBeNull();
  });
  it('빈 문자열 응답이면 null', async () => {
    vi.mocked(quickAi).mockResolvedValue('');
    expect(await aiFillEntry('movie', 'x')).toBeNull();
  });
});

describe('aiRecommend', () => {
  it('기록이 기준 미만이면 quickAi 호출 없이 null', async () => {
    const few = Array.from({ length: MIN_ENTRIES_FOR_RECO - 1 }, (_, i) => liked(`t${i}`));
    expect(await aiRecommend(few)).toBeNull();
    expect(quickAi).not.toHaveBeenCalled();
  });
  it('취향 한 줄 + 추천 목록을 파싱, 한국어 kind 라벨도 매핑', async () => {
    vi.mocked(quickAi).mockResolvedValue(JSON.stringify({
      taste: '서늘한 스릴러 취향',
      picks: [
        { kind: 'movie', title: '살인의 추억', creator: '봉준호', reason: '결이 같다' },
        { kind: '책', title: '급류', creator: '정대건', reason: '여름 소설' },
      ],
    }));
    const r = await aiRecommend([liked('a'), liked('b'), liked('c')]);
    expect(r?.taste).toBe('서늘한 스릴러 취향');
    expect(r?.picks[0].title).toBe('살인의 추억');
    expect(r?.picks[1].kind).toBe('book');  // '책' → book
  });
  it('taste/picks 형식이 깨지면 null', async () => {
    vi.mocked(quickAi).mockResolvedValue('{"nope":1}');
    expect(await aiRecommend([liked('a'), liked('b'), liked('c')])).toBeNull();
  });
});

describe('aiDiscover', () => {
  it('items를 파싱하고 exclude된 제목은 뺀다', async () => {
    vi.mocked(quickAi).mockResolvedValue(JSON.stringify({
      items: [
        { title: '오펜하이머', creator: '놀런', year: 2023, genres: ['드라마'] },
        { title: '이미봄', creator: 'x', year: 2020 },
      ],
    }));
    const r = await aiDiscover('movie', ['이미봄']);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'movie', title: '오펜하이머', year: 2023, genres: ['드라마'] });
  });
  it('깨진 응답이면 빈 배열', async () => {
    vi.mocked(quickAi).mockResolvedValue('음 글쎄요');
    expect(await aiDiscover('book')).toEqual([]);
  });
});

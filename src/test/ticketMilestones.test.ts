import { describe, it, expect } from 'vitest';
import { MILESTONES, earnedMilestones, newlyEarned, genreStamps, stampProgress, yearStats } from '@/lib/tickets/milestones';
import type { TicketEntry } from '@/lib/tickets/ticketStore';

let seq = 0;
const e = (over: Partial<TicketEntry>): TicketEntry => ({
  id: `e${seq++}`, kind: 'movie', title: 't', creator: '', rating: 4,
  watchedAt: '2026-03-01', oneLiner: '', rewatch: false, createdAt: 0, ...over,
});

describe('earnedMilestones', () => {
  it('9편이면 없음, 10편이면 [10]', () => {
    expect(earnedMilestones(9)).toEqual([]);
    expect(earnedMilestones(10)).toEqual([10]);
  });
  it('100편이면 전부', () => {
    expect(earnedMilestones(100)).toEqual([...MILESTONES]);
  });
});

describe('newlyEarned', () => {
  it('9→10 저장 순간에만 [10]을 준다', () => {
    expect(newlyEarned(9, 10)).toEqual([10]);
    expect(newlyEarned(10, 11)).toEqual([]);   // 중복 발급 방지
    expect(newlyEarned(24, 26)).toEqual([25]);
  });
});

describe('genreStamps', () => {
  it('같은 장르 5편부터 스탬프', () => {
    const four = Array.from({ length: 4 }, () => e({ genres: ['SF'] }));
    expect(genreStamps(four)).toEqual([]);
    const five = [...four, e({ genres: ['SF', '드라마'] })];
    expect(genreStamps(five)).toEqual([{ genre: 'SF', count: 5 }]);
  });
});

describe('stampProgress', () => {
  it('2편 이상은 진행중으로도 노출, 5편이면 earned', () => {
    const entries = [
      ...Array.from({ length: 5 }, () => e({ genres: ['SF'] })),
      ...Array.from({ length: 3 }, () => e({ genres: ['드라마'] })),
      e({ genres: ['코미디'] }),   // 1편 → 제외
    ];
    const p = stampProgress(entries);
    expect(p).toEqual([
      { genre: 'SF', count: 5, earned: true },
      { genre: '드라마', count: 3, earned: false },
    ]);
  });
});

describe('yearStats', () => {
  it('해당 연도만 세고 평균 별점 소수 1자리', () => {
    const entries = [
      e({ watchedAt: '2026-01-01', rating: 5 }),
      e({ watchedAt: '2026-07-01', rating: 4 }),
      e({ watchedAt: '2025-12-31', rating: 1 }),
    ];
    const s = yearStats(entries, 2026);
    expect(s.count).toBe(2);
    expect(s.avgRating).toBe(4.5);
    expect(s.monthCounts[0]).toBe(1);  // 1월
    expect(s.monthCounts[6]).toBe(1);  // 7월
  });
  it('기록 없으면 avgRating 0', () => {
    expect(yearStats([], 2026).avgRating).toBe(0);
  });
});

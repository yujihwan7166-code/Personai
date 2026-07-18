/** 수집형 게이미피케이션 판정 — 전부 파생 계산(저장 없음)이라 중복 발급이 원리적으로 불가. */
import type { TicketEntry } from './ticketStore';

export const MILESTONES = [10, 25, 50, 100] as const;
/** 마일스톤 티켓의 이름·포일 그라데(1번 시안). */
export const MILESTONE_META: Record<number, { name: string; foil: string }> = {
  10: { name: '첫 두 자리', foil: 'linear-gradient(135deg,#F6B23C,#D9772A)' },
  25: { name: '쿼터 클럽', foil: 'linear-gradient(135deg,#EE9C7B,#B0525B)' },
  50: { name: '하프 센추리', foil: 'linear-gradient(135deg,#AEC5E3,#5F7CAB)' },
  100: { name: '센추리', foil: 'linear-gradient(135deg,#F2D06B,#BF8F35)' },
};
export const STAMP_THRESHOLD = 5;

export const earnedMilestones = (count: number): number[] =>
  MILESTONES.filter((m) => count >= m);

/** 저장 직전/직후 개수를 비교해 "이번 저장으로 새로 달성한" 마일스톤만 반환 (축하 팝업용). */
export const newlyEarned = (prevCount: number, nextCount: number): number[] =>
  MILESTONES.filter((m) => prevCount < m && nextCount >= m);

export function genreStamps(entries: TicketEntry[]): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const en of entries) for (const g of en.genres ?? []) map.set(g, (map.get(g) ?? 0) + 1);
  return [...map.entries()]
    .filter(([, c]) => c >= STAMP_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
}

/** 스탬프 진행 상황 — 획득 + 진행중(임계 미만이라도 상위) 함께. 페이지 표시용. */
export function stampProgress(entries: TicketEntry[], limit = 9): { genre: string; count: number; earned: boolean }[] {
  const map = new Map<string, number>();
  for (const en of entries) for (const g of en.genres ?? []) map.set(g, (map.get(g) ?? 0) + 1);
  return [...map.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count, earned: count >= STAMP_THRESHOLD }));
}

export function yearStats(entries: TicketEntry[], year: number): { count: number; avgRating: number; monthCounts: number[] } {
  const inYear = entries.filter((e) => e.watchedAt.startsWith(`${year}-`));
  const monthCounts = Array.from({ length: 12 }, () => 0);
  let sum = 0;
  for (const e of inYear) {
    monthCounts[Number(e.watchedAt.slice(5, 7)) - 1]++;
    sum += e.rating;
  }
  return {
    count: inYear.length,
    avgRating: inYear.length ? Math.round((sum / inYear.length) * 10) / 10 : 0,
    monthCounts,
  };
}

/**
 * 안부 주기 초과 계산 — "오랜만이에요" 목록과 사이드바 배지가 공유.
 */
import { diffDays, toLocalYMD } from '@/types/travel';
import { CLOSENESS_META, type Interaction, type Person } from '@/types/people';

export interface Overdue {
  person: Person;
  months: number;
}

/** 사람별 마지막 연락 날짜(YYYY-MM-DD) — 기록이 없으면 등록일(로컬 캘린더 날짜). */
export function lastContactMap(persons: Person[], interactions: Interaction[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const x of interactions) {
    const prev = map.get(x.personId);
    if (!prev || x.date > prev) map.set(x.personId, x.date);
  }
  for (const p of persons) {
    // createdAt 은 UTC ISO — 로컬 캘린더 날짜로 변환 (프로젝트 로컬 YMD 규칙)
    if (!map.has(p.id)) map.set(p.id, toLocalYMD(new Date(p.createdAt)));
  }
  return map;
}

/** "N일 전 / N개월 전" 상대 라벨. */
export function agoContactLabel(lastYYYYMMDD: string, today: string): string {
  const days = Math.max(0, diffDays(lastYYYYMMDD, today));
  if (days === 0) return '오늘 연락';
  if (days < 30) return `${days}일 전 연락`;
  return `${Math.floor(days / 30)}개월 전 연락`;
}

/** 최근 N주 주간 접촉 횟수 — 상세·다시챙기기의 8주 스파크라인용 (index 0 = 가장 오래된 주). */
export function weeklyActivity(
  interactions: Interaction[],
  today: string,
  weeks = 8,
): number[] {
  const buckets = new Array(weeks).fill(0);
  for (const x of interactions) {
    const d = diffDays(x.date, today); // 오늘과의 일수 차 (미래면 음수)
    if (d < 0) continue;
    const w = Math.floor(d / 7); // 0 = 이번 주
    if (w >= weeks) continue;
    buckets[weeks - 1 - w] += 1; // 최신 주가 오른쪽
  }
  return buckets;
}

export function computeOverdue(persons: Person[], interactions: Interaction[], today: string): Overdue[] {
  const lastByPerson = lastContactMap(persons, interactions);
  const out: Overdue[] = [];
  for (const p of persons) {
    const last = lastByPerson.get(p.id)!;
    const months = Math.floor(diffDays(last, today) / 30);
    if (months >= CLOSENESS_META[p.closeness].pingMonths) out.push({ person: p, months });
  }
  return out.sort((a, b) => b.months - a.months);
}

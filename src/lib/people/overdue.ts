/**
 * 안부 주기 초과 계산 — "오랜만이에요" 목록과 사이드바 배지가 공유.
 */
import { diffDays, toLocalYMD } from '@/types/travel';
import { CLOSENESS_META, type Interaction, type Person } from '@/types/people';

export interface Overdue {
  person: Person;
  months: number;
}

export function computeOverdue(persons: Person[], interactions: Interaction[], today: string): Overdue[] {
  const lastByPerson = new Map<string, string>();
  for (const x of interactions) {
    const prev = lastByPerson.get(x.personId);
    if (!prev || x.date > prev) lastByPerson.set(x.personId, x.date);
  }
  const out: Overdue[] = [];
  for (const p of persons) {
    // createdAt 은 UTC ISO — 로컬 캘린더 날짜로 변환 (프로젝트 로컬 YMD 규칙)
    const last = lastByPerson.get(p.id) ?? toLocalYMD(new Date(p.createdAt));
    const months = Math.floor(diffDays(last, today) / 30);
    if (months >= CLOSENESS_META[p.closeness].pingMonths) out.push({ person: p, months });
  }
  return out.sort((a, b) => b.months - a.months);
}

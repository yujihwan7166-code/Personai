import { describe, it, expect, beforeEach } from 'vitest';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';

describe('habitCheckinStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('toggle — 없을 때 추가 (count=1)', () => {
    habitCheckinStore.toggle('h1', '2026-05-12');
    expect(habitCheckinStore.get('h1', '2026-05-12')?.count).toBe(1);
  });

  it('toggle — 있을 때 삭제 (단일 모드)', () => {
    habitCheckinStore.toggle('h1', '2026-05-12');
    habitCheckinStore.toggle('h1', '2026-05-12');
    expect(habitCheckinStore.get('h1', '2026-05-12')).toBeUndefined();
  });

  it('toggle — timesPerDay 3 인 경우 count 증가 후 max 도달 시 삭제', () => {
    habitCheckinStore.toggle('h2', '2026-05-12', 3); // 1
    habitCheckinStore.toggle('h2', '2026-05-12', 3); // 2
    habitCheckinStore.toggle('h2', '2026-05-12', 3); // 3 (max)
    expect(habitCheckinStore.get('h2', '2026-05-12')?.count).toBe(3);
    habitCheckinStore.toggle('h2', '2026-05-12', 3); // 삭제
    expect(habitCheckinStore.get('h2', '2026-05-12')).toBeUndefined();
  });

  it('setCount — 정확한 값 설정 / 0 = 삭제', () => {
    habitCheckinStore.setCount('h3', '2026-05-12', 5);
    expect(habitCheckinStore.get('h3', '2026-05-12')?.count).toBe(5);
    habitCheckinStore.setCount('h3', '2026-05-12', 0);
    expect(habitCheckinStore.get('h3', '2026-05-12')).toBeUndefined();
  });

  it('byHabit — 날짜순 정렬', () => {
    habitCheckinStore.toggle('h4', '2026-05-15');
    habitCheckinStore.toggle('h4', '2026-05-12');
    habitCheckinStore.toggle('h4', '2026-05-13');
    const list = habitCheckinStore.byHabit('h4');
    expect(list.map((c) => c.date)).toEqual(['2026-05-12', '2026-05-13', '2026-05-15']);
  });

  it('range — 시작·끝 포함', () => {
    habitCheckinStore.toggle('h5', '2026-05-10');
    habitCheckinStore.toggle('h5', '2026-05-15');
    habitCheckinStore.toggle('h5', '2026-05-20');
    const out = habitCheckinStore.range('h5', '2026-05-12', '2026-05-18');
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-05-15');
  });

  it('byDate — 같은 날 여러 habit', () => {
    habitCheckinStore.toggle('h6', '2026-05-12');
    habitCheckinStore.toggle('h7', '2026-05-12');
    habitCheckinStore.toggle('h8', '2026-05-13');
    expect(habitCheckinStore.byDate('2026-05-12')).toHaveLength(2);
  });
});

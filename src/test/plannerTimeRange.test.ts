import { describe, expect, it } from 'vitest';
import { clampStartToLocalDay } from '@/lib/planner/timeRange';

describe('planner time range helpers', () => {
  it('pulls candidates past midnight back to the last instant of the anchor day', () => {
    // 후보가 다음날로 새어나가면 시작을 그 날의 마지막 순간(23:59:59.999) 까지만 끌어내린다.
    // 끝 시각은 호출처가 자유롭게 더하므로 자정을 넘길 수 있다.
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 11, 1, 30, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 60 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(23);
    expect(clamped.getMinutes()).toBe(59);
  });

  it('keeps the start untouched when a long duration would spill past midnight', () => {
    // 22:00 에 4시간 일정을 놓으면 시작은 22:00 그대로 — 끝(=다음날 02:00) 은 호출처가
    // 계산하게 두고, 자정 너머로 흐르는 것을 허용한다.
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 10, 22, 0, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 4 * 60 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(22);
    expect(clamped.getMinutes()).toBe(0);
  });

  it('keeps candidates before the anchor day at day start', () => {
    const anchor = new Date(2026, 5, 10, 0, 0, 0, 0);
    const candidate = new Date(2026, 5, 9, 22, 0, 0, 0);
    const clamped = clampStartToLocalDay(candidate, anchor, 30 * 60_000);

    expect(clamped.getFullYear()).toBe(2026);
    expect(clamped.getMonth()).toBe(5);
    expect(clamped.getDate()).toBe(10);
    expect(clamped.getHours()).toBe(0);
    expect(clamped.getMinutes()).toBe(0);
  });
});

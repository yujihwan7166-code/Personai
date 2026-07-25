import { describe, it, expect } from 'vitest';
import { monthOf, summarizeMonth, categoryTotals, bucketSpent, budgetPace, cardCharge, dailyExpense, buildBriefing, budgetBasis, shiftMonth } from '@/lib/ledger/stats';
import { DEFAULT_CATEGORIES, type LedgerEntry } from '@/types/ledger';

const e = (p: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'x', type: 'expense', amount: 0, date: '2026-07-01', categoryId: 'etc', memo: '', createdAt: '', ...p,
});

const ENTRIES: LedgerEntry[] = [
  e({ id: '1', type: 'income', amount: 3000000, date: '2026-07-01' }),
  e({ id: '2', amount: 10000, date: '2026-07-03', categoryId: 'food', method: 'card' }),
  e({ id: '3', amount: 40000, date: '2026-07-10', categoryId: 'food', method: 'card' }),
  e({ id: '4', type: 'transfer', amount: 500000, date: '2026-07-05' }),
  e({ id: '5', amount: 17000, date: '2026-07-15', categoryId: 'subscription' }),
  e({ id: '6', amount: 20000, date: '2026-06-20', categoryId: 'food' }),
];

describe('stats', () => {
  it('monthOf', () => { expect(monthOf('2026-07-21')).toBe('2026-07'); });
  it('summarizeMonth — 이체는 지출·수입 어느 쪽도 아님, 저축률 산출', () => {
    const s = summarizeMonth(ENTRIES, '2026-07');
    expect(s.income).toBe(3000000);
    expect(s.expense).toBe(67000);
    expect(s.transfer).toBe(500000);
    expect(s.net).toBe(3000000 - 67000);
    expect(s.savedRate).toBeCloseTo(500000 / 3000000);
  });
  it('categoryTotals — 지출만, 내림차순', () => {
    const t = categoryTotals(ENTRIES, '2026-07');
    expect(t[0]).toEqual({ categoryId: 'food', total: 50000 });
  });
  it('bucketSpent — 카테고리의 버킷으로 합산', () => {
    const b = bucketSpent(ENTRIES, '2026-07', DEFAULT_CATEGORIES);
    expect(b.variable).toBe(50000);
    expect(b.fixed).toBe(17000);
  });
  it('budgetPace — 월중 추세 투영', () => {
    // 15일까지 15만 썼고 예산 40만, 31일 달 → 예상 31만 (예산 내)
    const p = budgetPace(150000, 400000, 15, 31);
    expect(p.projected).toBe(310000);
    expect(p.over).toBe(false);
  });
  it('cardCharge — 카드 지출만', () => {
    expect(cardCharge(ENTRIES, '2026-07')).toBe(50000);
  });
  it('dailyExpense — 히트맵용 날짜별 합', () => {
    const d = dailyExpense(ENTRIES, '2026-07');
    expect(d['2026-07-03']).toBe(10000);
  });
  it('buildBriefing — 전월 대비 급증 카테고리 언급', () => {
    const lines = buildBriefing(ENTRIES, '2026-07', '2026-06', DEFAULT_CATEGORIES, {}, '2026-07-21');
    expect(lines.join(' ')).toContain('식비');
  });
});

describe('budgetBasis — 예산 근거', () => {
  const C = DEFAULT_CATEGORIES;
  it('shiftMonth 는 연도 경계를 넘는다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('당월은 평균에서 제외한다 (진행 중이라 왜곡)', () => {
    const rows = [
      e({ id: 'a', amount: 300000, date: '2026-04-10', categoryId: 'food' }),
      e({ id: 'b', amount: 300000, date: '2026-05-10', categoryId: 'food' }),
      e({ id: 'c', amount: 300000, date: '2026-06-10', categoryId: 'food' }),
      e({ id: 'd', amount: 10000, date: '2026-07-02', categoryId: 'food' }), // 당월 — 무시돼야
    ];
    const b = budgetBasis(rows, '2026-07', C);
    expect(b.months).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(b.perBucket.variable.avg).toBe(300000);
    expect(b.perBucket.variable.recent).toEqual([300000, 300000, 300000]);
  });

  it('평균 분모는 기록이 있는 달 수 — 2개월만 쓴 사람의 예산을 과소 제안하지 않는다', () => {
    const rows = [
      e({ id: 'a', amount: 200000, date: '2026-05-10', categoryId: 'food' }),
      e({ id: 'b', amount: 400000, date: '2026-06-10', categoryId: 'food' }),
    ];
    const b = budgetBasis(rows, '2026-07', C);
    expect(b.monthsWithData).toBe(2);
    expect(b.perBucket.variable.avg).toBe(300000); // 600000/2 — 3으로 나누면 200000
    expect(b.perBucket.variable.max).toBe(400000);
  });

  it('기록이 없으면 monthsWithData 0 · 평균 0 (0 나눗셈 없음)', () => {
    const b = budgetBasis([], '2026-07', C);
    expect(b.monthsWithData).toBe(0);
    expect(b.perBucket.fixed.avg).toBe(0);
    expect(b.avgIncome).toBe(0);
  });

  it('버킷 귀속과 수입 평균', () => {
    const rows = [
      e({ id: 'a', type: 'income', amount: 3000000, date: '2026-06-01' }),
      e({ id: 'b', amount: 50000, date: '2026-06-05', categoryId: 'subscription' }), // fixed
      e({ id: 'c', amount: 80000, date: '2026-06-07', categoryId: 'event' }),        // irregular
    ];
    const b = budgetBasis(rows, '2026-07', C);
    expect(b.perBucket.fixed.avg).toBe(50000);
    expect(b.perBucket.irregular.avg).toBe(80000);
    expect(b.avgIncome).toBe(3000000);
  });
});

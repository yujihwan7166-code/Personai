import { describe, it, expect } from 'vitest';
import { monthOf, summarizeMonth, categoryTotals, bucketSpent, budgetPace, cardCharge, dailyExpense, buildBriefing } from '@/lib/ledger/stats';
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

/**
 * 가계부 집계 — 전부 순수 함수. 이체는 지출도 수입도 아닌 제3종(저축률의 분자).
 */
import type { BudgetBucket, LedgerBudgets, LedgerCategory, LedgerEntry } from '@/types/ledger';

export const monthOf = (ymdStr: string) => ymdStr.slice(0, 7);
const inMonth = (e: LedgerEntry, month: string) => e.date.startsWith(month);

export interface MonthSummary { income: number; expense: number; transfer: number; net: number; savedRate: number | null; count: number }

export function summarizeMonth(entries: LedgerEntry[], month: string): MonthSummary {
  let income = 0, expense = 0, transfer = 0, count = 0;
  for (const e of entries) {
    if (!inMonth(e, month)) continue;
    count++;
    if (e.type === 'income') income += e.amount;
    else if (e.type === 'transfer') transfer += e.amount;
    else expense += e.amount;
  }
  return { income, expense, transfer, net: income - expense, savedRate: income > 0 ? transfer / income : null, count };
}

export function categoryTotals(entries: LedgerEntry[], month: string): Array<{ categoryId: string; total: number }> {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount);
  }
  return [...m.entries()].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total);
}

export function bucketSpent(entries: LedgerEntry[], month: string, categories: LedgerCategory[]): Record<BudgetBucket, number> {
  const bucketOf = new Map(categories.map((c) => [c.id, c.bucket]));
  const out: Record<BudgetBucket, number> = { fixed: 0, variable: 0, irregular: 0 };
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    out[bucketOf.get(e.categoryId) ?? 'variable'] += e.amount;
  }
  return out;
}

/** 월중 페이스 투영 — "이 속도면 월말 N원". */
export function budgetPace(spent: number, budget: number, dayOfMonth: number, daysInMonth: number) {
  const projected = dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * daysInMonth) : spent;
  return { projected, over: budget > 0 && projected > budget };
}

export function cardCharge(entries: LedgerEntry[], month: string): number {
  return entries.filter((e) => inMonth(e, month) && e.type === 'expense' && e.method === 'card')
    .reduce((s, e) => s + e.amount, 0);
}

/** 히트맵용 — 날짜별 지출 합. */
export function dailyExpense(entries: LedgerEntry[], month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    out[e.date] = (out[e.date] ?? 0) + e.amount;
  }
  return out;
}

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

/**
 * AI 브리핑(규칙기반) — 담백한 사실형 최대 3줄. 잔소리·칭찬·이모지 금지.
 * 규칙: ① 전월 대비 1.5배↑ & 3만원↑ 급증 카테고리 ② 요일 집중(35%↑, 표본 8건↑) ③ 변동비 페이스 초과.
 */
export function buildBriefing(
  entries: LedgerEntry[], month: string, prevMonth: string,
  categories: LedgerCategory[], budgets: LedgerBudgets, todayYmd: string,
): string[] {
  const lines: string[] = [];
  const label = new Map(categories.map((c) => [c.id, c.label]));

  const cur = new Map(categoryTotals(entries, month).map((t) => [t.categoryId, t.total]));
  const prev = new Map(categoryTotals(entries, prevMonth).map((t) => [t.categoryId, t.total]));
  let top: { id: string; ratio: number; diff: number } | null = null;
  for (const [id, total] of cur) {
    const p = prev.get(id) ?? 0;
    if (p <= 0) continue;
    const ratio = total / p, diff = total - p;
    if (ratio >= 1.5 && diff >= 30000 && (!top || diff > top.diff)) top = { id, ratio, diff };
  }
  if (top) lines.push(`${label.get(top.id) ?? top.id}가 지난달의 ${top.ratio.toFixed(1)}배 (${KRW(top.diff)} 증가)`);

  const exp = entries.filter((e) => inMonth(e, month) && e.type === 'expense');
  if (exp.length >= 8) {
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    for (const e of exp) {
      const [y, m, d] = e.date.split('-').map(Number);
      byDay[new Date(y, m - 1, d).getDay()] += e.amount;
      total += e.amount;
    }
    const max = Math.max(...byDay);
    if (total > 0 && max / total >= 0.35) {
      const names = ['일', '월', '화', '수', '목', '금', '토'];
      lines.push(`지출의 ${Math.round((max / total) * 100)}%가 ${names[byDay.indexOf(max)]}요일에 집중`);
    }
  }

  const vb = budgets.variable;
  if (vb && vb > 0) {
    const spent = bucketSpent(entries, month, categories).variable;
    const day = Number(todayYmd.slice(8, 10));
    const [y, m] = month.split('-').map(Number);
    const pace = budgetPace(spent, vb, day, new Date(y, m, 0).getDate());
    if (pace.over) lines.push(`이 속도면 변동비가 월말 ${KRW(pace.projected)} — 예산 ${KRW(vb)} 초과 예상`);
  }

  if (lines.length === 0) {
    const s = summarizeMonth(entries, month);
    lines.push(s.count > 0 ? `이번 달 ${s.count}건 기록 · 지출 ${KRW(s.expense)}` : '이번 달 기록이 아직 없어요');
  }
  return lines.slice(0, 3);
}

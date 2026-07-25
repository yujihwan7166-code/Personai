/**
 * 가계부 집계 — 전부 순수 함수. 이체는 지출도 수입도 아닌 제3종(저축률의 분자).
 */
import { BUCKET_FIXED, BUCKET_IRREGULAR, BUCKET_VARIABLE, type BudgetBucket, type LedgerBudgets, type LedgerCategory, type LedgerEntry } from '@/types/ledger';

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

/**
 * 버킷별 이번 달 지출.
 *
 * 어느 예산으로 셀지는 ①이 건의 bucketId(건별 지정) ②카테고리의 버킷 순으로 정한다.
 * 같은 '식비'라도 친구 만나 쓴 밥값만 유흥비로 세는 게 가능해야 해서 건별이 우선한다.
 * 버킷은 사용자 정의라 키를 미리 알 수 없으므로 나오는 대로 채운다.
 */
export function bucketSpent(
  entries: LedgerEntry[],
  month: string,
  categories: LedgerCategory[],
  /** 아직 지출이 없는 버킷도 0 으로 자리를 잡아둔다 — 없으면 undefined 가 흘러 NaN 이 된다. */
  bucketIds?: string[],
): Record<BudgetBucket, number> {
  const bucketOf = new Map(categories.map((c) => [c.id, c.bucket]));
  const out: Record<BudgetBucket, number> = { fixed: 0, variable: 0, irregular: 0 };
  for (const id of bucketIds ?? []) if (!(id in out)) out[id] = 0;
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    const b = e.bucketId || bucketOf.get(e.categoryId) || 'variable';
    out[b] = (out[b] ?? 0) + e.amount;
  }
  return out;
}

export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export interface BucketBasis {
  avg: number;       // 기록이 있는 달 기준 평균 지출
  max: number;       // 가장 많이 쓴 달
  recent: number[];  // 과거→최근 순 월별 지출
}

export interface BudgetBasis {
  months: string[];        // 기준이 된 달들 (당월 제외 — 진행 중이라 평균을 왜곡)
  perBucket: Record<BudgetBucket, BucketBasis>;
  avgIncome: number;
  monthsWithData: number;  // 0이면 근거 없음 → 제안 숨김
}

/**
 * 예산을 '얼마로 잡을지' 정하기 위한 근거 — 최근 n개월 실적.
 * 당월은 진행 중이라 제외한다. 평균은 기록이 있는 달 수로 나눈다
 * (2개월만 쓴 사람의 평균을 3으로 나누면 실제보다 낮게 나와 예산을 과소 설정하게 된다).
 */
export function budgetBasis(
  entries: LedgerEntry[], month: string, categories: LedgerCategory[], n = 3,
  /** 사용자가 만든 버킷까지 근거를 내야 한다 — 안 넘기면 기본 3종만 계산돼 undefined.avg 로 터진다. */
  bucketIds?: string[],
): BudgetBasis {
  const months = Array.from({ length: n }, (_, i) => shiftMonth(month, -(n - i)));
  const ids = [...new Set([BUCKET_FIXED, BUCKET_VARIABLE, BUCKET_IRREGULAR, ...(bucketIds ?? [])])];
  const spents = months.map((m) => bucketSpent(entries, m, categories, ids));
  const monthsWithData = months.filter((m) => entries.some((e) => e.date.startsWith(m))).length;
  const denom = Math.max(1, monthsWithData);
  const per = (b: BudgetBucket): BucketBasis => {
    const recent = spents.map((s) => s[b] ?? 0);
    return { avg: recent.reduce((s, v) => s + v, 0) / denom, max: Math.max(0, ...recent), recent };
  };
  return {
    months,
    perBucket: Object.fromEntries(ids.map((b) => [b, per(b)])),
    avgIncome: months.reduce((s, m) => s + summarizeMonth(entries, m).income, 0) / denom,
    monthsWithData,
  };
}

/** 월중 페이스 투영 — "이 속도면 월말 N원". 덩어리로 나가는 고정비·비정기에는 쓰지 않는다. */
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

/** 로컬 YMD 이동 — toISOString 금지. */
const shiftYmd = (ymdStr: string, days: number): string => {
  const [y, m, d] = ymdStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

const expenseBetween = (entries: LedgerEntry[], from: string, to: string): number =>
  entries.reduce((s, e) => (e.type === 'expense' && e.date >= from && e.date <= to ? s + e.amount : s), 0);

/**
 * AI 브리핑(규칙기반) — 담백한 사실형 최대 4줄. 잔소리·칭찬·이모지 금지.
 * 규칙: ① 전월 대비 1.5배↑ & 3만원↑ 급증 카테고리 ② 주간 비교(±30%↑) ③ 요일 집중(35%↑, 표본 8건↑)
 *      ④ 변동비 페이스 초과 ⑤ 무지출일(월 5일 경과 후).
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

  // 주간 비교 — 최근 7일 vs 그 전 7일 (뱅크샐러드 금융비서의 주간 리포트 경량판)
  const thisWeek = expenseBetween(entries, shiftYmd(todayYmd, -6), todayYmd);
  const lastWeek = expenseBetween(entries, shiftYmd(todayYmd, -13), shiftYmd(todayYmd, -7));
  if (lastWeek > 0 && thisWeek > 0) {
    const r = thisWeek / lastWeek;
    if (r >= 1.3) lines.push(`최근 7일 지출 ${KRW(thisWeek)} — 지난주보다 ${Math.round((r - 1) * 100)}% 증가`);
    else if (r <= 0.7) lines.push(`최근 7일 지출 ${KRW(thisWeek)} — 지난주보다 ${Math.round((1 - r) * 100)}% 감소`);
  }

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

  // 무지출일 — 월 5일 이상 경과 시에만 (담백한 팩트, 스트릭 아님)
  if (todayYmd.startsWith(month)) {
    const elapsed = Number(todayYmd.slice(8, 10));
    if (elapsed >= 5) {
      const spentDays = new Set(exp.filter((e) => e.date <= todayYmd).map((e) => e.date)).size;
      const noSpend = elapsed - spentDays;
      if (noSpend >= 1) lines.push(`이번 달 무지출일 ${noSpend}일 (${elapsed}일 중)`);
    }
  }

  if (lines.length === 0) {
    const s = summarizeMonth(entries, month);
    lines.push(s.count > 0 ? `이번 달 ${s.count}건 기록 · 지출 ${KRW(s.expense)}` : '이번 달 기록이 아직 없어요');
  }
  return lines.slice(0, 4);
}

/**
 * 예산 — "이번 달 얼마로 잡을까?"에 답하는 계획 화면.
 *
 * 확인(지금 얼마 썼나)은 대시보드가 맡고, 여기서는 지난 실적을 근거로 금액을 정한다.
 * 위계: 합계(테두리 없는 큰 숫자 + 배분 막대) > 버킷 3행 > 카테고리 한도(선택).
 * 한 행은 왼쪽 [무엇인가·현황] → 오른쪽 [근거 → 결론(금액)] 으로 읽힌다.
 *
 * 페이스 투영은 변동비에만 — 고정비(월세)·비정기(경조사)는 특정일에 덩어리로 나가
 * 일할 계산이 성립하지 않는다.
 */
import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { budgetBasis, bucketSpent, budgetPace, categoryTotals, monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { cn } from '@/lib/utils';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const BUCKETS: BudgetBucket[] = ['fixed', 'variable', 'irregular'];

/** 같은 남색 계열의 명도 차 — 팔레트를 벗어나지 않으면서 세 몫을 구분한다. */
const TINT: Record<BudgetBucket, string> = {
  fixed: 'hsl(var(--ledger-navy))',
  variable: 'hsl(var(--ledger-navy) / 0.58)',
  irregular: 'hsl(var(--ledger-navy) / 0.28)',
};

const withCommas = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
};
const toNumber = (raw: string) => {
  const n = Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};
const roundToThousand = (n: number) => Math.round(n / 1000) * 1000;

const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, catBudgets, categories } = data;
  const [draft, setDraft] = useState<Record<BudgetBucket, string>>(() => ({
    fixed: budgets.fixed ? budgets.fixed.toLocaleString('ko-KR') : '',
    variable: budgets.variable ? budgets.variable.toLocaleString('ko-KR') : '',
    irregular: budgets.irregular ? budgets.irregular.toLocaleString('ko-KR') : '',
  }));
  const [addCat, setAddCat] = useState('');
  const [addAmount, setAddAmount] = useState('');

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const basis = useMemo(() => budgetBasis(entries, month, categories), [entries, month, categories]);
  const catSpent = useMemo(
    () => new Map(categoryTotals(entries, month).map((t) => [t.categoryId, t.total])),
    [entries, month],
  );
  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const commit = (next: Record<BudgetBucket, string>) => {
    ledgerStore.setBudgets({
      fixed: toNumber(next.fixed), variable: toNumber(next.variable), irregular: toNumber(next.irregular),
    });
  };
  const applySuggestion = (b: BudgetBucket, value: number) => {
    const next = { ...draft, [b]: value.toLocaleString('ko-KR') };
    setDraft(next);
    commit(next);
  };

  const planned = BUCKETS.reduce((s, b) => s + (budgets[b] ?? 0), 0);
  const leftover = basis.avgIncome - planned;
  const hasBasis = basis.monthsWithData > 0;

  const limits = Object.entries(catBudgets).filter(([id]) => catOf.has(id));
  const addable = categories.filter((c) => !(c.id in catBudgets));

  const addLimit = () => {
    const amt = toNumber(addAmount);
    const id = addCat || addable[0]?.id;
    if (!id || !amt) return;
    ledgerStore.setCatBudget(id, amt);
    setAddCat(''); setAddAmount('');
  };

  return (
    <div className="space-y-6 pb-32">
      {/* ── 합계 · 배분 ── */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-[13px] font-medium text-muted-foreground">이번 달 예산 합계</h3>
          <span className="text-[28px] font-bold leading-none tabular-nums">{planned > 0 ? KRW(planned) : '—'}</span>
          {basis.avgIncome > 0 && planned > 0 && (
            <span className="text-[12.5px] text-muted-foreground">
              평균 수입의 <b className="text-foreground tabular-nums">{Math.round((planned / basis.avgIncome) * 100)}%</b>
              {leftover >= 0
                ? <> · 남는 <b className="tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(leftover)}</b>은 저축 몫</>
                : <> · 수입보다 <b className="tabular-nums text-[hsl(var(--ledger-red))]">{KRW(-leftover)}</b> 많음</>}
            </span>
          )}
        </div>

        {planned > 0 && (
          <>
            <div className="mt-3.5 flex h-3 max-w-[760px] gap-1 overflow-hidden rounded-full">
              {BUCKETS.map((b) => {
                const v = budgets[b] ?? 0;
                if (v <= 0) return null;
                return <div key={b} className="h-full rounded-full" title={`${BUCKET_META[b].label} ${KRW(v)}`}
                  style={{ width: `${(v / planned) * 100}%`, background: TINT[b] }} />;
              })}
            </div>
            {/* 범례 — 색만으로는 무엇이 무엇인지 알 수 없다 */}
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {BUCKETS.map((b) => {
                const v = budgets[b] ?? 0;
                if (v <= 0) return null;
                return (
                  <span key={b} className="inline-flex items-center gap-1.5 text-[12px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: TINT[b] }} />
                    {BUCKET_META[b].label}
                    <b className="tabular-nums">{KRW(v)}</b>
                    <span className="tabular-nums text-muted-foreground">{Math.round((v / planned) * 100)}%</span>
                  </span>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── 버킷 3행 ── */}
      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
        {BUCKETS.map((b) => {
          const budget = budgets[b];
          const s = spent[b];
          const bb = basis.perBucket[b];
          const suggestion = hasBasis && bb.avg > 0 ? roundToThousand(bb.avg) : null;
          const scale = Math.max(1, ...bb.recent, budget ?? 0);
          const pace = b === 'variable' && budget ? budgetPace(s, budget, dayOfMonth, daysInMonth) : null;

          return (
            <div key={b} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[hsl(var(--hairline))] px-5 py-4 last:border-b-0">
              <div className="min-w-[180px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: TINT[b] }} />
                  <h3 className="text-[14.5px] font-bold">{BUCKET_META[b].label}</h3>
                </div>
                <p className="mt-1 text-[12.5px] tabular-nums">
                  이번 달 {KRW(s)} 사용
                  {budget != null && (
                    budget - s >= 0
                      ? <span className="text-muted-foreground"> · {KRW(budget - s)} 남음</span>
                      : <span className="text-[hsl(var(--ledger-red))]"> · {KRW(s - budget)} 초과</span>
                  )}
                </p>
                {pace?.over && (
                  <p className="mt-0.5 text-[11.5px] tabular-nums text-[hsl(var(--ledger-red))]">이 속도면 월말 {KRW(pace.projected)}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* 근거 — 데이터가 없으면 자리째 비운다(빈 안내문으로 칸을 채우지 않는다) */}
                {hasBasis && (
                  <div className="hidden sm:block">
                    <div className="flex items-end gap-1" style={{ height: 30 }}>
                      {[...bb.recent, s].map((v, i) => (
                        <div key={i} title={i === bb.recent.length ? `이번 달 ${KRW(v)}` : `${Number(basis.months[i].slice(5, 7))}월 ${KRW(v)}`}
                          className="w-2.5 rounded-t"
                          style={{
                            height: `${Math.max(3, (v / scale) * 100)}%`,
                            background: i === bb.recent.length ? 'hsl(var(--ledger-navy))' : 'hsl(var(--ledger-navy) / 0.24)',
                          }} />
                      ))}
                    </div>
                    <p className="mt-1 text-right text-[10.5px] tabular-nums text-muted-foreground">평균 {KRW(bb.avg)}</p>
                  </div>
                )}

                <div className="flex flex-col items-end gap-1.5">
                  <div className="relative">
                    <input
                      value={draft[b]} inputMode="numeric" placeholder="월 예산" aria-label={`${BUCKET_META[b].label} 월 예산`}
                      onChange={(ev) => setDraft((d) => ({ ...d, [b]: withCommas(ev.target.value) }))}
                      onBlur={() => commit(draft)}
                      className="w-40 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-2 pl-3 pr-7 text-right text-[15px] font-semibold tabular-nums outline-none focus:border-[hsl(var(--ledger-navy))]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">원</span>
                  </div>
                  {suggestion !== null && suggestion !== budget && (
                    <button type="button" onClick={() => applySuggestion(b, suggestion)}
                      className="rounded-full border border-[hsl(var(--ledger-navy)/0.35)] px-2.5 py-1 text-[11.5px] font-semibold text-[hsl(var(--ledger-navy))] transition-colors hover:bg-[hsl(var(--ledger-navy)/0.08)]">
                      평균 {KRW(suggestion)}로
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 카테고리 한도(선택) — 버킷만으로 모자랄 때 따로 걸어두는 상한 ── */}
      <section>
        <div className="mb-2 flex items-baseline gap-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">카테고리 한도</h3>
          <span className="text-[11.5px] text-muted-foreground">필요한 것만 골라서</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
          {limits.map(([id, limit]) => {
            const c = catOf.get(id)!;
            const used = catSpent.get(id) ?? 0;
            const over = used > limit;
            return (
              <div key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[hsl(var(--hairline))] px-5 py-3 last:border-b-0">
                <span className="min-w-[120px] text-[13.5px]">{c.emoji} {c.label}</span>
                <div className="h-1.5 min-w-[100px] flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className={cn('h-full rounded-full', over ? 'bg-[hsl(var(--ledger-red))]' : 'bg-[hsl(var(--ledger-navy))]')}
                    style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
                </div>
                <span className={cn('text-[12.5px] tabular-nums', over ? 'text-[hsl(var(--ledger-red))]' : 'text-muted-foreground')}>
                  {KRW(used)} / {KRW(limit)}
                </span>
                <button type="button" aria-label={`${c.label} 한도 삭제`} onClick={() => ledgerStore.setCatBudget(id, undefined)}
                  className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {addable.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-5 py-3">
              <select value={addCat || addable[0].id} onChange={(e) => setAddCat(e.target.value)} aria-label="한도를 걸 카테고리" className={field}>
                {addable.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <input
                value={addAmount} inputMode="numeric" placeholder="한도(원)" aria-label="한도 금액"
                onChange={(e) => setAddAmount(withCommas(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLimit(); } }}
                className={cn(field, 'w-36 text-right tabular-nums')}
              />
              <button type="button" onClick={addLimit}
                className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
                <Plus className="h-3.5 w-3.5" /> 추가
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

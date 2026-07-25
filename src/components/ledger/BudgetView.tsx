/**
 * 예산 — "이번 달 얼마로 잡을까?"에 답하는 계획 화면.
 *
 * 역할 분리: 지금 얼마나 썼는지 '확인'은 대시보드 예산 페이스 카드가 맡는다.
 * 여기서는 지난 실적을 근거로 금액을 정하고, 수입 대비 배분을 본다.
 *
 * 위계: 합계(테두리 없는 큰 숫자) > 버킷 3행(한 장의 카드).
 * 버킷을 카드 3장으로 쪼개면 서로 독립돼 보인다 — 합계를 이루는 항목이므로 행으로 묶는다.
 * 한 행은 왼쪽부터 [무엇인가] [지난 실적=근거] [얼마로 정할까=결정] 순서로 읽힌다.
 *
 * 페이스 투영은 변동비에만 쓴다 — 고정비(월세·통신)와 비정기(경조사)는
 * 특정 날짜에 덩어리로 나가서 일할 계산이 성립하지 않는다.
 */
import { useMemo, useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { budgetBasis, bucketSpent, budgetPace, monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { cn } from '@/lib/utils';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const BUCKETS: BudgetBucket[] = ['fixed', 'variable', 'irregular'];

const withCommas = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
};
const toNumber = (raw: string) => {
  const n = Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};
/** 제안값은 천 원 단위로 다듬는다 — 517,340원 같은 숫자를 그대로 권하지 않는다. */
const roundToThousand = (n: number) => Math.round(n / 1000) * 1000;

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories } = data;
  const [draft, setDraft] = useState<Record<BudgetBucket, string>>(() => ({
    fixed: budgets.fixed ? budgets.fixed.toLocaleString('ko-KR') : '',
    variable: budgets.variable ? budgets.variable.toLocaleString('ko-KR') : '',
    irregular: budgets.irregular ? budgets.irregular.toLocaleString('ko-KR') : '',
  }));

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const basis = useMemo(() => budgetBasis(entries, month, categories), [entries, month, categories]);

  /** 세 버킷을 한 번에 쓴다 — 부분 저장하면 나머지가 지워진다. */
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

  return (
    <div className="space-y-5 pb-32">
      {/* ── 합계 — 카드가 아니라 마스트헤드의 연장. 아래 카드와 위계를 벌린다 ── */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-[13px] font-medium text-muted-foreground">이번 달 예산 합계</h3>
          <span className="text-[27px] font-bold leading-none tabular-nums">{planned > 0 ? KRW(planned) : '—'}</span>
        </div>

        {planned > 0 && (
          <div className="mt-3 flex h-2 max-w-[720px] gap-0.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
            {BUCKETS.map((b, i) => {
              const v = budgets[b] ?? 0;
              if (v <= 0) return null;
              return (
                <div key={b} title={`${BUCKET_META[b].label} ${KRW(v)}`}
                  style={{ width: `${(v / Math.max(planned, basis.avgIncome || planned)) * 100}%`, opacity: 1 - i * 0.26 }}
                  className="h-full bg-[hsl(var(--ledger-navy))]" />
              );
            })}
          </div>
        )}

        <p className="mt-2 max-w-[720px] text-[12.5px] leading-relaxed text-muted-foreground">
          {basis.avgIncome > 0 && planned > 0 ? (
            <>
              최근 {basis.monthsWithData}개월 평균 수입 <b className="text-foreground tabular-nums">{KRW(basis.avgIncome)}</b>의{' '}
              <b className="text-foreground tabular-nums">{Math.round((planned / basis.avgIncome) * 100)}%</b>
              {leftover >= 0
                ? <> · 나머지 <b className="tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(leftover)}</b>은 저축·투자로 돌릴 몫이에요</>
                : <> · 평균 수입보다 <b className="tabular-nums text-[hsl(var(--ledger-red))]">{KRW(-leftover)}</b> 많아요</>}
            </>
          ) : planned > 0 ? '수입을 기록하면 수입 대비 배분 비율도 함께 보여줘요.'
            : '아래에서 버킷별 금액을 정하면 합계와 배분이 여기 모여요.'}
        </p>
      </section>

      {/* ── 버킷 3행 — 한 장의 카드. 합계를 이루는 항목이라 카드를 쪼개지 않는다 ── */}
      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
        {BUCKETS.map((b) => {
          const budget = budgets[b];
          const s = spent[b];
          const bb = basis.perBucket[b];
          const suggestion = hasBasis && bb.avg > 0 ? roundToThousand(bb.avg) : null;
          const scale = Math.max(1, ...bb.recent, budget ?? 0);
          const pace = b === 'variable' && budget ? budgetPace(s, budget, dayOfMonth, daysInMonth) : null;

          return (
            <div key={b}
              className="grid grid-cols-1 gap-4 border-b border-[hsl(var(--hairline))] p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:px-5">
              {/* ① 무엇인가 */}
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold">{BUCKET_META[b].label}</h3>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ')}
                </p>
                <p className="mt-1.5 text-[12.5px] tabular-nums">
                  이번 달 {KRW(s)} 사용
                  {budget != null && (
                    budget - s >= 0
                      ? <span className="text-muted-foreground"> · {KRW(budget - s)} 남음</span>
                      : <span className="text-[hsl(var(--ledger-red))]"> · {KRW(s - budget)} 초과</span>
                  )}
                </p>
                {pace?.over && (
                  <p className="mt-0.5 text-[11.5px] tabular-nums text-[hsl(var(--ledger-red))]">
                    이 속도면 월말 {KRW(pace.projected)}
                  </p>
                )}
              </div>

              {/* ② 근거 — 지난 달 실적. '감'이 아니라 기록으로 정하게 한다 */}
              <div className="sm:w-[132px]">
                {hasBasis ? (
                  <>
                    <div className="flex items-end gap-1" style={{ height: 34 }}>
                      {bb.recent.map((v, i) => (
                        <div key={basis.months[i]} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex w-full flex-1 items-end">
                            <div className="w-full rounded-t bg-[hsl(var(--ledger-navy)/0.26)]" title={KRW(v)}
                              style={{ height: `${Math.max(3, (v / scale) * 100)}%` }} />
                          </div>
                          <span className="text-[9.5px] tabular-nums text-muted-foreground">{Number(basis.months[i].slice(5, 7))}월</span>
                        </div>
                      ))}
                      <div className="mb-4 w-px self-stretch bg-[hsl(var(--hairline))]" />
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-1 items-end">
                          <div className="w-full rounded-t bg-[hsl(var(--ledger-navy))]" title={`이번 달 ${KRW(s)}`}
                            style={{ height: `${Math.max(3, (s / scale) * 100)}%` }} />
                        </div>
                        <span className="text-[9.5px] font-semibold tabular-nums">이달</span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">평균 {KRW(bb.avg)}</p>
                  </>
                ) : (
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">지난 달 기록이 쌓이면<br />실제 쓴 만큼을 제안해요</p>
                )}
              </div>

              {/* ③ 얼마로 정할까 — 이 행의 결론 */}
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <div className="relative">
                  <input
                    value={draft[b]} inputMode="numeric" placeholder="월 예산" aria-label={`${BUCKET_META[b].label} 월 예산`}
                    onChange={(ev) => setDraft((d) => ({ ...d, [b]: withCommas(ev.target.value) }))}
                    onBlur={() => commit(draft)}
                    className="w-40 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-2 pl-3 pr-7 text-right text-[15px] font-semibold tabular-nums outline-none focus:border-[hsl(var(--ledger-navy))]"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">원</span>
                </div>
                <button
                  type="button" onClick={() => suggestion !== null && applySuggestion(b, suggestion)}
                  disabled={suggestion === null || suggestion === budget}
                  className={cn('rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                    suggestion === null || suggestion === budget
                      ? 'invisible'
                      : 'border-[hsl(var(--ledger-navy)/0.35)] text-[hsl(var(--ledger-navy))] hover:bg-[hsl(var(--ledger-navy)/0.08)]')}>
                  평균 {suggestion !== null ? KRW(suggestion) : ''}로
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <p className="max-w-[720px] text-[12px] leading-relaxed text-muted-foreground">
        버킷 3개면 충분해요 — 카테고리마다 예산을 쪼개면 관리 부담만 늘어요.
        입력 칸에서 포커스를 빼면 자동 저장되고, 지금 얼마나 썼는지는 대시보드에서 한눈에 볼 수 있어요.
      </p>
    </div>
  );
}

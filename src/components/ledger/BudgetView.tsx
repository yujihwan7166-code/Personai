/**
 * 예산 — Monarch식 3버킷(고정/변동/비정기). 버킷별 월 예산 입력 + 이번 달 사용 현황.
 */
import { useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { bucketSpent, budgetPace, monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { cn } from '@/lib/utils';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories } = data;
  const [draft, setDraft] = useState<Record<BudgetBucket, string>>({
    fixed: budgets.fixed ? String(budgets.fixed) : '',
    variable: budgets.variable ? String(budgets.variable) : '',
    irregular: budgets.irregular ? String(budgets.irregular) : '',
  });

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const save = () => {
    const toNum = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
    ledgerStore.setBudgets({ fixed: toNum(draft.fixed), variable: toNum(draft.variable), irregular: toNum(draft.irregular) });
  };

  return (
    <div className="max-w-[560px] space-y-4 pb-32">
      {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => {
        const budget = budgets[b];
        const s = spent[b];
        const pace = budget ? budgetPace(s, budget, dayOfMonth, daysInMonth) : null;
        const catNames = categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ');
        return (
          <section key={b} className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-[14.5px] font-bold">{BUCKET_META[b].label}</h3>
              <span className="text-[12px] text-muted-foreground">{BUCKET_META[b].desc}</span>
            </div>
            <p className="mb-3 text-[11.5px] text-muted-foreground">포함 카테고리: {catNames}</p>
            <div className="flex items-center gap-2">
              <input
                value={draft[b]} inputMode="numeric" placeholder="월 예산(원)" aria-label={`${BUCKET_META[b].label} 월 예산`}
                onChange={(ev) => setDraft((d) => ({ ...d, [b]: ev.target.value }))}
                onBlur={save}
                className="w-40 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] tabular-nums outline-none focus:border-[hsl(var(--ledger-navy))]"
              />
              <span className="text-[13px] tabular-nums text-muted-foreground">이번 달 {KRW(s)} 사용</span>
            </div>
            {budget && pace && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className={cn('h-full rounded-full', pace.over ? 'bg-[hsl(var(--ledger-red))]' : 'bg-[hsl(var(--ledger-navy))]')}
                    style={{ width: `${Math.min(100, Math.round((s / budget) * 100))}%` }} />
                </div>
                <p className={cn('mt-1.5 text-[12px] tabular-nums', pace.over ? 'text-[hsl(var(--ledger-red))]' : 'text-muted-foreground')}>
                  이 속도면 월말 {KRW(pace.projected)} {pace.over ? `— 예산 ${KRW(budget)} 초과 예상` : `(예산 ${KRW(budget)})`}
                </p>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        예산은 버킷 3개면 충분해요 — 카테고리별로 쪼개는 예산은 관리 부담만 늘려요. 입력 칸에서 포커스를 빼면 자동 저장됩니다.
      </p>
    </div>
  );
}

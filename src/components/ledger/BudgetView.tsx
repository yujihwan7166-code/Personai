/**
 * 예산 — 시안 Ledger.dc.html '예산' 화면 그대로.
 * 배분 막대(고정/변동/비정기 3색) + 버킷 3행(진행바 · 달력 마커 · 입력 · 지난달/+5%/천원).
 */
import { useMemo, useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { budgetBasis, bucketSpent, monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { C, KRW } from './theme';

const BUCKETS: BudgetBucket[] = ['fixed', 'variable', 'irregular'];
/** 시안 배분 막대 3색. */
const ALLOC: Record<BudgetBucket, string> = { fixed: C.navy, variable: C.navyMid, irregular: C.navyPale };

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories } = data;
  const [draft, setDraft] = useState<Record<BudgetBucket, string>>(() => ({
    fixed: budgets.fixed ? String(budgets.fixed) : '',
    variable: budgets.variable ? String(budgets.variable) : '',
    irregular: budgets.irregular ? String(budgets.irregular) : '',
  }));

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const leftDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);

  const basis = useMemo(() => budgetBasis(entries, month, categories), [entries, month, categories]);

  const commit = (next: Record<BudgetBucket, string>) => {
    const num = (s: string) => { const n = Number(s.replace(/[^\d]/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
    ledgerStore.setBudgets({ fixed: num(next.fixed), variable: num(next.variable), irregular: num(next.irregular) });
  };
  const setValue = (b: BudgetBucket, v: number) => {
    const next = { ...draft, [b]: String(Math.max(0, Math.round(v))) };
    setDraft(next); commit(next);
  };

  const planned = BUCKETS.reduce((s, b) => s + (budgets[b] ?? 0), 0);
  const pctOf = (b: BudgetBucket) => (planned > 0 ? Math.round(((budgets[b] ?? 0) / planned) * 100) : 0);
  const afterBudget = basis.avgIncome - planned;

  const smallBtn: React.CSSProperties = {
    height: 28, border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff',
    fontSize: 11, fontWeight: 600, color: C.ink4, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>예산</h1>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>
            버킷 3개{basis.avgIncome > 0 && planned > 0 && ` · 수입의 ${Math.round((planned / basis.avgIncome) * 100)}%`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{KRW(planned)}</span>
          <span style={{ fontSize: 14, fontWeight: 650, color: C.ink4 }}>원</span>
        </div>
      </div>

      {/* 배분 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14.5, fontWeight: 650 }}>배분</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>
            {basis.avgIncome > 0 ? `수입 ${KRW(basis.avgIncome)}원 기준` : '수입 기록 없음'}
          </span>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: C.track }}>
          {BUCKETS.map((b) => <div key={b} style={{ width: `${pctOf(b)}%`, background: ALLOC[b] }} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {BUCKETS.map((b) => (
            <span key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.ink3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: ALLOC[b] }} />
              {BUCKET_META[b].label} {pctOf(b)}%
            </span>
          ))}
          <span style={{ flex: 1 }} />
          {basis.avgIncome > 0 && (
            <span style={{ fontSize: 12, fontWeight: 650, color: afterBudget >= 0 ? C.green : C.red }}>
              {afterBudget >= 0 ? `남는 돈 ${KRW(afterBudget)}원` : `수입 초과 ${KRW(-afterBudget)}원`}
            </span>
          )}
        </div>
      </div>

      {/* 버킷 3행 */}
      {BUCKETS.map((b) => {
        const limit = budgets[b] ?? 0;
        const used = spent[b];
        const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
        const over = limit > 0 && used > limit;
        const avg = basis.monthsWithData > 0 ? Math.round(basis.perBucket[b].avg / 1000) * 1000 : 0;
        return (
          <div key={b} className="flex-col sm:flex-row"
            style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{BUCKET_META[b].label}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>
                  {categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ position: 'relative', height: 8, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, pct)}%`, background: over ? C.red : C.navy, borderRadius: 999 }} />
                  <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${monthPct}%`, width: 1.5, background: '#C0BCB1' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ color: C.ink3 }}>{KRW(used)}원 사용 · {pct}%</span>
                  <span style={{ color: over ? C.red : C.muted }}>
                    {over ? `${KRW(used - limit)}원 초과` : `${KRW(limit - used)}원 남음`} · 하루 {KRW(Math.floor(Math.max(0, limit - used) / leftDays / 100) * 100)}원
                  </span>
                </div>
              </div>
            </div>

            <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', border: `1px solid ${C.lineInput}`, borderRadius: 10, background: C.cardAlt }}>
                <input
                  type="number" value={draft[b]} aria-label={`${BUCKET_META[b].label} 월 예산`}
                  onChange={(e) => setDraft((d) => ({ ...d, [b]: e.target.value }))}
                  onBlur={() => commit(draft)}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 19, fontWeight: 700, textAlign: 'right', color: C.ink, fontVariantNumeric: 'tabular-nums' }}
                />
                <span style={{ fontSize: 13, fontWeight: 650, color: C.muted }}>원</span>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button type="button" disabled={avg <= 0} onClick={() => setValue(b, avg)}
                  style={{ ...smallBtn, flex: 1, opacity: avg > 0 ? 1 : 0.45, cursor: avg > 0 ? 'pointer' : 'default' }}>
                  지난달 {avg > 0 ? KRW(avg) : '—'}
                </button>
                <button type="button" onClick={() => setValue(b, (limit || avg) * 1.05)} style={{ ...smallBtn, width: 40 }}>+5%</button>
                <button type="button" onClick={() => setValue(b, Math.round((limit || avg) / 1000) * 1000)} style={{ ...smallBtn, width: 44 }}>천원</button>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 12, lineHeight: 1.6, color: C.muted2, padding: '0 2px' }}>
        입력하면 자동 저장돼요. 지난달 기록을 근거로 제안값을 보여줍니다.
      </div>
    </div>
  );
}

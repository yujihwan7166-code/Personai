/**
 * 고정지출 — 매달 자동으로 나가는 돈의 현황판.
 *
 * 메인은 '이번 달 얼마나 빠져나갔나' 진행 상황(예산 페이스 카드와 같은 문법:
 * 이름 + 진행바 + 나간금액/전체). 규칙 등록은 그 아래로 내린다 —
 * 등록은 가끔 하고, 보는 건 자주 하니까.
 *
 * 나갔는지 판정은 lastPostedMonth 로 한다. postDueRecurring 이 마운트 시
 * 도래분을 자동 기록하므로, 이번 달로 갱신됐으면 실제로 내역에 들어간 것이다.
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf } from '@/lib/ledger/stats';
import type { EntryType, RecurringRule } from '@/types/ledger';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';
const card = 'rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]';

export function RecurringView({ data }: { data: LedgerData }) {
  const { recurring, categories, settings } = data;
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [categoryId, setCategoryId] = useState('subscription');
  const [type, setType] = useState<EntryType>('expense');
  const [billingDay, setBillingDay] = useState(settings.cardBillingDay ? String(settings.cardBillingDay) : '');

  const today = todayKey();
  const month = monthOf(today);
  const dayOfMonth = Number(today.slice(8, 10));
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();

  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const view = useMemo(() => {
    const active = recurring.filter((r) => r.active);
    const out = active.filter((r) => r.type === 'expense');
    const income = active.filter((r) => r.type === 'income');
    const done = (r: RecurringRule) => r.lastPostedMonth === month;

    const total = out.reduce((s, r) => s + r.amount, 0);
    const paid = out.filter(done).reduce((s, r) => s + r.amount, 0);
    const rest = out.filter((r) => !done(r)).sort((a, b) => a.day - b.day);

    // 카테고리별 — 보내준 카드와 같은 문법으로 묶는다
    const byCat = new Map<string, { total: number; paid: number }>();
    for (const r of out) {
      const cur = byCat.get(r.categoryId) ?? { total: 0, paid: 0 };
      cur.total += r.amount;
      if (done(r)) cur.paid += r.amount;
      byCat.set(r.categoryId, cur);
    }

    // 결제일 리듬 — 날짜별 합계
    const perDay = new Map<number, number>();
    for (const r of out) perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.amount);

    return {
      out, income, done, total, paid, rest,
      cats: [...byCat.entries()].sort((a, b) => b[1].total - a[1].total),
      perDay,
      dayMax: Math.max(1, ...perDay.values()),
      subscription: out.filter((r) => r.categoryId === 'subscription').reduce((s, r) => s + r.amount, 0),
      incomeTotal: income.reduce((s, r) => s + r.amount, 0),
    };
  }, [recurring, month]);

  const add = () => {
    const amt = Number(amount.replace(/,/g, ''));
    const d = Number(day);
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0 || !Number.isFinite(d)) return;
    ledgerStore.addRecurring({
      label: label.trim(), amount: Math.round(amt), type,
      categoryId: type === 'expense' ? categoryId : 'etc',
      day: Math.min(28, Math.max(1, Math.round(d))),
    });
    setLabel(''); setAmount(''); setDay('1');
  };

  const pct = view.total > 0 ? Math.round((view.paid / view.total) * 100) : 0;

  return (
    <div className="space-y-6 pb-32">
      {/* ══ 메인 — 이번 달 진행 ══ */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-[13px] font-medium text-muted-foreground">이번 달 고정지출</h3>
          <span className="text-[28px] font-bold leading-none tabular-nums">{KRW(view.total)}</span>
          {view.total > 0 && (
            <span className="text-[12.5px] text-muted-foreground">
              <b className="tabular-nums text-foreground">{KRW(view.paid)}</b> 나감 · 남은 {view.rest.length}건{' '}
              <b className="tabular-nums text-foreground">{KRW(view.total - view.paid)}</b>
            </span>
          )}
        </div>

        {view.total > 0 && (
          <>
            <div className="mt-3.5 h-3 max-w-[760px] overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div className="h-full rounded-full bg-[hsl(var(--ledger-navy))] transition-[width]" style={{ width: `${pct}%` }} />
            </div>

            {/* 결제일 리듬 — 언제 몰려 나가는지 */}
            <div className="mt-4 max-w-[760px]">
              <div className="flex items-end gap-[2px]" style={{ height: 30 }}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const amt = view.perDay.get(d) ?? 0;
                  const isToday = d === dayOfMonth;
                  return (
                    <div key={d} className="flex flex-1 items-end self-stretch"
                      title={amt > 0 ? `${d}일 · ${KRW(amt)}` : `${d}일`}>
                      <div className="w-full rounded-t"
                        style={{
                          height: amt > 0 ? `${Math.max(14, (amt / view.dayMax) * 100)}%` : '4px',
                          background: amt > 0
                            ? (d <= dayOfMonth ? 'hsl(var(--ledger-navy))' : 'hsl(var(--ledger-navy) / 0.4)')
                            : 'hsl(var(--hairline))',
                          outline: isToday ? '1.5px solid hsl(var(--ledger-red))' : undefined,
                          outlineOffset: isToday ? '1px' : undefined,
                        }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10.5px] tabular-nums text-muted-foreground">
                <span>1일</span><span>오늘 {dayOfMonth}일</span><span>{daysInMonth}일</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ══ 카테고리별 — 보내준 카드 문법 ══ */}
      {view.cats.length > 0 && (
        <section className={cn(card, 'p-4')}>
          {view.cats.map(([cid, v]) => {
            const c = catOf.get(cid);
            const p = v.total > 0 ? (v.paid / v.total) * 100 : 0;
            return (
              <div key={cid} className="mb-3.5 last:mb-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium">{c ? `${c.emoji} ${c.label}` : cid}</span>
                  <span className="tabular-nums text-muted-foreground">{KRW(v.paid)} / {KRW(v.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className="h-full rounded-full bg-[hsl(var(--ledger-navy))]" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ══ 한눈에 — 연간 환산·구독·고정수입 ══ */}
      {(view.total > 0 || view.incomeTotal > 0) && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: '연간 환산', v: KRW(view.total * 12), sub: '지금 규칙 그대로 1년' },
            { k: '구독', v: KRW(view.subscription), sub: view.subscription > 0 ? `연 ${KRW(view.subscription * 12)}` : '등록 없음' },
            { k: '고정수입', v: view.incomeTotal > 0 ? KRW(view.incomeTotal) : '—', sub: '월급 등 자동 기록' },
            { k: '남은 건수', v: `${view.rest.length}건`, sub: view.rest[0] ? `다음 ${view.rest[0].day}일 ${view.rest[0].label}` : '이번 달 끝' },
          ].map((s) => (
            <div key={s.k} className={cn(card, 'p-3.5')}>
              <p className="text-[11.5px] text-muted-foreground">{s.k}</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums">{s.v}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </section>
      )}

      {/* ══ 규칙 목록 ══ */}
      <section className={cn(card, 'overflow-hidden')}>
        {recurring.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">등록된 고정지출이 없어요</p>}
        {recurring.map((r) => {
          const paid = r.active && r.type === 'expense' && view.done(r);
          return (
            <div key={r.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-4 py-3 last:border-b-0">
              <button
                type="button" role="switch" aria-checked={r.active} aria-label={`${r.label} 활성`}
                onClick={() => ledgerStore.updateRecurring(r.id, { active: !r.active })}
                className={cn('h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors', r.active ? 'bg-[hsl(var(--ledger-navy))]' : 'bg-[hsl(var(--muted))]')}
              >
                <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', r.active && 'translate-x-4')} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-[13.5px]', !r.active && 'text-muted-foreground line-through')}>{r.label}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  매달 {r.day}일 · {r.type === 'income' ? '수입' : catOf.get(r.categoryId)?.label ?? r.categoryId}
                </p>
              </div>
              {r.active && r.type === 'expense' && (
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  paid ? 'bg-[hsl(var(--ledger-navy)/0.12)] text-[hsl(var(--ledger-navy))]' : 'bg-[hsl(var(--muted))] text-muted-foreground')}>
                  {paid ? '나감' : `${r.day}일 예정`}
                </span>
              )}
              <span className={cn('shrink-0 tabular-nums text-[13.5px] font-semibold', r.type === 'income' && 'text-[hsl(var(--ledger-navy))]')}>
                {r.type === 'income' ? '+' : ''}{KRW(r.amount)}
              </span>
              <button type="button" aria-label="삭제" onClick={() => ledgerStore.removeRecurring(r.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </section>

      {/* ══ 등록 ══ */}
      <section className={cn(card, 'p-4')}>
        <h3 className="mb-3 text-[14px] font-bold">반복 규칙 추가</h3>
        <div className="mb-2 flex gap-1.5">
          {([['expense', '고정지출'], ['income', '고정수입 (월급 등)']] as const).map(([t, tl]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors',
                type === t
                  ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-semibold text-[hsl(var(--ledger-navy))]'
                  : 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground')}>
              {tl}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름 (예: 넷플릭스)" className={cn(field, 'min-w-[140px] max-w-[240px] flex-1')} aria-label="이름" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액" className={cn(field, 'w-28 text-right tabular-nums')} aria-label="금액" />
          <select value={day} onChange={(e) => setDay(e.target.value)} className={field} aria-label="결제일">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
          </select>
          {type === 'expense' && (
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field} aria-label="카테고리">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          )}
          <button type="button" onClick={add} className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> 추가
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">채팅에 "넷플 17000 매달"이라고 적어도 등록을 제안해줘요.</p>
      </section>

      <section className={cn(card, 'p-4')}>
        <h3 className="mb-2 text-[14px] font-bold">카드 결제일 (선택)</h3>
        <div className="flex items-center gap-2">
          <input value={billingDay} inputMode="numeric" placeholder="예: 25" aria-label="카드 결제일"
            onChange={(e) => setBillingDay(e.target.value)}
            onBlur={() => {
              const d = Number(billingDay);
              ledgerStore.setSettings({ ...settings, cardBillingDay: Number.isFinite(d) && d >= 1 && d <= 31 ? Math.round(d) : undefined });
            }}
            className={cn(field, 'w-24')} />
          <span className="text-[12.5px] text-muted-foreground">대시보드 "이번 달 카드 사용" 옆에 표시돼요</span>
        </div>
      </section>
    </div>
  );
}

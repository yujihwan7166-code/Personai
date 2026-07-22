/**
 * 고정지출 — 반복 규칙 목록 + 추가. 매달 day 일에 자동 기록(useLedger 마운트 시 소급).
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore } from '@/services/ledgerStore';
import type { EntryType } from '@/types/ledger';

const KRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function RecurringView({ data }: { data: LedgerData }) {
  const { recurring, categories, settings } = data;
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [categoryId, setCategoryId] = useState('subscription');
  const [type, setType] = useState<EntryType>('expense');
  const [billingDay, setBillingDay] = useState(settings.cardBillingDay ? String(settings.cardBillingDay) : '');

  const add = () => {
    const amt = Number(amount.replace(/,/g, ''));
    const d = Number(day);
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0 || !Number.isFinite(d)) return;
    ledgerStore.addRecurring({ label: label.trim(), amount: Math.round(amt), type, categoryId: type === 'expense' ? categoryId : 'etc', day: Math.min(28, Math.max(1, Math.round(d))) });
    setLabel(''); setAmount(''); setDay('1');
  };

  const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="max-w-[560px] space-y-4 pb-32">
      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
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
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름 (예: 넷플릭스)" className={cn(field, 'min-w-[140px] flex-1')} aria-label="이름" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액" className={cn(field, 'w-28')} aria-label="금액" />
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
        <p className="mt-2 text-[11.5px] text-muted-foreground">채팅에 "넷플 17000 매달"이라고 적어도 등록을 제안해줘요. 매달 지정일에 자동으로 내역에 기록됩니다.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
        {recurring.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">등록된 고정지출이 없어요</p>}
        {recurring.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-4 py-3 last:border-b-0">
            <button
              type="button" role="switch" aria-checked={r.active} aria-label={`${r.label} 활성`}
              onClick={() => ledgerStore.updateRecurring(r.id, { active: !r.active })}
              className={cn('h-5 w-9 rounded-full p-0.5 transition-colors', r.active ? 'bg-[hsl(var(--ledger-navy))]' : 'bg-[hsl(var(--muted))]')}
            >
              <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', r.active && 'translate-x-4')} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[13.5px]', !r.active && 'text-muted-foreground line-through')}>{r.label}</p>
              <p className="text-[11.5px] text-muted-foreground">매달 {r.day}일 · {r.type === 'income' ? '수입' : categories.find((c) => c.id === r.categoryId)?.label ?? r.categoryId}</p>
            </div>
            <span className={cn('tabular-nums text-[13.5px] font-semibold', r.type === 'income' && 'text-[hsl(var(--ledger-navy))]')}>{r.type === 'income' ? '+' : ''}{KRW(r.amount)}</span>
            <button type="button" aria-label="삭제" onClick={() => ledgerStore.removeRecurring(r.id)}
              className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
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

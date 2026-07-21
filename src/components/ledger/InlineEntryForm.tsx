/**
 * 인라인 상세 입력 — 채팅바 '상세' 버튼으로 채팅바 위에 떠오르는 정밀 폼.
 * AI·파서를 전혀 거치지 않고 필드 그대로 저장한다. (모달 아님 — 흐름이 안 끊김)
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type EntryType, type LedgerCategory, type LedgerEntry, type PayMethod } from '@/types/ledger';

interface Props {
  categories: LedgerCategory[];
  onClose: () => void;
  onSaved: (saved: LedgerEntry[]) => void;
}

export function InlineEntryForm({ categories, onClose, onSaved }: Props) {
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [categoryId, setCategoryId] = useState('etc');
  const [memo, setMemo] = useState('');
  const [method, setMethod] = useState<PayMethod | ''>('');
  const [groupTotal, setGroupTotal] = useState('');

  useEscapeKey(onClose, { evenInInput: true });

  const amt = Number(amount.replace(/,/g, ''));
  const valid = Number.isFinite(amt) && amt > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = (keepOpen: boolean) => {
    if (!valid) return;
    const gt = Number(groupTotal.replace(/,/g, ''));
    const saved = ledgerStore.addEntries([{
      type, amount: Math.round(amt), date, categoryId, memo: memo.trim(),
      method: method || undefined,
      groupTotal: Number.isFinite(gt) && gt > amt ? Math.round(gt) : undefined,
    }]);
    onSaved(saved);
    setAmount(''); setMemo(''); setGroupTotal('');
    if (!keepOpen) onClose();
  };

  const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="ledger-rise mb-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {(Object.keys(TYPE_META) as EntryType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('rounded-lg border px-3 py-1.5 text-[13px] transition-colors',
                type === t
                  ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-semibold text-[hsl(var(--ledger-navy))]'
                  : 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground')}>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" autoFocus
          placeholder="금액(원)" className={cn(field, 'tabular-nums')} aria-label="금액" />
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={field} aria-label="날짜" />
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className={cn(field, 'col-span-2')} aria-label="메모"
          onKeyDown={(e) => { if (e.key === 'Enter') save(true); }} />
      </div>

      {type === 'expense' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
              className={cn('rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                categoryId === c.id
                  ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-medium text-[hsl(var(--ledger-navy))]'
                  : 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground')}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod | '')} className={field} aria-label="결제수단">
          <option value="">결제수단 (선택)</option>
          <option value="card">카드</option>
          <option value="cash">현금</option>
          <option value="account">계좌이체</option>
        </select>
        {type === 'expense' && (
          <input value={groupTotal} onChange={(e) => setGroupTotal(e.target.value)} inputMode="numeric"
            placeholder="더치페이 총액 (선택)" className={cn(field, 'w-40 tabular-nums')} aria-label="더치페이 총액"
            title="여럿이 낸 총액 — 금액 칸엔 내 부담액" />
        )}
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => save(true)} disabled={!valid}
            className={cn('rounded-xl border border-[hsl(var(--ledger-navy)/0.4)] px-3.5 py-2 text-[13px] font-semibold text-[hsl(var(--ledger-navy))] transition-colors hover:bg-[hsl(var(--ledger-navy)/0.08)]', !valid && 'opacity-40')}>
            저장하고 계속
          </button>
          <button type="button" onClick={() => save(false)} disabled={!valid}
            className={cn('rounded-xl bg-[hsl(var(--ledger-navy))] px-4 py-2 text-[13px] font-semibold text-white', !valid && 'opacity-40')}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

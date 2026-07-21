/**
 * 가계부 정식 입력/수정 폼 — 채팅이 안 맞을 때 쓰는 상세 폼.
 * entryId 있으면 수정(카테고리 변경 시 키워드 학습), 없으면 신규.
 */
import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type EntryType, type LedgerCategory, type PayMethod } from '@/types/ledger';

interface Props {
  open: boolean;
  entryId: string | null;   // null = 신규
  categories: LedgerCategory[];
  onClose: () => void;
}

export function EntryFormDialog({ open, entryId, categories, onClose }: Props) {
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [categoryId, setCategoryId] = useState('etc');
  const [memo, setMemo] = useState('');
  const [method, setMethod] = useState<PayMethod | ''>('');
  const [groupTotal, setGroupTotal] = useState('');
  const [origCategory, setOrigCategory] = useState('etc');

  useEffect(() => {
    if (!open) return;
    if (entryId) {
      const e = ledgerStore.listEntries().find((x) => x.id === entryId);
      if (e) {
        setType(e.type); setAmount(String(e.amount)); setDate(e.date);
        setCategoryId(e.categoryId); setOrigCategory(e.categoryId);
        setMemo(e.memo); setMethod(e.method ?? ''); setGroupTotal(e.groupTotal ? String(e.groupTotal) : '');
      }
    } else {
      setType('expense'); setAmount(''); setDate(todayKey()); setCategoryId('etc');
      setOrigCategory('etc'); setMemo(''); setMethod(''); setGroupTotal('');
    }
  }, [open, entryId]);

  if (!open) return null;

  const save = () => {
    const amt = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const gt = Number(groupTotal.replace(/,/g, ''));
    const payload = {
      type, amount: Math.round(amt), date, categoryId, memo: memo.trim(),
      method: method || undefined,
      groupTotal: Number.isFinite(gt) && gt > amt ? Math.round(gt) : undefined,
    };
    if (entryId) ledgerStore.updateEntry(entryId, payload, { learn: categoryId !== origCategory });
    else ledgerStore.addEntries([payload]);
    onClose();
  };

  const remove = () => { if (entryId) { ledgerStore.removeEntry(entryId); onClose(); } };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold">{entryId ? '내역 수정' : '내역 추가'}</h3>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 flex gap-1.5">
          {(Object.keys(TYPE_META) as EntryType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[13px] transition-colors',
                type === t ? 'border-transparent bg-[hsl(var(--ledger-navy))] font-semibold text-white' : 'border-[hsl(var(--input))] text-muted-foreground')}>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액(원)" className={field} aria-label="금액" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={field} aria-label="날짜" />
          </div>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (예: 김밥천국)" className={field} aria-label="메모" />
          {type === 'expense' && (
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                  className={cn('rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    categoryId === c.id ? 'border-transparent bg-[hsl(var(--ledger-navy))] text-white' : 'border-[hsl(var(--input))] text-muted-foreground')}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod | '')} className={field} aria-label="결제수단">
              <option value="">결제수단 (선택)</option>
              <option value="card">카드</option>
              <option value="cash">현금</option>
              <option value="account">계좌이체</option>
            </select>
            {type === 'expense' && (
              <input value={groupTotal} onChange={(e) => setGroupTotal(e.target.value)} inputMode="numeric"
                placeholder="더치페이 총액 (선택)" className={field} aria-label="더치페이 총액" title="여럿이 낸 총액 — 위 금액은 내 부담액" />
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {entryId ? (
            <button type="button" onClick={remove} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-[hsl(var(--ledger-red))] hover:bg-[hsl(var(--ledger-red)/0.08)]">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : <span />}
          <button type="button" onClick={save} className="rounded-xl bg-[hsl(var(--ledger-navy))] px-5 py-2 text-[13.5px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}

/**
 * 가계부 정식 입력/수정 폼 — 채팅이 안 맞을 때 쓰는 상세 폼.
 * entryId 있으면 수정(카테고리 변경 시 키워드 학습), 없으면 신규.
 */
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { compressImage } from '@/lib/journalImage';
import { notify } from '@/lib/notify';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type EntryType, type LedgerBucket, type LedgerCategory, type PayMethod } from '@/types/ledger';
import { KRW, KRWShort, parseAmount } from './theme';

interface Props {
  open: boolean;
  entryId: string | null;   // null = 신규
  categories: LedgerCategory[];
  buckets: LedgerBucket[];
  onClose: () => void;
}

export function EntryFormDialog({ open, entryId, categories, buckets, onClose }: Props) {
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [categoryId, setCategoryId] = useState('etc');
  const [memo, setMemo] = useState('');
  const [method, setMethod] = useState<PayMethod | ''>('');
  const [groupTotal, setGroupTotal] = useState('');
  const [origCategory, setOrigCategory] = useState('etc');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [bucketId, setBucketId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const catBucket = categories.find((c) => c.id === categoryId)?.bucket ?? 'variable';

  useEscapeKey(onClose, { enabled: open, evenInInput: true });

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify.warning('이미지 파일만 넣을 수 있어요'); return; }
    setPhotoBusy(true);
    try {
      const { src } = await compressImage(file);
      setPhoto(src);
    } catch {
      notify.error('사진을 넣지 못했어요');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!open) return;
    if (entryId) {
      const e = ledgerStore.listEntries().find((x) => x.id === entryId);
      if (e) {
        setType(e.type); setAmount(String(e.amount)); setDate(e.date);
        setCategoryId(e.categoryId); setOrigCategory(e.categoryId);
        setMemo(e.memo); setMethod(e.method ?? ''); setGroupTotal(e.groupTotal ? String(e.groupTotal) : '');
        setPhoto(e.photo ?? null); setBucketId(e.bucketId ?? '');
      }
    } else {
      setType('expense'); setAmount(''); setDate(todayKey()); setCategoryId('etc');
      setOrigCategory('etc'); setMemo(''); setMethod(''); setGroupTotal(''); setPhoto(null); setBucketId('');
    }
  }, [open, entryId]);

  if (!open) return null;

  const save = () => {
    const amt = parseAmount(amount) ?? NaN;
    if (!Number.isFinite(amt) || amt <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const gt = parseAmount(groupTotal) ?? NaN;
    const payload = {
      type, amount: Math.round(amt), date, categoryId, memo: memo.trim(),
      method: method || undefined,
      groupTotal: Number.isFinite(gt) && gt > amt ? Math.round(gt) : undefined,
      photo: photo ?? undefined,
      bucketId: bucketId || undefined,
    };
    if (entryId) ledgerStore.updateEntry(entryId, payload, { learn: categoryId !== origCategory });
    else ledgerStore.addEntries([payload]);
    onClose();
  };

  const remove = () => { if (entryId) { ledgerStore.removeEntry(entryId); onClose(); } };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';
  const labelCls = 'mb-1 block text-[11.5px] font-semibold text-muted-foreground';

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

        {/* 전엔 라벨 없는 입력칸이 줄줄이 늘어서 무엇을 적는 칸인지 placeholder 로만 알 수 있었다.
            금액을 주인공으로 세우고 나머지는 라벨을 붙여 위계를 만든다. */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className={labelCls}>금액</span>
              <div className="relative">
                {/* '3만' 처럼 말하는 대로 쳐도 되고 30000 처럼 쳐도 된다. 칸을 벗어나는
                    순간 숫자로 바꿔 콤마를 찍는다 — 0 을 다섯 개 세는 일을 없앤다. */}
                <input value={amount} onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => { const n = parseAmount(amount); if (n !== null) setAmount(KRW(n)); }}
                  inputMode="numeric" placeholder="0 · '3만' 도 돼요"
                  className={cn(field, 'pr-8 text-[19px] font-bold tabular-nums')} aria-label="금액" autoFocus={!entryId} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted-foreground">원</span>
              </div>
              {/* 빠른 키 — 더하기다(덮어쓰기가 아니라). 4,500 에 +1만 은 14,500.
                  카페 5천, 밥 1만처럼 자주 나오는 자릿수를 손으로 세지 않게. */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[1000, 5000, 10000, 50000].map((step) => (
                  <button key={step} type="button"
                    onClick={() => setAmount(KRW((parseAmount(amount) ?? 0) + step))}
                    className="rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.4)] hover:text-foreground">
                    +{KRWShort(step)}
                  </button>
                ))}
                {parseAmount(amount) !== null && (
                  <button type="button" onClick={() => setAmount('')}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
                    지우기
                  </button>
                )}
              </div>
            </label>
            <label className="w-[148px] shrink-0">
              <span className={labelCls}>날짜</span>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={cn(field, 'h-[42px]')} aria-label="날짜" />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>메모</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 김밥천국" className={field} aria-label="메모" />
          </label>

          {type === 'expense' && (
            <div>
              <span className={labelCls}>카테고리</span>
              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                    className={cn('rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                      categoryId === c.id ? 'border-transparent bg-[hsl(var(--ledger-navy))] text-white' : 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground')}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className={labelCls}>결제수단</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod | '')} className={field} aria-label="결제수단">
                <option value="">선택 안 함</option>
                <option value="card">카드</option>
                <option value="cash">현금</option>
                <option value="account">계좌이체</option>
              </select>
            </label>
            {type === 'expense' && (
              <label className="min-w-0 flex-1">
                <span className={labelCls}>더치페이 총액</span>
                <input value={groupTotal} onChange={(e) => setGroupTotal(e.target.value)} inputMode="numeric"
                  placeholder="여럿이 낸 총액" className={field} aria-label="더치페이 총액" title="위 금액은 내 부담액" />
              </label>
            )}
          </div>

          {/* 이 건만 다른 예산으로 — 같은 '식비'라도 친구 만나 쓴 밥값은 유흥비로 세고 싶을 때가 있다.
              비워두면 카테고리가 정한 예산을 따른다. */}
          {type === 'expense' && buckets.length > 0 && (
            <label className="block">
              <span className={labelCls}>이 건을 셀 예산</span>
              <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} className={field} aria-label="이 건을 셀 예산">
                <option value="">카테고리 기본 ({buckets.find((b) => b.id === catBucket)?.label ?? '변동비'})</option>
                {buckets.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
          )}

          {/* 영수증 — 금액만 남기면 나중에 "이게 뭐였더라"가 되는 지출이 있다 */}
          <div>
            <span className={labelCls}>영수증 사진</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
            {photo ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-2">
                <img src={photo} alt="영수증" className="h-12 w-12 rounded-md object-cover" />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-[12.5px] font-semibold text-[hsl(var(--ledger-navy))] hover:underline">바꾸기</button>
                <button type="button" onClick={() => setPhoto(null)} aria-label="사진 제거"
                  className="ml-auto rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--input))] py-2.5 text-[12.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground disabled:opacity-50">
                {photoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {photoBusy ? '넣는 중…' : '사진 첨부 (선택)'}
              </button>
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

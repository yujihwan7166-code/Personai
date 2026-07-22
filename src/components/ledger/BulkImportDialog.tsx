/**
 * 붙여넣기 가져오기 — 카드사·은행 이용내역을 통째로 붙여넣어 일괄 등록.
 * 흐름: 붙여넣기 → 줄 단위 로컬 파싱(AI 미사용) → 미리보기 표(체크·카테고리 수정)
 *      → 기존 내역과 중복(날짜+금액+메모) 자동 체크 해제 → 일괄 등록.
 * 밀린 한 달치가 5분에 복구되는 게 목표.
 */
import { useMemo, useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { parseBulk, type ParsedEntry } from '@/lib/ledger/parse';
import { ledgerStore } from '@/services/ledgerStore';
import { TYPE_META, type LedgerCategory, type LedgerEntry } from '@/types/ledger';

interface Props {
  open: boolean;
  categories: LedgerCategory[];
  entries: LedgerEntry[]; // 중복 감지용 기존 내역
  onClose: () => void;
}

interface Row {
  entry: ParsedEntry;
  checked: boolean;
  dup: boolean;
}

const KRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const dupKey = (e: { date: string; amount: number; memo: string }) => `${e.date}|${e.amount}|${e.memo}`;

export function BulkImportDialog({ open, categories, entries, onClose }: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null); // null = 아직 붙여넣기 단계
  const [failed, setFailed] = useState<string[]>([]);

  useEscapeKey(onClose, { enabled: open, evenInInput: true });

  const existingKeys = useMemo(() => new Set(entries.map(dupKey)), [entries]);

  if (!open) return null;

  const parse = () => {
    const r = parseBulk(text, { today: new Date(), keywordDict: ledgerStore.getKeywordDict() });
    setFailed(r.failed);
    setRows(r.entries.map((entry) => {
      const dup = existingKeys.has(dupKey(entry));
      return { entry, dup, checked: !dup }; // 중복은 기본 체크 해제
    }));
  };

  const register = () => {
    if (!rows) return;
    const picked = rows.filter((r) => r.checked).map((r) => ({
      type: r.entry.type, amount: r.entry.amount, date: r.entry.date,
      categoryId: r.entry.categoryId, memo: r.entry.memo, method: r.entry.method,
    }));
    if (!picked.length) return;
    ledgerStore.addEntries(picked);
    toast(`${picked.length}건을 등록했어요`);
    setText(''); setRows(null); setFailed([]);
    onClose();
  };

  const reset = () => { setRows(null); setFailed([]); };
  const checkedCount = rows?.filter((r) => r.checked).length ?? 0;
  const dupCount = rows?.filter((r) => r.dup).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[640px] flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[16px] font-bold"><ClipboardPaste className="h-4 w-4 text-[hsl(var(--ledger-navy))]" /> 붙여넣기 가져오기</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>

        {rows === null ? (
          <>
            <p className="mb-2 text-[12.5px] leading-relaxed text-muted-foreground">
              카드사 앱·엑셀에서 이용내역을 복사해 그대로 붙여넣으세요. 한 줄 = 한 건, AI 없이 이 기기에서만 읽어요.<br />
              예: <code className="rounded bg-[hsl(var(--muted))] px-1">07.15&nbsp;&nbsp;스타벅스&nbsp;&nbsp;4,500원&nbsp;&nbsp;일시불</code>
            </p>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} autoFocus
              placeholder={'07.01 스타벅스 4,500원\n07.02 김밥천국 8,000원\n07.05 쿠팡 32,900원'}
              className="h-52 w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] p-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-[hsl(var(--ledger-navy))]"
              aria-label="이용내역 붙여넣기"
            />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={parse} disabled={!text.trim()}
                className={cn('rounded-xl bg-[hsl(var(--ledger-navy))] px-5 py-2 text-[13.5px] font-semibold text-white', !text.trim() && 'opacity-40')}>
                읽어보기
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-[12.5px] text-muted-foreground">
              {rows.length}건을 읽었어요{dupCount > 0 && <> · 이미 있는 것 같은 {dupCount}건은 체크를 빼놨어요</>}{failed.length > 0 && <> · 못 읽은 줄 {failed.length}개는 아래에</>}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[hsl(var(--hairline))]">
              {rows.map((r, i) => (
                <div key={i} className={cn('flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-3 py-2 last:border-b-0', !r.checked && 'opacity-45')}>
                  <input type="checkbox" checked={r.checked} aria-label={`${r.entry.memo} 포함`}
                    onChange={() => setRows(rows.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
                    className="h-4 w-4 accent-[hsl(var(--ledger-navy))]" />
                  <span className="w-[74px] shrink-0 text-[12px] tabular-nums text-muted-foreground">{r.entry.date.slice(5)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{r.entry.memo || TYPE_META[r.entry.type].label}{r.dup && <span className="ml-1.5 rounded bg-[hsl(var(--ledger-red)/0.1)] px-1 text-[10.5px] text-[hsl(var(--ledger-red))]">중복?</span>}</span>
                  {r.entry.type === 'expense' ? (
                    <select
                      value={r.entry.categoryId} aria-label="카테고리"
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, entry: { ...x.entry, categoryId: e.target.value } } : x)))}
                      className="shrink-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-1.5 py-1 text-[11.5px] outline-none"
                    >
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                    </select>
                  ) : (
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">{TYPE_META[r.entry.type].label}</span>
                  )}
                  <span className="w-[86px] shrink-0 text-right text-[13px] font-semibold tabular-nums">{TYPE_META[r.entry.type].sign}{KRW(r.entry.amount)}</span>
                </div>
              ))}
              {rows.length === 0 && <p className="py-8 text-center text-[13px] text-muted-foreground">읽을 수 있는 줄이 없었어요</p>}
            </div>
            {failed.length > 0 && (
              <details className="mt-2 text-[11.5px] text-muted-foreground">
                <summary className="cursor-pointer">못 읽은 줄 {failed.length}개 보기</summary>
                <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto font-mono">{failed.map((f, i) => <li key={i} className="truncate">{f}</li>)}</ul>
              </details>
            )}
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-[hsl(var(--muted))]">← 다시 붙여넣기</button>
              <button type="button" onClick={register} disabled={checkedCount === 0}
                className={cn('rounded-xl bg-[hsl(var(--ledger-navy))] px-5 py-2 text-[13.5px] font-semibold text-white', checkedCount === 0 && 'opacity-40')}>
                {checkedCount}건 등록
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 가계부 내역 — 월별 리스트. 행 클릭=수정, 복제=오늘 날짜로(후잉의 duplicate).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPaste, Copy, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth } from '@/lib/ledger/stats';
import { TYPE_META, type EntryType } from '@/types/ledger';

const KRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const dowOf = (date: string) => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

interface EntriesViewProps {
  data: LedgerData;
  onEdit: (id: string) => void;
  initialMonth?: string;
  /** 히트맵 날짜 탭에서 넘어온 경우 — 해당 날짜 그룹으로 스크롤 + 잠깐 하이라이트. */
  focusDate?: string | null;
  onFocusConsumed?: () => void;
  /** 도넛·결산에서 카테고리 클릭으로 넘어온 경우 — 해당 카테고리 필터로 시작. */
  initialCategory?: string | null;
  onOpenImport?: () => void;
}

export function EntriesView({ data, onEdit, initialMonth, focusDate, onFocusConsumed, initialCategory, onOpenImport }: EntriesViewProps) {
  const [month, setMonth] = useState(() => (focusDate ? monthOf(focusDate) : initialMonth ?? monthOf(todayKey())));
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [catFilter, setCatFilter] = useState<string>(initialCategory ?? 'all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<string | null>(focusDate ?? null);
  const focusRef = useRef<HTMLDivElement>(null);
  const { entries, categories } = data;
  const meta = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    if (!highlight) return;
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = window.setTimeout(() => { setHighlight(null); onFocusConsumed?.(); }, 1800);
    return () => window.clearTimeout(t);
  }, [highlight, onFocusConsumed]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  /** 검색어가 있으면 월 제한 없이 전체에서 찾는다 — "그 커피 언제 샀더라"용. */
  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => entries.filter((e) => {
      if (!q && !e.date.startsWith(month)) return false;
      if (filter !== 'all' && e.type !== filter) return false;
      if (catFilter !== 'all' && e.categoryId !== catFilter) return false;
      if (!q) return true;
      const cat = meta.get(e.categoryId);
      return e.memo.toLowerCase().includes(q) || (cat ? cat.label.toLowerCase().includes(q) : false) || e.date.includes(q);
    }),
    [entries, month, filter, catFilter, q, meta],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const e of list) { const arr = m.get(e.date) ?? []; arr.push(e); m.set(e.date, arr); }
    return [...m.entries()];
  }, [list]);
  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);

  return (
    <div className="pb-32">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-[15px] font-bold tabular-nums">{month.replace('-', '. ')}</span>
        <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronRight className="h-4 w-4" /></button>
        <span className="ml-auto text-[12.5px] tabular-nums text-muted-foreground">수입 {KRW(sum.income)} · 지출 {KRW(sum.expense)} · 이체 {KRW(sum.transfer)}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {([['all', '전체'], ['expense', '지출'], ['income', '수입'], ['transfer', '이체']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={cn('rounded-full border px-3 py-1 text-[12.5px] transition-colors',
              filter === k
                ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-medium text-[hsl(var(--ledger-navy))]'
                : 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
        <select
          value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="카테고리 필터"
          className={cn('rounded-full border px-2.5 py-1 text-[12.5px] outline-none',
            catFilter !== 'all'
              ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-medium text-[hsl(var(--ledger-navy))]'
              : 'border-[hsl(var(--input))] bg-[hsl(var(--card))] text-muted-foreground')}
        >
          <option value="all">모든 카테고리</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        {onOpenImport && (
          <button type="button" onClick={onOpenImport}
            className="flex items-center gap-1 rounded-full border border-[hsl(var(--input))] px-3 py-1 text-[12.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground"
            title="카드사·은행 내역을 통째로 붙여넣어 일괄 등록">
            <ClipboardPaste className="h-3.5 w-3.5" /> 가져오기
          </button>
        )}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} aria-label="내역 검색"
            placeholder="메모·카테고리 검색 (전체 기간)"
            className="w-56 rounded-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-1.5 pl-8 pr-7 text-[12.5px] outline-none focus:border-[hsl(var(--ledger-navy))]"
          />
          {query && (
            <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-3 w-3" /></button>
          )}
        </div>
      </div>

      {q && <p className="mb-3 text-[12px] text-muted-foreground">"{query.trim()}" 검색 결과 {list.length}건 — 전체 기간에서 찾았어요</p>}

      {byDate.length === 0 && (
        <p className="py-16 text-center text-[13.5px] text-muted-foreground">
          {q ? '검색 결과가 없어요' : '이 달 기록이 없어요 — 아래 입력바에 "점심 김밥 4500"처럼 적어보세요'}
        </p>
      )}

      {byDate.map(([date, items]) => {
        const dayExpense = items.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
        return (
        <div key={date} ref={date === highlight ? focusRef : undefined}
          className={cn('mb-4 rounded-xl transition-shadow duration-700', date === highlight && 'ring-2 ring-[hsl(var(--ledger-navy)/0.45)] ring-offset-2 ring-offset-[hsl(var(--background))]')}>
          <p className="mb-1.5 flex items-baseline text-[12px] font-semibold text-muted-foreground">
            <span>{q ? `${date} ` : `${Number(date.slice(8, 10))}일 `}{WEEKDAY[dowOf(date)]}요일</span>
            {dayExpense > 0 && <span className="ml-auto font-normal tabular-nums">지출 {KRW(dayExpense)}</span>}
          </p>
          <div className="overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
            {items.map((e) => (
              <div key={e.id} role="button" tabIndex={0} onClick={() => onEdit(e.id)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') onEdit(e.id); }}
                className="group flex cursor-pointer items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-3.5 py-2.5 last:border-b-0 hover:bg-[hsl(var(--surface-3))]">
                <span className="text-[16px]">{meta.get(e.categoryId)?.emoji ?? '📎'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px]">{e.memo || meta.get(e.categoryId)?.label || TYPE_META[e.type].label}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {meta.get(e.categoryId)?.label}{e.method === 'card' ? ' · 카드' : e.method === 'cash' ? ' · 현금' : ''}
                    {e.groupTotal ? ` · 총 ${KRW(e.groupTotal)} 중 내 몫` : ''}
                  </p>
                </div>
                <span className={cn('tabular-nums text-[14px] font-semibold', e.type === 'income' ? 'text-[hsl(var(--ledger-navy))]' : e.type === 'transfer' ? 'text-muted-foreground' : '')}>
                  {TYPE_META[e.type].sign}{e.amount.toLocaleString('ko-KR')}
                </span>
                <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button type="button" aria-label="오늘로 복제" title="오늘 날짜로 복제"
                    onClick={(ev) => { ev.stopPropagation(); ledgerStore.duplicateEntry(e.id, todayKey()); }}
                    className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><Copy className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="삭제"
                    onClick={(ev) => { ev.stopPropagation(); ledgerStore.removeEntry(e.id); }}
                    className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

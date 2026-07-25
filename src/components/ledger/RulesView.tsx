/**
 * 분류 규칙 — "이 말이 있으면 이 카테고리". 한 줄 입력·붙여넣기 파서가 기본 사전보다 먼저 본다.
 * 규칙을 직접 적는 건 귀찮으니, '기타'로 쌓인 내역에서 반복된 말을 골라 제안까지 한다.
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore } from '@/services/ledgerStore';

/** 메모에서 규칙 후보가 될 만한 낱말만. 숫자·한 글자·조사성 토큰 제외. */
const wordsOf = (memo: string): string[] =>
  memo.split(/\s+/)
    .map((w) => w.replace(/[()[\]{}<>,.·:;'"]/g, '').trim())
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !/^\d+\/\d+$/.test(w));

export function RulesView({ data }: { data: LedgerData }) {
  const { dict, categories, entries } = data;
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('food');

  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const rules = useMemo(() => Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0], 'ko')), [dict]);

  /** '기타'로 분류된 지출에서 2번 이상 나온 말 — 이미 규칙이 있는 건 뺀다. */
  const suggestions = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== 'expense' || e.categoryId !== 'etc') continue;
      for (const w of new Set(wordsOf(e.memo))) count.set(w, (count.get(w) ?? 0) + 1);
    }
    return [...count.entries()]
      .filter(([w, n]) => n >= 2 && !(w in dict))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries, dict]);

  const add = () => {
    const k = keyword.trim();
    if (!k) return;
    ledgerStore.setKeywordRule(k, categoryId);
    setKeyword('');
  };

  const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="max-w-[560px] space-y-4 pb-32">
      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
        <h3 className="mb-3 text-[14px] font-bold">규칙 추가</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={keyword} onChange={(e) => setKeyword(e.target.value)} aria-label="키워드"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="키워드 (예: 스벅)" className={cn(field, 'min-w-[140px] flex-1')}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field} aria-label="카테고리">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <button type="button" onClick={add} className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> 추가
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          메모에 이 말이 들어가면 그 카테고리로 적어요. "스벅 4500" 처럼 줄여 쓰는 말을 등록해두면 매번 고칠 일이 없어요.
        </p>
      </section>

      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
          <h3 className="mb-1 text-[14px] font-bold">이런 말이 자주 보여요</h3>
          <p className="mb-3 text-[11.5px] text-muted-foreground">기타로 남은 내역에서 반복된 말이에요. 누르면 위 칸에 담겨요.</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(([w, n]) => (
              <button
                key={w} type="button" onClick={() => setKeyword(w)}
                className="rounded-full border border-[hsl(var(--input))] px-3 py-1 text-[12.5px] transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-[hsl(var(--ledger-navy))]"
              >
                {w} <span className="tabular-nums text-muted-foreground">{n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
        {rules.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">아직 내 규칙이 없어요 — 기본 분류만 쓰는 중이에요</p>
        ) : rules.map(([w, cid]) => {
          const c = catOf.get(cid);
          return (
            <div key={w} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-4 py-3 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{w}</span>
              <span className="shrink-0 text-[12.5px] text-muted-foreground">→ {c ? `${c.emoji} ${c.label}` : cid}</span>
              <button
                type="button" aria-label={`${w} 규칙 삭제`} onClick={() => ledgerStore.removeKeywordRule(w)}
                className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </section>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        규칙은 이미 적어둔 내역을 바꾸지 않아요 — 앞으로 적는 것부터 적용됩니다. 백업에 함께 담겨요.
      </p>
    </div>
  );
}

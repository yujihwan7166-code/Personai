/**
 * 분류 — 무엇으로 나눌지(카테고리)와 어떻게 자동으로 나눌지(규칙)를 한곳에서.
 *
 * 규칙은 파서(parse.ts)가 기본 사전보다 먼저 본다. 규칙을 직접 적는 건 귀찮으니
 * '기타'로 쌓인 내역에서 반복된 말을 후보로 제안하고, 입력 중에는 몇 건이 걸리는지 미리 보여준다.
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore } from '@/services/ledgerStore';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';

/** 메모에서 규칙 후보가 될 만한 낱말만. 숫자·한 글자·회차 표기 제외. */
const wordsOf = (memo: string): string[] =>
  memo.split(/\s+/)
    .map((w) => w.replace(/[()[\]{}<>,.·:;'"]/g, '').trim())
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !/^\d+\/\d+$/.test(w));

const EMOJI_CHOICES = ['🏷️', '🍚', '☕', '🚌', '🛍️', '🏠', '🏥', '🎁', '🎬', '📚', '🐶', '💪', '✈️', '🧴', '🍺', '💸'];

const card = 'rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]';
const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

export function RulesView({ data }: { data: LedgerData }) {
  const { dict, categories, entries } = data;

  // ── 카테고리 만들기 ──
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏷️');
  const [newBucket, setNewBucket] = useState<BudgetBucket>('variable');

  // ── 규칙 만들기 ──
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('food');

  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const rules = useMemo(() => Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0], 'ko')), [dict]);
  const customCats = categories.filter((c) => c.custom);

  /** 카테고리별 사용 건수 — 삭제 영향 범위를 미리 보여준다. */
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1);
    return m;
  }, [entries]);

  /** 입력 중인 키워드가 지금 내역 몇 건에 걸리는지 — 규칙을 짐작이 아니라 확인하고 만들게. */
  const preview = useMemo(() => {
    const k = keyword.trim();
    if (k.length < 1) return null;
    const hit = entries.filter((e) => e.memo.includes(k));
    return { count: hit.length, sample: hit.slice(0, 3).map((e) => e.memo) };
  }, [keyword, entries]);

  const overwriting = keyword.trim() in dict;

  const addCategory = () => {
    const name = newLabel.trim();
    if (!name) return;
    const before = categories.length;
    const created = ledgerStore.addCategory(name, newEmoji, newBucket);
    if (!created) return;
    toast.success(ledgerStore.listCategories().length === before ? `"${created.label}"은 이미 있어요` : `"${created.label}" 카테고리를 만들었어요`);
    setNewLabel('');
  };

  const removeCategory = (id: string, label: string) => {
    const used = usage.get(id) ?? 0;
    if (used > 0 && !window.confirm(`"${label}"을 쓰는 내역 ${used}건이 '기타'로 옮겨져요. 금액과 날짜는 그대로예요. 삭제할까요?`)) return;
    const r = ledgerStore.removeCategory(id);
    if (r) toast.success(r.moved > 0 ? `삭제했어요 — 내역 ${r.moved}건은 기타로 옮겼어요` : '삭제했어요');
  };

  const addRule = () => {
    const k = keyword.trim();
    if (!k) return;
    ledgerStore.setKeywordRule(k, categoryId);
    toast.success(`"${k}" → ${catOf.get(categoryId)?.label ?? categoryId}`);
    setKeyword('');
  };

  const suggestions = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== 'expense' || e.categoryId !== 'etc') continue;
      for (const w of new Set(wordsOf(e.memo))) count.set(w, (count.get(w) ?? 0) + 1);
    }
    return [...count.entries()].filter(([w, n]) => n >= 2 && !(w in dict)).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries, dict]);

  return (
    <div className="space-y-5 pb-32">
      {/* ══ 카테고리 ══ */}
      <section>
        <h3 className="mb-2 text-[13px] font-medium text-muted-foreground">카테고리 — 무엇으로 나눌까</h3>

        <div className={cn(card, 'p-4')}>
          <div className="flex flex-wrap items-center gap-2">
            <select value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} aria-label="이모지"
              className={cn(field, 'w-[68px] text-center text-[16px]')}>
              {EMOJI_CHOICES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input
              value={newLabel} onChange={(e) => setNewLabel(e.target.value)} aria-label="카테고리 이름"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              placeholder="이름 (예: 반려동물)" className={cn(field, 'min-w-[150px] max-w-[240px] flex-1')}
            />
            <select value={newBucket} onChange={(e) => setNewBucket(e.target.value as BudgetBucket)} aria-label="예산 버킷" className={field}>
              {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => (
                <option key={b} value={b}>{BUCKET_META[b].label}</option>
              ))}
            </select>
            <button type="button" onClick={addCategory}
              className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
              <Plus className="h-3.5 w-3.5" /> 추가
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            고른 버킷에 따라 예산에 합산돼요 — {BUCKET_META[newBucket].desc}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const n = usage.get(c.id) ?? 0;
              return (
                <span key={c.id}
                  className={cn('group inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 text-[12.5px]',
                    c.custom ? 'border-[hsl(var(--ledger-navy)/0.35)] pr-1.5' : 'border-[hsl(var(--hairline))] pr-2.5 text-muted-foreground')}>
                  <span>{c.emoji} {c.label}</span>
                  <span className="tabular-nums text-[11px] text-muted-foreground">{n > 0 ? `${n}건` : ''}</span>
                  {c.custom && (
                    <button type="button" aria-label={`${c.label} 삭제`} onClick={() => removeCategory(c.id, c.label)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.12)] hover:text-[hsl(var(--ledger-red))]">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11.5px] text-muted-foreground">
            기본 10종은 지울 수 없어요. 내가 만든 것{customCats.length > 0 ? ` ${customCats.length}개` : ''}만 지울 수 있고,
            지워도 내역은 사라지지 않고 기타로 옮겨져요.
          </p>
        </div>
      </section>

      {/* ══ 자동 분류 규칙 ══ */}
      <section>
        <h3 className="mb-2 text-[13px] font-medium text-muted-foreground">자동 분류 규칙 — 어떻게 알아서 나눌까</h3>

        <div className={cn(card, 'p-4')}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={keyword} onChange={(e) => setKeyword(e.target.value)} aria-label="키워드"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
              placeholder="키워드 (예: 스벅)" className={cn(field, 'min-w-[150px] max-w-[240px] flex-1')}
            />
            <span className="text-[13px] text-muted-foreground">→</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field} aria-label="카테고리">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
            <button type="button" onClick={addRule}
              className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
              <Plus className="h-3.5 w-3.5" /> 추가
            </button>
          </div>

          {/* 미리보기 — 이 규칙이 실제로 뭘 잡는지 만들기 전에 확인 */}
          <p className="mt-2 min-h-[17px] text-[11.5px] text-muted-foreground">
            {overwriting
              ? <span className="text-[hsl(var(--ledger-red))]">이미 있는 키워드예요 — 추가하면 덮어써요</span>
              : preview
                ? preview.count > 0
                  ? <>지금 내역 {preview.count}건과 맞아요 · {preview.sample.join(', ')}{preview.count > 3 && ' …'}</>
                  : '지금 내역 중에는 맞는 게 없어요 — 앞으로 적을 것에 적용돼요'
                : '메모에 이 말이 들어가면 그 카테고리로 적어요. 규칙은 이미 적은 내역을 바꾸지 않아요.'}
          </p>

          {suggestions.length > 0 && (
            <div className="mt-3.5 border-t border-[hsl(var(--hairline))] pt-3">
              <p className="mb-2 text-[11.5px] text-muted-foreground">기타로 남은 내역에서 자주 보이는 말 — 누르면 위 칸에 담겨요</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(([w, n]) => (
                  <button key={w} type="button" onClick={() => setKeyword(w)}
                    className="rounded-full border border-[hsl(var(--input))] px-3 py-1 text-[12.5px] transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-[hsl(var(--ledger-navy))]">
                    {w} <span className="tabular-nums text-muted-foreground">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={cn(card, 'mt-3 overflow-hidden')}>
          {rules.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">아직 내 규칙이 없어요 — 기본 분류만 쓰는 중이에요</p>
          ) : rules.map(([w, cid]) => {
            const c = catOf.get(cid);
            return (
              <div key={w} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-4 py-2.5 last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{w}</span>
                <span className="shrink-0 text-[12.5px] text-muted-foreground">→ {c ? `${c.emoji} ${c.label}` : cid}</span>
                <button type="button" aria-label={`${w} 규칙 삭제`} onClick={() => { ledgerStore.removeKeywordRule(w); toast.success(`"${w}" 규칙을 지웠어요`); }}
                  className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

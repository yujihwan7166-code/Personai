/**
 * 분류 규칙 — 시안 Ledger.dc.html '분류 규칙' 화면 그대로.
 * 규칙 추가줄 + 규칙 목록(N건에 적용) + 이번 달 메모에서 찾은 후보.
 * 규칙은 파서(parse.ts)가 기본 사전보다 먼저 본다.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { C } from './theme';
import { notify } from '@/lib/notify';

/** 메모에서 규칙 후보가 될 만한 낱말만. 숫자·한 글자·회차 표기 제외. */
const wordsOf = (memo: string): string[] =>
  memo.split(/\s+/)
    .map((w) => w.replace(/[()[\]{}<>,.·:;'"]/g, '').trim())
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !/^\d+\/\d+$/.test(w));

const EMOJI_CHOICES = ['🏷️', '🍚', '☕', '🚌', '🛍️', '🏠', '🏥', '🎁', '🎬', '📚', '🐶', '💪', '✈️', '🧴', '🍺', '💸'];

export function RulesView({ data }: { data: LedgerData }) {
  const { dict, categories, entries } = data;
  const [kw, setKw] = useState('');
  const [catId, setCatId] = useState('food');
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏷️');
  const [newBucket, setNewBucket] = useState<BudgetBucket>('variable');
  const [showCats, setShowCats] = useState(false);

  const month = monthOf(todayKey());
  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const rules = useMemo(() => Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0], 'ko')), [dict]);

  /** 규칙이 실제로 몇 건에 걸리는지 — 시안의 'N건에 적용'. */
  const hits = useMemo(() => {
    const m = new Map<string, number>();
    for (const [w] of rules) m.set(w, entries.filter((e) => e.memo.includes(w)).length);
    return m;
  }, [rules, entries]);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1);
    return m;
  }, [entries]);

  /** 이번 달 '기타'로 남은 메모에서 2번 이상 반복된 말. */
  const suggests = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== 'expense' || e.categoryId !== 'etc' || !e.date.startsWith(month)) continue;
      for (const w of new Set(wordsOf(e.memo))) count.set(w, (count.get(w) ?? 0) + 1);
    }
    return [...count.entries()].filter(([w, n]) => n >= 2 && !(w in dict)).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [entries, dict, month]);

  const preview = useMemo(() => {
    const k = kw.trim();
    if (!k) return null;
    return entries.filter((e) => e.memo.includes(k)).length;
  }, [kw, entries]);

  const addRule = (keyword: string, cid: string) => {
    const k = keyword.trim();
    if (!k) return;
    ledgerStore.setKeywordRule(k, cid);
    toast.success(`"${k}" → ${catOf.get(cid)?.label ?? cid}`);
    setKw('');
  };

  const addCategory = () => {
    const name = newLabel.trim();
    if (!name) return;
    const created = ledgerStore.addCategory(name, newEmoji, newBucket);
    if (created) { toast.success(`"${created.label}" 카테고리`); setNewLabel(''); }
  };

  const removeCategory = (id: string, label: string) => {
    const used = usage.get(id) ?? 0;
    if (used > 0 && !window.confirm(`"${label}"을 쓰는 내역 ${used}건이 '기타'로 옮겨져요. 금액과 날짜는 그대로예요. 삭제할까요?`)) return;
    const r = ledgerStore.removeCategory(id);
    if (!r) return;
    notify.success(r.moved > 0 ? `"${label}" 삭제 — 내역 ${r.moved}건은 기타로` : `"${label}"을 지웠어요`, {
      action: { label: '되돌리기', onClick: () => ledgerStore.restoreCategory(r.undo) },
    });
  };

  const field: React.CSSProperties = {
    height: 38, padding: '0 12px', border: `1px solid ${C.lineInput}`, borderRadius: 9,
    background: C.cardAlt, fontSize: 13, outline: 'none', color: C.ink2,
  };
  const cardBox: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 14, background: C.card };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>분류 규칙</h1>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>내 규칙 {rules.length}개 · 기본 분류보다 먼저 적용</div>
        </div>
        <button type="button" onClick={() => setShowCats((s) => !s)}
          style={{ height: 32, padding: '0 13px', border: `1px solid ${C.line}`, borderRadius: 9, background: '#fff', fontSize: 12.5, fontWeight: 600, color: C.ink3, cursor: 'pointer' }}>
          카테고리 {categories.length}개
        </button>
      </div>

      {/* 규칙 추가 */}
      <div style={{ ...cardBox, padding: '16px 18px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="키워드 (예: 스벅)" aria-label="키워드"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(kw, catId); } }}
          style={{ ...field, flex: 1, minWidth: 160 }} />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} aria-label="카테고리"
          style={{ ...field, width: 150, fontWeight: 600, color: C.ink3, cursor: 'pointer' }}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <button type="button" onClick={() => addRule(kw, catId)}
          style={{ height: 38, padding: '0 16px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer' }}>추가</button>
        {preview !== null && (
          <span style={{ width: '100%', fontSize: 11.5, color: kw.trim() in dict ? C.red : C.muted2 }}>
            {kw.trim() in dict ? '이미 있는 키워드 — 추가하면 덮어써요' : `지금 내역 ${preview}건과 맞아요`}
          </span>
        )}
      </div>

      {/* 규칙 목록 */}
      <div style={{ ...cardBox, overflow: 'hidden' }}>
        {rules.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.muted }}>아직 규칙이 없어요 — 기본 분류만 쓰는 중</div>
        ) : rules.map(([w, cid]) => {
          const c = catOf.get(cid);
          return (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${C.lineRow}`, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, minWidth: 120 }}>“{w}”</span>
              <span style={{ fontSize: 12, color: C.muted3 }}>→</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 650, color: C.ink3 }}>
                <span style={{ fontSize: 13 }}>{c?.emoji ?? '📎'}</span>{c?.label ?? cid}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>{hits.get(w) ?? 0}건에 적용</span>
              <button type="button" aria-label={`${w} 규칙 삭제`} onClick={() => { ledgerStore.removeKeywordRule(w); toast.success(`"${w}" 규칙을 지웠어요`); }}
                style={{ width: 26, height: 26, border: `1px solid ${C.lineBtn}`, borderRadius: 7, background: '#fff', fontSize: 11, color: C.muted2, cursor: 'pointer' }}>✕</button>
            </div>
          );
        })}
      </div>

      {/* 후보 */}
      {suggests.length > 0 && (
        <div style={{ border: `1px dashed ${C.tipLine}`, borderRadius: 14, background: C.tipBg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: C.tipInk }}>이번 달 메모에서 찾은 후보</span>
          {suggests.map(([w, n]) => (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink3, flex: 1, minWidth: 150 }}>“{w}” {n}건 → {catOf.get(catId)?.label ?? '식비'}</span>
              <button type="button" onClick={() => addRule(w, catId)}
                style={{ height: 27, padding: '0 11px', border: 'none', borderRadius: 7, background: C.navy, color: '#fff', fontSize: 11.5, fontWeight: 650, cursor: 'pointer' }}>규칙 추가</button>
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 관리 (접이식) */}
      {showCats && (
        <div style={{ ...cardBox, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 650 }}>카테고리</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} aria-label="이모지" style={{ ...field, width: 68, textAlign: 'center', fontSize: 16, cursor: 'pointer' }}>
              {EMOJI_CHOICES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="이름 (예: 반려동물)" aria-label="카테고리 이름"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              style={{ ...field, flex: 1, minWidth: 140 }} />
            <select value={newBucket} onChange={(e) => setNewBucket(e.target.value as BudgetBucket)} aria-label="예산 버킷" style={{ ...field, cursor: 'pointer' }}>
              {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => <option key={b} value={b}>{BUCKET_META[b].label}</option>)}
            </select>
            <button type="button" onClick={addCategory}
              style={{ height: 38, padding: '0 14px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer' }}>추가</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map((c) => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '4px 10px', fontSize: 12.5, border: `1px solid ${c.custom ? C.navy : C.line}`, color: c.custom ? C.ink : C.sub }}>
                {c.emoji} {c.label}
                <span style={{ fontSize: 11, color: C.muted3, fontVariantNumeric: 'tabular-nums' }}>{usage.get(c.id) ?? 0}</span>
                {c.custom && (
                  <button type="button" aria-label={`${c.label} 삭제`} onClick={() => removeCategory(c.id, c.label)}
                    style={{ border: 'none', background: 'transparent', padding: 0, color: C.muted2, cursor: 'pointer', fontSize: 11 }}>✕</button>
                )}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: C.muted2 }}>기본 10종은 지울 수 없어요. 지워도 내역은 사라지지 않고 기타로 옮겨져요.</span>
        </div>
      )}
    </div>
  );
}

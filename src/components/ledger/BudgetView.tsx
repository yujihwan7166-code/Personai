/**
 * 예산 — 시안 Ledger.dc.html '예산' 화면 그대로.
 * 배분 막대(고정/변동/비정기 3색) + 버킷 3행(진행바 · 달력 마커 · 입력 · 지난달/+5%/천원).
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { budgetBasis, bucketSpent, monthOf } from '@/lib/ledger/stats';
import type { BudgetBucket } from '@/types/ledger';
import { C, KRW } from './theme';

/** 배분 막대 색 — 버킷 수가 정해져 있지 않으므로 순서대로 돌려 쓴다. */
const ALLOC_RING = [C.navy, C.navyMid, C.navyPale, '#7C8AA6', '#A9B4C6', '#5C6B86'];

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories, buckets } = data;
  const BUCKETS = useMemo(() => buckets.map((b) => b.id), [buckets]);
  const labelOf = useMemo(() => new Map(buckets.map((b) => [b.id, b.label])), [buckets]);
  const colorOf = (b: BudgetBucket) => ALLOC_RING[Math.max(0, BUCKETS.indexOf(b)) % ALLOC_RING.length];

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [catFor, setCatFor] = useState<string | null>(null); // 카테고리 고르는 중인 버킷

  // 버킷이 늘거나 예산이 바뀌면 입력 초안을 맞춘다
  useEffect(() => {
    setDraft(Object.fromEntries(buckets.map((b) => [b.id, budgets[b.id] ? String(budgets[b.id]) : ''])));
  }, [buckets, budgets]);

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const leftDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);

  const basis = useMemo(() => budgetBasis(entries, month, categories), [entries, month, categories]);

  const commit = (next: Record<string, string>) => {
    const num = (s: string) => { const n = Number((s ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
    ledgerStore.setBudgets(Object.fromEntries(BUCKETS.map((b) => [b, num(next[b])])));
  };
  const setValue = (b: BudgetBucket, v: number) => {
    const next = { ...draft, [b]: String(Math.max(0, Math.round(v))) };
    setDraft(next); commit(next);
  };

  const planned = BUCKETS.reduce((s, b) => s + (budgets[b] ?? 0), 0);
  const spentAll = BUCKETS.reduce((s, b) => s + (spent[b] ?? 0), 0);
  const pctOf = (b: BudgetBucket) => (planned > 0 ? Math.round(((budgets[b] ?? 0) / planned) * 100) : 0);
  const afterBudget = basis.avgIncome - planned;

  const smallBtn: React.CSSProperties = {
    height: 28, border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff',
    fontSize: 11, fontWeight: 600, color: C.ink4, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>예산</h1>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>
            예산 {BUCKETS.length}개{basis.avgIncome > 0 && planned > 0 && ` · 수입의 ${Math.round((planned / basis.avgIncome) * 100)}%`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{KRW(planned)}</span>
          <span style={{ fontSize: 14, fontWeight: 650, color: C.ink4 }}>원</span>
        </div>
      </div>

      {/* 배분 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14.5, fontWeight: 650 }}>배분</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>
            {basis.avgIncome > 0 ? `수입 ${KRW(basis.avgIncome)}원 기준` : '수입 기록 없음'}
          </span>
        </div>
        {/* 계획 배분 */}
        <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: C.track }}>
          {BUCKETS.map((b) => <div key={b} style={{ width: `${pctOf(b)}%`, background: colorOf(b) }} />)}
        </div>

        {/* 실제 쓴 배분 — 계획만 보여주면 '계획대로 되고 있나'는 알 수 없다.
            같은 폭 위에 겹쳐 두면 두 막대의 어긋남이 곧 답이 된다. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: C.track }}>
            {BUCKETS.map((b) => (
              <div key={b} style={{
                width: `${spentAll > 0 ? Math.round(((spent[b] ?? 0) / spentAll) * 100) : 0}%`,
                background: colorOf(b), opacity: 0.55,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: C.muted2 }}>
            <span>위: 계획 · 아래: 실제 쓴 비율</span>
            <span>{spentAll > 0 ? `${KRW(spentAll)}원 씀` : '아직 지출 없음'}</span>
          </div>
        </div>

        {/* 버킷별 한 줄 — 계획액·비중·사용액을 한자리에 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: `1px solid ${C.lineFaint ?? C.line}` }}>
          {BUCKETS.map((b) => {
            const limit = budgets[b] ?? 0;
            const used = spent[b] ?? 0;
            const over = limit > 0 && used > limit;
            return (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: colorOf(b), flexShrink: 0 }} />
                <span style={{ color: C.ink3, minWidth: 62 }}>{labelOf.get(b) ?? b}</span>
                <span style={{ color: C.muted2, fontVariantNumeric: 'tabular-nums' }}>{pctOf(b)}%</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: over ? C.red : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {KRW(used)} / {limit > 0 ? KRW(limit) : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {basis.avgIncome > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 650, color: afterBudget >= 0 ? C.green : C.red }}>
            {afterBudget >= 0 ? `수입에서 남는 돈 ${KRW(afterBudget)}원` : `수입 초과 ${KRW(-afterBudget)}원`}
          </div>
        )}
      </div>

      {/* 버킷 3행 */}
      {BUCKETS.map((b) => {
        const limit = budgets[b] ?? 0;
        const used = spent[b];
        const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
        const over = limit > 0 && used > limit;
        const avg = basis.monthsWithData > 0 ? Math.round(basis.perBucket[b].avg / 1000) * 1000 : 0;
        return (
          <div key={b} className="flex-col sm:flex-row"
            style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{labelOf.get(b) ?? b}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>
                  {categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ') || '아직 붙은 카테고리 없음'}
                </span>
                <button type="button" onClick={() => setCatFor(catFor === b ? null : b)}
                  style={{ ...smallBtn, height: 22, padding: '0 8px', fontSize: 10.5 }}>
                  카테고리
                </button>
                {!buckets.find((x) => x.id === b)?.builtin && (
                  <button type="button" title="이 예산 삭제" aria-label={`${labelOf.get(b)} 삭제`}
                    onClick={() => {
                      if (!window.confirm(`'${labelOf.get(b)}' 예산을 지울까요?\n\n붙어 있던 카테고리와 건별 지정은 변동비로 돌아갑니다.`)) return;
                      ledgerStore.removeBucket(b);
                    }}
                    style={{ ...smallBtn, height: 22, width: 24, padding: 0, color: C.red, display: 'grid', placeItems: 'center' }}>
                    <Trash2 style={{ width: 11, height: 11 }} />
                  </button>
                )}
              </div>

              {/* 어떤 카테고리를 이 예산으로 셀지 — 누르면 그 자리에서 옮겨 붙는다 */}
              {catFor === b && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 10px', borderRadius: 10, background: C.cardAlt, border: `1px solid ${C.line}` }}>
                  {categories.map((c) => {
                    const on = c.bucket === b;
                    return (
                      <button key={c.id} type="button" onClick={() => ledgerStore.setCategoryBucket(c.id, b)}
                        style={{
                          height: 26, padding: '0 9px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                          border: `1px solid ${on ? 'transparent' : C.line}`,
                          background: on ? C.navy : '#fff', color: on ? '#fff' : C.ink4,
                        }}>
                        {c.emoji} {c.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setCatFor(null)} aria-label="닫기"
                    style={{ ...smallBtn, height: 26, width: 26, padding: 0, display: 'grid', placeItems: 'center' }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ position: 'relative', height: 8, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, pct)}%`, background: over ? C.red : C.navy, borderRadius: 999 }} />
                  <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${monthPct}%`, width: 1.5, background: '#C0BCB1' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ color: C.ink3 }}>{KRW(used)}원 사용 · {pct}%</span>
                  <span style={{ color: over ? C.red : C.muted }}>
                    {over ? `${KRW(used - limit)}원 초과` : `${KRW(limit - used)}원 남음`} · 하루 {KRW(Math.floor(Math.max(0, limit - used) / leftDays / 100) * 100)}원
                  </span>
                </div>
              </div>
            </div>

            <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', border: `1px solid ${C.lineInput}`, borderRadius: 10, background: C.cardAlt }}>
                <input
                  type="number" value={draft[b] ?? ''} aria-label={`${labelOf.get(b) ?? b} 월 예산`}
                  onChange={(e) => setDraft((d) => ({ ...d, [b]: e.target.value }))}
                  onBlur={() => commit(draft)}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 19, fontWeight: 700, textAlign: 'right', color: C.ink, fontVariantNumeric: 'tabular-nums' }}
                />
                <span style={{ fontSize: 13, fontWeight: 650, color: C.muted }}>원</span>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button type="button" disabled={avg <= 0} onClick={() => setValue(b, avg)}
                  style={{ ...smallBtn, flex: 1, opacity: avg > 0 ? 1 : 0.45, cursor: avg > 0 ? 'pointer' : 'default' }}>
                  지난달 {avg > 0 ? KRW(avg) : '—'}
                </button>
                <button type="button" onClick={() => setValue(b, (limit || avg) * 1.05)} style={{ ...smallBtn, width: 40 }}>+5%</button>
                <button type="button" onClick={() => setValue(b, Math.round((limit || avg) / 1000) * 1000)} style={{ ...smallBtn, width: 44 }}>천원</button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 새 예산 — 고정비·변동비·비정기 셋으로 안 나눠지는 돈이 있다(유흥비·자기계발·반려동물…) */}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '14px 18px' }}>
          <input
            autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) { if (newName.trim()) ledgerStore.addBucket(newName, ''); setNewName(''); setAdding(false); }
              else if (e.key === 'Escape') { setNewName(''); setAdding(false); }
            }}
            placeholder="예산 이름 (예: 유흥비)"
            style={{ flex: 1, minWidth: 0, height: 36, padding: '0 12px', border: `1px solid ${C.lineInput}`, borderRadius: 9, background: C.cardAlt, fontSize: 13.5, color: C.ink, outline: 'none' }}
          />
          <button type="button" onClick={() => { if (newName.trim()) ledgerStore.addBucket(newName, ''); setNewName(''); setAdding(false); }}
            style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer' }}>
            만들기
          </button>
          <button type="button" onClick={() => { setNewName(''); setAdding(false); }}
            style={{ ...smallBtn, height: 36, padding: '0 12px' }}>취소</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            border: `1px dashed ${C.line}`, borderRadius: 14, background: 'transparent',
            padding: '14px 18px', fontSize: 13, fontWeight: 650, color: C.muted, cursor: 'pointer',
          }}>
          <Plus style={{ width: 14, height: 14 }} /> 새 예산 만들기
        </button>
      )}
    </div>
  );
}

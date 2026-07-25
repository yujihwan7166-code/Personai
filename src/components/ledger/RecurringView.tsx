/**
 * 고정지출 — 시안 Ledger.dc.html '고정지출' 화면 그대로.
 * 고정비 예산 대조 배너 + 표(항목 · 결제일 · 상태 · 금액). 나갔는지는 lastPostedMonth 로 판정.
 */
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf } from '@/lib/ledger/stats';
import type { EntryType } from '@/types/ledger';
import { C, KRW } from './theme';

export function RecurringView({ data }: { data: LedgerData }) {
  const { recurring, categories, budgets, settings } = data;
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [categoryId, setCategoryId] = useState('subscription');
  const [type, setType] = useState<EntryType>('expense');
  const [billingDay, setBillingDay] = useState(settings.cardBillingDay ? String(settings.cardBillingDay) : '');

  const month = monthOf(todayKey());
  const catOf = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const active = recurring.filter((r) => r.active && r.type === 'expense');
  const fixedSum = active.reduce((s, r) => s + r.amount, 0);
  const fixedBudget = budgets.fixed ?? 0;
  const diff = fixedSum - fixedBudget;

  const add = () => {
    const amt = Number(amount.replace(/,/g, ''));
    const d = Number(day);
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0) return;
    ledgerStore.addRecurring({
      label: label.trim(), amount: Math.round(amt), type,
      categoryId: type === 'expense' ? categoryId : 'etc',
      day: Math.min(28, Math.max(1, Math.round(d))),
    });
    setLabel(''); setAmount(''); setDay('1'); setOpen(false);
  };

  const field: React.CSSProperties = {
    height: 38, padding: '0 12px', border: `1px solid ${C.lineInput}`, borderRadius: 9,
    background: C.cardAlt, fontSize: 13, outline: 'none', color: C.ink2,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>고정지출</h1>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>{active.length}개 · 합계 {KRW(fixedSum)}원</div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)}
          style={{ height: 34, padding: '0 14px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 12.5, fontWeight: 650, cursor: 'pointer' }}>
          ＋ 항목 추가
        </button>
      </div>

      {/* 고정비 예산 대조 */}
      {fixedBudget > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 11, flexWrap: 'wrap',
          border: `1px solid ${diff === 0 ? C.okLine : C.tipLine}`, background: diff === 0 ? C.okBg : C.tipBg,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: diff === 0 ? C.greenDot : C.warnDot }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: diff === 0 ? C.okInk : C.tipInk }}>
            {diff === 0
              ? `고정비 예산 ${KRW(fixedBudget)}원과 정확히 맞아요`
              : `고정비 예산 ${KRW(fixedBudget)}원 대비 ${diff > 0 ? '초과' : '여유'}`}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 650, color: diff === 0 ? C.green : diff > 0 ? C.red : C.green, fontVariantNumeric: 'tabular-nums' }}>
            차이 {diff > 0 ? '+' : ''}{KRW(diff)}원
          </span>
        </div>
      )}

      {open && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['expense', '고정지출'], ['income', '고정수입 (월급 등)']] as const).map(([t, tl]) => (
              <button key={t} type="button" onClick={() => setType(t)}
                style={{ height: 30, padding: '0 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${type === t ? C.navy : C.line}`, background: type === t ? C.navSel : '#fff', fontWeight: type === t ? 700 : 550, color: type === t ? C.ink : C.sub }}>
                {tl}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름 (예: 넷플릭스)" aria-label="이름" style={{ ...field, flex: 1, minWidth: 150 }} />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액" aria-label="금액" style={{ ...field, width: 110, textAlign: 'right' }} />
            <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="결제일" style={{ ...field, cursor: 'pointer' }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
            </select>
            {type === 'expense' && (
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="카테고리" style={{ ...field, cursor: 'pointer' }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            )}
            <button type="button" onClick={add}
              style={{ height: 38, padding: '0 16px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer' }}>추가</button>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: C.muted2 }}>채팅에 "넷플 17000 매달"이라고 적어도 등록을 제안해줘요.</p>
        </div>
      )}

      {/* 표 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 34, padding: '0 16px', background: C.head, borderBottom: `1px solid ${C.lineFaint}`, fontSize: 11, fontWeight: 700, color: C.muted3 }}>
          <span style={{ flex: 1 }}>항목</span>
          <span style={{ width: 78 }}>결제일</span>
          <span style={{ width: 82 }}>상태</span>
          <span style={{ width: 96, textAlign: 'right' }}>금액</span>
          <span style={{ width: 26 }} />
        </div>
        {recurring.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.muted }}>등록된 고정지출이 없어요</div>
        )}
        {recurring.map((r) => {
          const paid = r.active && r.type === 'expense' && r.lastPostedMonth === month;
          const status = !r.active ? '중지' : r.type === 'income' ? '수입' : paid ? '나감' : '예정';
          const tone = status === '나감' ? { fg: C.okInk, bg: C.okBg } : status === '중지' ? { fg: C.muted2, bg: C.hoverBtn } : status === '수입' ? { fg: C.green, bg: C.okBg } : { fg: C.sub, bg: C.hoverBtn };
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.lineRow}` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: 9, background: C.chipBg, display: 'grid', placeItems: 'center', fontSize: 14 }}>
                {catOf.get(r.categoryId)?.emoji ?? '🔁'}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => ledgerStore.updateRecurring(r.id, { active: !r.active })}
                  title={r.active ? '중지하기' : '다시 활성'}
                  style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', fontSize: 13.5, fontWeight: 600, color: r.active ? C.ink : C.muted2, textDecoration: r.active ? 'none' : 'line-through', cursor: 'pointer' }}>
                  {r.label}
                </button>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.sub2 }}>{r.type === 'income' ? '수입' : catOf.get(r.categoryId)?.label ?? r.categoryId}</span>
              </span>
              <span style={{ width: 78, fontSize: 12.5, fontWeight: 600, color: C.ink4, fontVariantNumeric: 'tabular-nums' }}>매월 {r.day}일</span>
              <span style={{ width: 82 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: tone.fg, background: tone.bg, padding: '4px 7px', borderRadius: 5 }}>{status}</span>
              </span>
              <span style={{ width: 96, textAlign: 'right', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: r.type === 'income' ? C.green : C.ink }}>
                {KRW(r.amount)}
              </span>
              <button type="button" aria-label={`${r.label} 삭제`} onClick={() => ledgerStore.removeRecurring(r.id)}
                style={{ width: 26, height: 26, border: `1px solid ${C.lineBtn}`, borderRadius: 7, background: '#fff', color: C.muted2, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 650 }}>카드 결제일</span>
        <input value={billingDay} inputMode="numeric" placeholder="예: 25" aria-label="카드 결제일"
          onChange={(e) => setBillingDay(e.target.value)}
          onBlur={() => {
            const d = Number(billingDay);
            ledgerStore.setSettings({ ...settings, cardBillingDay: Number.isFinite(d) && d >= 1 && d <= 31 ? Math.round(d) : undefined });
          }}
          style={{ ...field, width: 90 }} />
        <span style={{ fontSize: 12, color: C.muted2 }}>선택 — 대시보드 카드 사용 옆에 표시돼요</span>
      </div>
    </div>
  );
}

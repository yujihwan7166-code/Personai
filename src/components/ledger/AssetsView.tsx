/**
 * 자산 — 월말 결산 장부의 '잔고' 축. 실시간 시세 없음이 컨셉: 평가액은 수동 갱신,
 * "이번 달 스냅샷 저장"이 순자산 추이의 점을 찍는다.
 */
import { useMemo, useState } from 'react';
import { Camera, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { assetProfit, monthlyDividends, netWorth, sumByKind } from '@/lib/ledger/assetStats';
import { ASSET_KIND_META, type AssetKind, type LedgerAsset } from '@/types/ledger';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const KINDS: AssetKind[] = ['cash', 'invest', 'coin', 'property', 'debt'];

/** 자산 구성 도넛 — DashboardView 도넛과 같은 SVG 기법. */
function KindDonut({ assets }: { assets: LedgerAsset[] }) {
  const data = sumByKind(assets);
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <p className="py-6 text-center text-[13px] text-muted-foreground">자산을 등록하면 구성이 보여요</p>;
  const COLORS = ['hsl(var(--ledger-navy))', 'hsl(var(--ledger-navy)/0.7)', 'hsl(var(--ledger-navy)/0.5)', 'hsl(var(--ledger-navy)/0.32)'];
  const C = 2 * Math.PI * 40;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0">
        {data.map((s, i) => {
          const frac = s.total / total;
          const el = (
            <circle key={s.kind} cx="50" cy="50" r="40" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="14"
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 50 50)" />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {data.map((s, i) => (
          <li key={s.kind} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{ASSET_KIND_META[s.kind].emoji} {ASSET_KIND_META[s.kind].label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{Math.round((s.total / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 배당 캘린더 — 12칸 미니 막대. */
function DividendCalendar({ assets }: { assets: LedgerAsset[] }) {
  const monthly = monthlyDividends(assets);
  const max = Math.max(...monthly);
  const annual = monthly.reduce((s, v) => s + v, 0);
  if (annual === 0) return <p className="py-4 text-center text-[12.5px] text-muted-foreground">자산에 연 배당·지급 월을 적으면 캘린더가 그려져요</p>;
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 72 }}>
        {monthly.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${i + 1}월 ${KRW(v)}`}>
            <div className="w-full rounded-t bg-[hsl(var(--ledger-navy)/0.75)]" style={{ height: max ? `${Math.max(v > 0 ? 6 : 0, (v / max) * 56)}px` : 0 }} />
            <span className="text-[9.5px] text-muted-foreground">{i + 1}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] tabular-nums text-muted-foreground">연 예상 배당 {KRW(annual)} · 월평균 {KRW(annual / 12)}</p>
    </div>
  );
}

interface FormState {
  id: string | null;
  kind: AssetKind; label: string; value: string; qty: string; avgPrice: string;
  annualDividend: string; dividendMonths: string; note: string;
}
const EMPTY: FormState = { id: null, kind: 'cash', label: '', value: '', qty: '', avgPrice: '', annualDividend: '', dividendMonths: '', note: '' };

export function AssetsView({ data }: { data: LedgerData }) {
  const { assets, snapshots } = data;
  const [form, setForm] = useState<FormState | null>(null);
  const nw = useMemo(() => netWorth(assets), [assets]);
  const curMonth = todayKey().slice(0, 7);
  const curSnap = snapshots.find((s) => s.month === curMonth);

  const openNew = (kind: AssetKind) => setForm({ ...EMPTY, kind });
  const openEdit = (a: LedgerAsset) => setForm({
    id: a.id, kind: a.kind, label: a.label, value: String(a.value),
    qty: a.qty ? String(a.qty) : '', avgPrice: a.avgPrice ? String(a.avgPrice) : '',
    annualDividend: a.annualDividend ? String(a.annualDividend) : '',
    dividendMonths: a.dividendMonths?.join(',') ?? '', note: a.note ?? '',
  });

  const save = () => {
    if (!form) return;
    const num = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
    const value = num(form.value);
    if (!form.label.trim() || value === undefined) return;
    const months = form.dividendMonths.split(/[,\s]+/).map(Number).filter((m) => m >= 1 && m <= 12);
    const payload = {
      kind: form.kind, label: form.label.trim(), value,
      qty: form.kind === 'invest' || form.kind === 'coin' ? num(form.qty) : undefined,
      avgPrice: form.kind === 'invest' || form.kind === 'coin' ? num(form.avgPrice) : undefined,
      annualDividend: form.kind === 'invest' ? num(form.annualDividend) : undefined,
      dividendMonths: form.kind === 'invest' && months.length ? months : undefined,
      note: form.note.trim() || undefined,
    };
    if (form.id) ledgerStore.updateAsset(form.id, payload);
    else ledgerStore.addAsset(payload);
    setForm(null);
  };

  const takeSnapshot = () => {
    const s = ledgerStore.upsertSnapshot(curMonth);
    if (s) toast(`${Number(curMonth.slice(5, 7))}월 스냅샷 저장 — 순자산 ${KRW(s.net)}`);
  };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="grid grid-cols-1 gap-4 pb-40 xl:grid-cols-2">
      {/* 순자산 카드 + 스냅샷 */}
      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div><p className="text-[12px] text-muted-foreground">순자산</p><p className="text-[22px] font-bold tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(nw.net)}</p></div>
          <div><p className="text-[12px] text-muted-foreground">자산</p><p className="text-[16px] font-semibold tabular-nums">{KRW(nw.assets)}</p></div>
          <div><p className="text-[12px] text-muted-foreground">부채</p><p className="text-[16px] font-semibold tabular-nums">{nw.debt > 0 ? `-${KRW(nw.debt)}` : '없음'}</p></div>
          <button type="button" onClick={takeSnapshot}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
            <Camera className="h-3.5 w-3.5" /> {Number(curMonth.slice(5, 7))}월 스냅샷 저장
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {curSnap
            ? `이번 달 스냅샷 있음 (순자산 ${KRW(curSnap.net)}) — 평가액을 고친 뒤 다시 누르면 덮어써요`
            : '월말에 평가액을 갱신하고 스냅샷을 저장하면 월 결산의 순자산 추이가 쌓여요'}
        </p>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-muted-foreground">자산 구성</h3>
        <KindDonut assets={assets} />
      </section>
      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-muted-foreground">배당 캘린더</h3>
        <DividendCalendar assets={assets} />
      </section>

      {/* 종류별 목록 */}
      {KINDS.map((kind) => {
        const list = assets.filter((a) => a.kind === kind);
        const meta = ASSET_KIND_META[kind];
        return (
          <section key={kind} className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 xl:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-bold">{meta.emoji} {meta.label}</h3>
              <button type="button" onClick={() => openNew(kind)}
                className="flex items-center gap-1 rounded-lg border border-[hsl(var(--input))] px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground">
                <Plus className="h-3 w-3" /> 추가
              </button>
            </div>
            {list.length === 0
              ? <p className="py-2 text-[12px] text-muted-foreground">{meta.desc}</p>
              : list.map((a) => {
                const p = assetProfit(a);
                return (
                  <div key={a.id} className="group flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] py-2 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">{a.label}{a.note && <span className="ml-1.5 text-[11.5px] text-muted-foreground">{a.note}</span>}</p>
                      {(a.qty || p) && (
                        <p className="text-[11.5px] tabular-nums text-muted-foreground">
                          {a.qty && `${a.qty}주`}{a.avgPrice && ` · 평단 ${a.avgPrice.toLocaleString('ko-KR')}`}
                          {p && <span className={cn('ml-1.5', p.profit >= 0 ? 'text-[hsl(var(--ledger-navy))]' : 'text-[hsl(var(--ledger-red))]')}>
                            {p.profit >= 0 ? '+' : ''}{KRW(p.profit)} ({(p.rate * 100).toFixed(1)}%)
                          </span>}
                        </p>
                      )}
                    </div>
                    <span className={cn('tabular-nums text-[14px] font-semibold', kind === 'debt' && 'text-[hsl(var(--ledger-red))]')}>
                      {kind === 'debt' ? '-' : ''}{KRW(a.value)}
                    </span>
                    <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                      <button type="button" aria-label="수정" onClick={() => openEdit(a)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="삭제" onClick={() => ledgerStore.removeAsset(a.id)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>
                );
              })}
          </section>
        );
      })}

      {/* 자산 폼 */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" onClick={() => setForm(null)}>
          <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold">{form.id ? '자산 수정' : `${ASSET_KIND_META[form.kind].label} 추가`}</h3>
              <button type="button" aria-label="닫기" onClick={() => setForm(null)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="이름 (예: 삼성전자, 주택청약)" className={field} aria-label="이름" />
              <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} inputMode="numeric"
                placeholder={form.kind === 'debt' ? '잔액(원)' : '현재 평가액(원)'} className={field} aria-label="평가액" />
              {(form.kind === 'invest' || form.kind === 'coin') && (
                <div className="flex gap-2">
                  <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} inputMode="decimal" placeholder="수량 (선택)" className={field} aria-label="수량" />
                  <input value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} inputMode="numeric" placeholder="평단 (선택)" className={field} aria-label="평단" />
                </div>
              )}
              {form.kind === 'invest' && (
                <div className="flex gap-2">
                  <input value={form.annualDividend} onChange={(e) => setForm({ ...form, annualDividend: e.target.value })} inputMode="numeric" placeholder="연 배당(원, 선택)" className={field} aria-label="연 배당" />
                  <input value={form.dividendMonths} onChange={(e) => setForm({ ...form, dividendMonths: e.target.value })} placeholder="지급 월 (예: 3,6,9,12)" className={field} aria-label="배당 지급 월" />
                </div>
              )}
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="메모 (선택)" className={field} aria-label="메모" />
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={save} className="rounded-xl bg-[hsl(var(--ledger-navy))] px-5 py-2 text-[13.5px] font-semibold text-white">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

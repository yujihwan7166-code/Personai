/**
 * 월 결산 — 월별 리포트 아카이브. 수입−지출−저축률, 전월 대비 증감 표(후잉 '두 기간 비교'),
 * 카테고리×6개월 피벗, 월별 수입/지출 막대, 순자산 추이(스냅샷), 연간 Wrapped.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { todayKey } from '@/services/ledgerStore';
import { categoryTotals, monthOf, summarizeMonth } from '@/lib/ledger/stats';
import { C as TC } from './theme';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

const shiftMonthStr = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const lastNMonths = (month: string, n: number) =>
  Array.from({ length: n }, (_, i) => shiftMonthStr(month, -(n - 1 - i)));

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4', className)}>
      <h3 className="mb-3 text-[13px] font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** 월별 수입/지출 막대 — 6개월/12개월 토글. */
function MonthlyBars({ data, month, span }: { data: LedgerData; month: string; span: number }) {
  const months = lastNMonths(month, span);
  const sums = months.map((m) => summarizeMonth(data.entries, m));
  const max = Math.max(1, ...sums.flatMap((s) => [s.income, s.expense]));
  return (
    <div className="flex items-end gap-2" style={{ height: 130 }}>
      {months.map((m, i) => (
        <div key={m} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            <div className="w-2/5 rounded-t bg-[hsl(var(--ledger-navy))]" title={`수입 ${KRW(sums[i].income)}`}
              style={{ height: `${(sums[i].income / max) * 100}%` }} />
            <div className="w-2/5 rounded-t bg-[hsl(var(--ledger-navy)/0.35)]" title={`지출 ${KRW(sums[i].expense)}`}
              style={{ height: `${(sums[i].expense / max) * 100}%` }} />
          </div>
          <span className={cn('text-[10px] tabular-nums', m === month ? 'font-bold' : 'text-muted-foreground')}>{Number(m.slice(5, 7))}월</span>
        </div>
      ))}
    </div>
  );
}

/** 순자산 추이 라인 — 스냅샷 기반. */
function NetWorthLine({ data }: { data: LedgerData }) {
  const snaps = data.snapshots;
  if (snaps.length < 2) {
    return <p className="py-6 text-center text-[12.5px] text-muted-foreground">자산 탭에서 월 스냅샷을 2개 이상 저장하면 추이가 그려져요{snaps.length === 1 && ` (현재 ${snaps[0].month} · ${KRW(snaps[0].net)})`}</p>;
  }
  const W = 640, H = 150, PAD = 18;
  const vals = snaps.map((s) => s.net);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (snaps.length - 1);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const line = snaps.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(s.net).toFixed(1)}`).join(' ');
  const area = `${line} L${x(snaps.length - 1).toFixed(1)} ${H - PAD} L${x(0).toFixed(1)} ${H - PAD} Z`;
  const latest = snaps[snaps.length - 1], first = snaps[0];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <path d={area} fill="hsl(var(--ledger-navy))" fillOpacity={0.08} />
        <path d={line} fill="none" stroke="hsl(var(--ledger-navy))" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {snaps.map((s, i) => <circle key={s.month} cx={x(i)} cy={y(s.net)} r={4} fill="hsl(var(--card))" stroke="hsl(var(--ledger-navy))" strokeWidth={2.5} />)}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {snaps.map((s) => <span key={s.month} className="text-[10.5px] tabular-nums text-muted-foreground">{Number(s.month.slice(5, 7))}월</span>)}
      </div>
      <p className="mt-2 text-[12.5px] tabular-nums">
        현재 <b>{KRW(latest.net)}</b>
        <span className={cn('ml-2 text-[11.5px]', latest.net - first.net >= 0 ? 'text-[hsl(var(--ledger-navy))]' : 'text-[hsl(var(--ledger-red))]')}>
          {first.month} 대비 {latest.net - first.net >= 0 ? '+' : ''}{KRW(latest.net - first.net)}
        </span>
      </p>
    </div>
  );
}

/** 연간 Wrapped 모달 — 담백한 팩트만. */
function YearWrapped({ data, year, onClose }: { data: LedgerData; year: number; onClose: () => void }) {
  const label = new Map(data.categories.map((c) => [c.id, `${c.emoji} ${c.label}`]));
  const yearEntries = data.entries.filter((e) => e.date.startsWith(String(year)));
  const stats = useMemo(() => {
    let income = 0, expense = 0, transfer = 0;
    const byCat = new Map<string, number>();
    const byMemo = new Map<string, number>();
    let topDay: { date: string; total: number } | null = null;
    const byDate = new Map<string, number>();
    for (const e of yearEntries) {
      if (e.type === 'income') income += e.amount;
      else if (e.type === 'transfer') transfer += e.amount;
      else {
        expense += e.amount;
        byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
        const w = e.memo.trim().split(/\s+/)[0];
        if (w) byMemo.set(w, (byMemo.get(w) ?? 0) + 1);
        byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
      }
    }
    for (const [date, total] of byDate) if (!topDay || total > topDay.total) topDay = { date, total };
    return {
      income, expense, transfer,
      topCats: [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topWords: [...byMemo.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12),
      topDay, count: yearEntries.length,
    };
  }, [yearEntries]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-6 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[19px] font-bold">{year}년의 돈</h3>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>
        {stats.count === 0 ? <p className="py-8 text-center text-[13.5px] text-muted-foreground">{year}년 기록이 없어요</p> : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-[hsl(var(--surface-3))] p-3.5">
              <div><p className="text-[11.5px] text-muted-foreground">수입</p><p className="text-[15px] font-bold tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(stats.income)}</p></div>
              <div><p className="text-[11.5px] text-muted-foreground">지출</p><p className="text-[15px] font-bold tabular-nums">{KRW(stats.expense)}</p></div>
              <div><p className="text-[11.5px] text-muted-foreground">저축·투자</p><p className="text-[15px] font-bold tabular-nums">{KRW(stats.transfer)}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-muted-foreground">가장 많이 쓴 곳</p>
              {stats.topCats.map(([id, total], i) => (
                <div key={id} className="flex items-center gap-2 py-1 text-[13.5px]">
                  <span className="w-4 text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
                  <span>{label.get(id) ?? id}</span>
                  <span className="ml-auto tabular-nums">{KRW(total)}</span>
                </div>
              ))}
            </div>
            {stats.topWords.length > 0 && (
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-muted-foreground">자주 등장한 키워드</p>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  {stats.topWords.map(([w, n]) => (
                    <span key={w} className="text-[hsl(var(--ledger-navy))]" style={{ fontSize: `${Math.min(21, 11 + n * 1.6)}px`, opacity: 0.55 + Math.min(0.45, n * 0.07) }}>{w}</span>
                  ))}
                </div>
              </div>
            )}
            {stats.topDay && (
              <p className="text-[12.5px] text-muted-foreground">
                가장 크게 쓴 날: <b className="text-foreground">{stats.topDay.date}</b> · {KRW(stats.topDay.total)}
              </p>
            )}
            <p className="text-[11.5px] text-muted-foreground">총 {stats.count}건 기록 · 기록에 없는 돈은 없는 셈 치는 담백한 결산이에요</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportView({ data, onGoAssets }: { data: LedgerData; onGoAssets?: () => void }) {
  const [month, setMonth] = useState(() => monthOf(todayKey()));
  const [barSpan, setBarSpan] = useState<6 | 12>(6);
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);
  const prev = shiftMonthStr(month, -1);
  const label = new Map(data.categories.map((c) => [c.id, `${c.emoji} ${c.label}`]));

  const sum = useMemo(() => summarizeMonth(data.entries, month), [data.entries, month]);
  const compare = useMemo(() => {
    const cur = new Map(categoryTotals(data.entries, month).map((t) => [t.categoryId, t.total]));
    const pr = new Map(categoryTotals(data.entries, prev).map((t) => [t.categoryId, t.total]));
    const ids = new Set([...cur.keys(), ...pr.keys()]);
    return [...ids].map((id) => ({ id, cur: cur.get(id) ?? 0, prev: pr.get(id) ?? 0, diff: (cur.get(id) ?? 0) - (pr.get(id) ?? 0) }))
      .sort((a, b) => b.cur - a.cur);
  }, [data.entries, month, prev]);

  const pivotMonths = lastNMonths(month, 6);
  const pivot = useMemo(() => {
    const perMonth = pivotMonths.map((m) => new Map(categoryTotals(data.entries, m).map((t) => [t.categoryId, t.total])));
    const totals = new Map<string, number>();
    perMonth.forEach((mm) => mm.forEach((v, k) => totals.set(k, (totals.get(k) ?? 0) + v)));
    const cats = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
    return { cats, perMonth };
  }, [data.entries, pivotMonths]);

  return (
    <div className="space-y-[14px] pb-40">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>월 결산</h1>
          <div style={{ fontSize: 12.5, color: TC.muted, fontWeight: 500 }}>{month.replace('-', '. ')} · {sum.count}건 집계</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${TC.line}`, borderRadius: 9, background: '#fff', padding: 2 }}>
            <button type="button" aria-label="이전 달" onClick={() => setMonth(shiftMonthStr(month, -1))}
              style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, color: TC.sub, cursor: 'pointer' }}><ChevronLeft className="mx-auto h-4 w-4" /></button>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{month.replace('-', '. ')}</span>
            <button type="button" aria-label="다음 달" onClick={() => setMonth(shiftMonthStr(month, 1))}
              style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, color: TC.sub, cursor: 'pointer' }}><ChevronRight className="mx-auto h-4 w-4" /></button>
          </div>
          <button type="button" onClick={() => setWrappedYear(Number(month.slice(0, 4)))}
            style={{ height: 32, padding: '0 13px', border: `1px solid ${TC.line}`, borderRadius: 9, background: '#fff', fontSize: 12.5, fontWeight: 600, color: TC.ink3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles className="h-3.5 w-3.5" /> {month.slice(0, 4)}년 결산
          </button>
        </div>
      </div>

      <div style={{ border: `1px solid ${TC.line}`, borderRadius: 14, background: TC.card, padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {([
          { label: '수입', value: KRW(sum.income), color: TC.green },
          { label: '지출', value: KRW(sum.expense), color: TC.ink },
          { label: '저축·투자 이체', value: KRW(sum.transfer), color: TC.ink },
          { label: '저축률', value: sum.savedRate !== null ? `${Math.round(sum.savedRate * 100)}%` : '—', color: TC.ink },
        ]).map((k) => (
          <div key={k.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 650, color: TC.muted }}>{k.label}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: k.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title={`월별 수입·지출 (${barSpan}개월)`}>
          <div className="mb-2 flex justify-end gap-1">
            {([6, 12] as const).map((s) => (
              <button key={s} type="button" onClick={() => setBarSpan(s)}
                className={cn('rounded-full border px-2.5 py-0.5 text-[11.5px] transition-colors',
                  barSpan === s
                    ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.12)] font-medium text-[hsl(var(--ledger-navy))]'
                    : 'border-[hsl(var(--input))] text-muted-foreground')}>
                {s}개월
              </button>
            ))}
          </div>
          <MonthlyBars data={data} month={month} span={barSpan} />
        </Section>
        <Section title="순자산 추이"><NetWorthLine data={data} /></Section>
      </div>

      {/* 카테고리 증감 — 막대 길이가 증감 크기, 색이 방향(늘었나/줄었나) */}
      <div style={{ border: `1px solid ${TC.line}`, borderRadius: 14, background: TC.card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 14.5, fontWeight: 650 }}>카테고리 증감</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: TC.muted2 }}>
            {Number(prev.slice(5, 7))}월 → {Number(month.slice(5, 7))}월
          </span>
        </div>
        {compare.length === 0 ? (
          <p style={{ padding: '28px 20px', textAlign: 'center', fontSize: 12.5, color: TC.muted2 }}>비교할 지출이 없어요</p>
        ) : (() => {
          const maxDiff = Math.max(1, ...compare.map((r) => Math.abs(r.diff)));
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 32, padding: '0 20px', background: TC.head, borderTop: `1px solid ${TC.lineFaint}`, borderBottom: `1px solid ${TC.lineFaint}`, fontSize: 11, fontWeight: 700, color: TC.muted3 }}>
                <span style={{ flex: 1 }}>카테고리</span>
                <span style={{ width: 92, textAlign: 'right' }}>지난달</span>
                <span style={{ width: 92, textAlign: 'right' }}>이번 달</span>
                <span style={{ width: 190, textAlign: 'right' }}>증감</span>
              </div>
              {compare.map((r) => {
                const up = r.diff > 0;
                const bar = Math.round((Math.abs(r.diff) / maxDiff) * 100);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: `1px solid ${TC.lineRow}` }}>
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label.get(r.id) ?? r.id}</span>
                    </span>
                    <span style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 550, color: TC.muted, fontVariantNumeric: 'tabular-nums' }}>
                      {r.prev ? r.prev.toLocaleString('ko-KR') : '—'}
                    </span>
                    <span style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {r.cur ? r.cur.toLocaleString('ko-KR') : '—'}
                    </span>
                    <span style={{ width: 190, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 9 }}>
                      <span style={{ width: 96, height: 6, borderRadius: 999, background: TC.lineFaint, position: 'relative', overflow: 'hidden' }}>
                        <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${bar}%`, background: up ? TC.red : TC.greenDot }} />
                      </span>
                      <span style={{ minWidth: 82, textAlign: 'right', fontSize: 13, fontWeight: 700, color: r.diff === 0 ? TC.muted3 : up ? TC.red : TC.green, fontVariantNumeric: 'tabular-nums' }}>
                        {r.diff === 0 ? '—' : `${up ? '+' : '−'}${Math.abs(r.diff).toLocaleString('ko-KR')}`}
                      </span>
                    </span>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>

      <Section title="카테고리 × 최근 6개월">
        {pivot.cats.length === 0 ? <p className="py-4 text-center text-[12.5px] text-muted-foreground">지출 기록이 쌓이면 표가 채워져요</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-1.5 font-medium">카테고리</th>
                {pivotMonths.map((m) => <th key={m} className={cn('text-right font-medium tabular-nums', m === month && 'text-foreground')}>{Number(m.slice(5, 7))}월</th>)}
              </tr></thead>
              <tbody>
                {pivot.cats.map((id) => (
                  <tr key={id} className="border-t border-[hsl(var(--hairline))]">
                    <td className="py-1.5 whitespace-nowrap">{label.get(id) ?? id}</td>
                    {pivotMonths.map((m, i) => {
                      const v = pivot.perMonth[i].get(id) ?? 0;
                      return <td key={m} className={cn('text-right tabular-nums', v === 0 ? 'text-muted-foreground/50' : m === month ? 'font-semibold' : 'text-muted-foreground')}>{v ? Math.round(v / 1000).toLocaleString('ko-KR') + 'k' : '·'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">단위: 천 원</p>
          </div>
        )}
      </Section>

      {wrappedYear !== null && <YearWrapped data={data} year={wrappedYear} onClose={() => setWrappedYear(null)} />}
    </div>
  );
}

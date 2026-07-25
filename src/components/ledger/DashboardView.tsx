/**
 * 가계부 대시보드 — 시안 Ledger.dc.html 의 '요약' 화면 그대로.
 *
 * 구성: 쓸 수 있는 돈 히어로 + 예산 페이스 / 지출 캘린더 + 어디에 썼나 · 다가오는 돈 · 반복 감지.
 * 차트 라이브러리 없이 conic-gradient 와 div 만 쓴다.
 */
import { useMemo, useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { todayKey } from '@/services/ledgerStore';
import { ledgerStore } from '@/services/ledgerStore';
import { bucketSpent, categoryTotals, dailyExpense, monthOf, summarizeMonth, shiftMonth } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { C, KRW, SLICE_COLORS } from './theme';
import { toast } from 'sonner';

const BUCKETS: BudgetBucket[] = ['fixed', 'variable', 'irregular'];
const SKIP_KEY = 'ledger.suggestSkip.v1';

interface DashboardViewProps {
  data: LedgerData;
  onPickDate?: (date: string) => void;
  onGoAssets?: () => void;
  onPickCategory?: (categoryId: string) => void;
  onGoTx?: () => void;
  onGoBudget?: () => void;
}

const cardStyle: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 14, background: C.card };

export function DashboardView({ data, onPickDate, onPickCategory, onGoTx, onGoBudget }: DashboardViewProps) {
  const today = todayKey();
  const month = monthOf(today);
  const prev = shiftMonth(month, -1);
  const { entries, budgets, recurring, categories } = data;

  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const leftDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);

  const [selDay, setSelDay] = useState(dayOfMonth);
  const [skipped, setSkipped] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(SKIP_KEY) ?? '[]'); } catch { return []; }
  });

  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);
  const spent = useMemo(() => bucketSpent(entries, month, categories), [entries, month, categories]);
  const daily = useMemo(() => dailyExpense(entries, month), [entries, month]);
  const catMeta = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const budgetTotal = BUCKETS.reduce((s, b) => s + (budgets[b] ?? 0), 0);
  const spentAll = BUCKETS.reduce((s, b) => s + spent[b], 0);

  /** 아직 안 나간 고정지출 — '쓸 수 있는 돈'에서 미리 빼둔다. */
  const fixedDue = useMemo(
    () => recurring.filter((r) => r.active && r.type === 'expense' && r.lastPostedMonth !== month).reduce((s, r) => s + r.amount, 0),
    [recurring, month],
  );
  const freeLeft = Math.max(0, budgetTotal - spentAll - fixedDue);
  const perDay = Math.floor(freeLeft / leftDays / 100) * 100;
  const usedPct = budgetTotal > 0 ? Math.round((spentAll / budgetTotal) * 100) : 0;

  /** 변동비가 달력보다 얼마나 앞서가나 — %p. */
  const varPace = useMemo(() => {
    const b = budgets.variable;
    if (!b) return null;
    const used = Math.round((spent.variable / b) * 100);
    return used - monthPct;
  }, [budgets.variable, spent.variable, monthPct]);

  const cats = useMemo(() => {
    const cur = categoryTotals(entries, month);
    const pr = new Map(categoryTotals(entries, prev).map((t) => [t.categoryId, t.total]));
    const total = cur.reduce((s, t) => s + t.total, 0);
    const top = cur.slice(0, 5);
    const rest = total - top.reduce((s, t) => s + t.total, 0);
    const rows = top.map((t) => {
      const p = pr.get(t.categoryId) ?? 0;
      const delta = p > 0 ? Math.round(((t.total - p) / p) * 100) : null;
      return {
        id: t.categoryId,
        name: `${catMeta.get(t.categoryId)?.emoji ?? ''} ${catMeta.get(t.categoryId)?.label ?? t.categoryId}`,
        total: t.total, delta,
        pct: total > 0 ? Math.round((t.total / total) * 100) : 0,
      };
    });
    if (rest > 0) rows.push({ id: '', name: '그 외', total: rest, delta: null, pct: Math.round((rest / total) * 100) });
    return { rows, total };
  }, [entries, month, prev, catMeta]);

  const donut = useMemo(() => {
    if (cats.total <= 0) return C.track;
    let acc = 0;
    const stops = cats.rows.map((r, i) => {
      const from = (acc / cats.total) * 100;
      acc += r.total;
      return `${SLICE_COLORS[i % SLICE_COLORS.length]} ${from.toFixed(1)}% ${((acc / cats.total) * 100).toFixed(1)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [cats]);

  const upcoming = useMemo(
    () => recurring.filter((r) => r.active && r.type === 'expense' && r.lastPostedMonth !== month)
      .sort((a, b) => a.day - b.day).slice(0, 4),
    [recurring, month],
  );
  const upcomingTotal = upcoming.reduce((s, r) => s + r.amount, 0);

  /**
   * 반복 감지 — 같은 메모가 최근 3개월 중 2개월 이상 나오면 고정지출 후보.
   * 이미 규칙으로 등록됐거나 사용자가 무시한 건 빼고, 금액은 가장 최근 것.
   */
  const suggests = useMemo(() => {
    const months = [month, shiftMonth(month, -1), shiftMonth(month, -2)];
    const known = new Set(recurring.map((r) => r.label));
    const bag = new Map<string, { months: Set<string>; amount: number; day: number }>();
    for (const e of entries) {
      if (e.type !== 'expense' || !e.memo) continue;
      const m = e.date.slice(0, 7);
      if (!months.includes(m)) continue;
      const cur = bag.get(e.memo) ?? { months: new Set<string>(), amount: e.amount, day: Number(e.date.slice(8, 10)) };
      cur.months.add(m);
      bag.set(e.memo, cur);
    }
    return [...bag.entries()]
      .filter(([memo, v]) => v.months.size >= 2 && !known.has(memo) && !skipped.includes(memo))
      .slice(0, 2)
      .map(([memo, v]) => ({ memo, amount: v.amount, day: Math.min(28, v.day) }));
  }, [entries, month, recurring, skipped]);

  const skip = (memo: string) => {
    const next = [...skipped, memo];
    setSkipped(next);
    window.localStorage.setItem(SKIP_KEY, JSON.stringify(next));
  };
  const addRecurring = (s: { memo: string; amount: number; day: number }) => {
    ledgerStore.addRecurring({ label: s.memo, amount: s.amount, type: 'expense', categoryId: 'etc', day: s.day });
    toast.success(`"${s.memo}" 고정지출로 등록했어요`);
  };

  // 캘린더
  const firstDow = new Date(yy, mm - 1, 1).getDay();
  const cells: Array<number | null> = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const maxDay = Math.max(0, ...Object.values(daily));
  const noSpendDays = useMemo(() => {
    let n = 0;
    for (let d = 1; d <= Math.min(dayOfMonth, daysInMonth); d++) if (!daily[`${month}-${String(d).padStart(2, '0')}`]) n++;
    return n;
  }, [daily, dayOfMonth, daysInMonth, month]);
  const topDay = useMemo(() => {
    let best = 0, bestD = 0;
    for (const [k, v] of Object.entries(daily)) if (v > best) { best = v; bestD = Number(k.slice(8, 10)); }
    return bestD;
  }, [daily]);

  const selKey = `${month}-${String(selDay).padStart(2, '0')}`;
  const selItems = entries.filter((e) => e.date === selKey);
  const selTotal = selItems.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const hd = { fontSize: 14.5, fontWeight: 650 } as const;
  const hint = { fontSize: 11.5, fontWeight: 600, color: C.muted2 } as const;
  const outlineBtn: React.CSSProperties = { height: 32, padding: '0 13px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: C.ink3, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 머리 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 2, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>{mm}월 요약</h1>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>남은 {leftDays}일 · 기록 {sum.count}건</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={outlineBtn} onClick={onGoTx}>내역 보기</button>
          <button type="button" style={outlineBtn} onClick={onGoBudget}>예산 조정</button>
        </div>
      </div>

      {/* 히어로 + 예산 페이스 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr]" style={{ gap: 14 }}>
        <div style={{ ...cardStyle, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 650, color: C.muted }}>이번 달 쓸 수 있는 돈</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{KRW(freeLeft)}</span>
                <span style={{ fontSize: 18, fontWeight: 650, color: C.ink4 }}>원</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 550 }}>
                하루 {KRW(perDay)}원 · 고정 예정 {KRW(fixedDue)}원 빼고
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, paddingTop: 2 }}>
              {varPace !== null && varPace >= 5 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 25, padding: '0 10px', borderRadius: 999, background: C.warnBg, color: C.warnInk, fontSize: 11.5, fontWeight: 650 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: C.warnDot }} />
                  변동비 {varPace}%p 빠름
                </span>
              )}
              <span style={{ fontSize: 11.5, color: C.muted2, fontWeight: 550 }}>한 달의 {monthPct}% 지남</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative', height: 10, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, usedPct)}%`, background: C.navy, borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: C.muted, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ color: C.ink3 }}>예산 {usedPct}% 사용 · {KRW(spentAll)}원 / {KRW(budgetTotal)}원</span>
              <span>남은 예산 {KRW(Math.max(0, budgetTotal - spentAll))}원</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 14, borderTop: `1px solid ${C.lineFaint}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>수입</span>
              <span style={{ fontSize: 19, fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{KRW(sum.income)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>지출</span>
              <span style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{KRW(sum.expense)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>저축률</span>
              <span style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sum.savedRate !== null ? Math.round(sum.savedRate * 100) : 0}%</span>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={hd}>예산 페이스</span>
            <span style={hint}>버킷 3개</span>
          </div>
          {BUCKETS.map((b) => {
            const limit = budgets[b] ?? 0;
            const used = spent[b];
            const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const over = limit > 0 && used > limit;
            return (
              <div key={b} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 650, color: C.ink2 }}>{BUCKET_META[b].label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: over ? C.red : C.ink3, fontVariantNumeric: 'tabular-nums' }}>
                    {KRW(Math.max(0, limit - used))} 남음
                  </span>
                </div>
                <div style={{ position: 'relative', height: 7, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, pct)}%`, background: over ? C.red : C.navy, borderRadius: 999 }} />
                  <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${monthPct}%`, width: 1.5, background: '#C0BCB1' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 550, color: C.muted2, fontVariantNumeric: 'tabular-nums' }}>
                  <span>{KRW(used)} / {KRW(limit)}원</span>
                  <span>하루 {KRW(Math.floor(Math.max(0, limit - used) / leftDays / 100) * 100)}원</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 캘린더 + 우측 열 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr]" style={{ gap: 14 }}>
        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={hd}>지출 캘린더</span>
            <span style={hint}>무지출 {noSpendDays}일{topDay > 0 && ` · 최다 ${topDay}일`}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} style={{ fontSize: 10.5, fontWeight: 650, color: i === 0 ? C.red : i === 6 ? C.navyMid : C.muted3, textAlign: 'center', paddingBottom: 3 }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />;
              const key = `${month}-${String(d).padStart(2, '0')}`;
              const v = daily[key] ?? 0;
              const on = d === selDay;
              return (
                <button key={key} type="button" onClick={() => setSelDay(d)}
                  style={{ height: 46, borderRadius: 8, background: on ? C.navSel : v > 0 ? C.cardAlt : 'transparent', border: `1px solid ${on ? '#CFC9BC' : v > 0 ? C.lineFaint : 'transparent'}`, padding: '4px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 10.5, fontWeight: d === dayOfMonth ? 700 : 550, color: d === dayOfMonth ? C.navy : C.muted3, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 650, color: v > 0 ? (v >= maxDay * 0.66 ? C.ink2 : C.sub2) : 'transparent', textAlign: 'right', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {v > 0 ? `${Math.round(v / 1000)}k` : '·'}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: `1px solid ${C.lineFaint}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => onPickDate?.(selKey)}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12.5, fontWeight: 650, color: C.ink3, cursor: onPickDate ? 'pointer' : 'default' }}>
                {mm}월 {selDay}일{selItems.length > 0 && ` · ${selItems.length}건`}
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{KRW(selTotal)}원</span>
            </div>
            {selItems.length === 0
              ? <span style={{ fontSize: 12, color: C.muted2 }}>이 날은 기록이 없어요</span>
              : selItems.slice(0, 5).map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, background: C.chipBg, display: 'grid', placeItems: 'center', fontSize: 11 }}>{catMeta.get(t.categoryId)?.emoji ?? '📎'}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 550, color: C.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.memo || '(메모 없음)'}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>{catMeta.get(t.categoryId)?.label ?? ''}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: t.type === 'income' ? C.green : C.ink2, fontVariantNumeric: 'tabular-nums', minWidth: 74, textAlign: 'right' }}>
                    {t.type === 'income' ? '＋' : '－'}{KRW(t.amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={hd}>어디에 썼나</span>
              <span style={hint}>전월 대비</span>
            </div>
            {cats.total === 0 ? (
              <p style={{ fontSize: 12.5, color: C.muted2, padding: '18px 0', textAlign: 'center' }}>이번 달 지출이 아직 없어요</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ position: 'relative', width: 104, height: 104, flex: '0 0 104px', borderRadius: 999, background: donut }}>
                  <div style={{ position: 'absolute', inset: 22, borderRadius: 999, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 650, color: C.muted3 }}>지출</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{Math.round(cats.total / 10000)}만</span>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                  {cats.rows.map((s, i) => (
                    <button key={s.id || s.name} type="button" disabled={!s.id || !onPickCategory}
                      onClick={() => s.id && onPickCategory?.(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', padding: 0, cursor: s.id && onPickCategory ? 'pointer' : 'default', textAlign: 'left' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: SLICE_COLORS[i % SLICE_COLORS.length], flex: '0 0 7px' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 650, color: s.delta === null ? C.muted3 : s.delta > 0 ? C.red : C.green, fontVariantNumeric: 'tabular-nums' }}>
                        {s.delta === null ? '' : `${s.delta > 0 ? '+' : ''}${s.delta}%`}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>{s.pct}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={hd}>다가오는 돈</span>
              <span style={{ fontSize: 12, fontWeight: 650, color: C.ink3, fontVariantNumeric: 'tabular-nums' }}>{KRW(upcomingTotal)}원</span>
            </div>
            {upcoming.length === 0
              ? <span style={{ fontSize: 12.5, color: C.muted2 }}>이번 달 남은 고정지출이 없어요</span>
              : upcoming.map((u) => {
                const dd = u.day - dayOfMonth;
                const near = dd <= 3;
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: `1px solid ${C.lineFaint}`, borderRadius: 9, background: C.cardAlt }}>
                    <span style={{ fontSize: 12.5 }}>{catMeta.get(u.categoryId)?.emoji ?? '🔁'}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.label}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: near ? C.warnInk : C.sub, background: near ? C.warnBg : C.hoverBtn, padding: '3px 6px', borderRadius: 5 }}>
                      {dd <= 0 ? '오늘' : `D-${dd}`}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{KRW(u.amount)}</span>
                  </div>
                );
              })}
          </div>

          {suggests.length > 0 && (
            <div style={{ border: `1px solid ${C.tipLine2}`, borderRadius: 14, background: C.tipBg, padding: '15px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12.5 }}>🔁</span>
                <span style={{ fontSize: 13, fontWeight: 650, color: C.tipInk }}>매달 반복되는 지출을 찾았어요</span>
              </div>
              {suggests.map((g) => (
                <div key={g.memo} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink3, flex: 1, minWidth: 140 }}>
                    {g.memo} · {KRW(g.amount)}원 · 매월 {g.day}일
                  </span>
                  <button type="button" onClick={() => addRecurring(g)}
                    style={{ height: 27, padding: '0 11px', border: 'none', borderRadius: 7, background: C.navy, color: '#fff', fontSize: 11.5, fontWeight: 650, cursor: 'pointer' }}>고정지출 등록</button>
                  <button type="button" onClick={() => skip(g.memo)}
                    style={{ height: 27, padding: '0 9px', border: `1px solid ${C.tipLine}`, borderRadius: 7, background: '#fff', fontSize: 11.5, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>무시</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

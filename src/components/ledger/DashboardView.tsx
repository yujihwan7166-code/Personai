/**
 * 가계부 대시보드 — 위젯 그리드. 전부 stats 순수 함수 + 인라인 SVG (차트 라이브러리 없음).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { todayKey } from '@/services/ledgerStore';
import {
  buildBriefing, bucketSpent, budgetPace, cardCharge, categoryTotals, dailyExpense, monthOf, summarizeMonth,
} from '@/lib/ledger/stats';
import { monthlyDividends, netWorth } from '@/lib/ledger/assetStats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const prevMonthOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

function Card({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/** 카테고리 도넛 — conic 대신 SVG stroke-dasharray. 범례 클릭 → 해당 카테고리 내역. */
function Donut({ data, onPick }: { data: Array<{ id: string | null; label: string; emoji: string; total: number }>; onPick?: (categoryId: string) => void }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <p className="py-6 text-center text-[13px] text-muted-foreground">이번 달 지출이 아직 없어요</p>;
  const COLORS = ['hsl(var(--ledger-navy))', 'hsl(var(--ledger-navy)/0.75)', 'hsl(var(--ledger-navy)/0.55)', 'hsl(var(--ledger-navy)/0.4)', 'hsl(var(--ledger-navy)/0.28)', 'hsl(var(--muted-foreground)/0.3)'];
  const top = data.slice(0, 5);
  const rest = total - top.reduce((s, d) => s + d.total, 0);
  const segs = [...top, ...(rest > 0 ? [{ id: null, label: '그 외', emoji: '', total: rest }] : [])];
  const C = 2 * Math.PI * 40;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
        {segs.map((s, i) => {
          const frac = s.total / total;
          const el = (
            <circle key={s.label} cx="50" cy="50" r="40" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="14"
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 50 50)" />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {segs.map((s, i) => (
          <li key={s.label}>
            <button
              type="button" disabled={!s.id || !onPick}
              onClick={() => { if (s.id && onPick) onPick(s.id); }}
              title={s.id ? `${s.label} 내역 보기` : undefined}
              className={cn('flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12.5px]',
                s.id && onPick && 'transition-colors hover:bg-[hsl(var(--ledger-navy)/0.07)]')}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate">{s.emoji} {s.label}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">{Math.round((s.total / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 지출 히트맵 캘린더 — 금액 표시 토글. 날짜 탭 → 그날 내역(onPickDate). */
function Heatmap({ month, daily, onPickDate }: { month: string; daily: Record<string, number>; onPickDate?: (date: string) => void }) {
  const [showAmount, setShowAmount] = useState(false);
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const max = Math.max(1, ...Object.values(daily));
  const cells: Array<number | null> = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10.5px] text-muted-foreground">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, '0')}`;
          const v = daily[key] ?? 0;
          const alpha = v === 0 ? 0 : 0.15 + 0.65 * (v / max);
          return (
            <button key={key} type="button" title={v ? `${d}일 ${KRW(v)}` : `${d}일`} onClick={() => onPickDate?.(key)}
              className="flex aspect-square flex-col items-center justify-center rounded-md text-[10px] tabular-nums"
              style={{ background: v ? `hsl(var(--ledger-navy) / ${alpha.toFixed(2)})` : 'hsl(var(--muted) / 0.6)', color: alpha > 0.5 ? 'white' : undefined }}>
              <span>{d}</span>
              {showAmount && v > 0 && <span className="text-[8.5px] leading-none opacity-90">{Math.round(v / 1000)}k</span>}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => setShowAmount((s) => !s)} className="mt-2 text-[11.5px] text-muted-foreground underline-offset-2 hover:underline">
        {showAmount ? '금액 숨기기' : '금액 표시'}
      </button>
    </div>
  );
}

/** 순자산 미니 스파크라인 — 스냅샷 기반. */
function NetWorthSpark({ data }: { data: LedgerData }) {
  const snaps = data.snapshots;
  if (snaps.length < 2) return null;
  const W = 220, H = 44;
  const vals = snaps.map((s) => s.net);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => (i * W) / (snaps.length - 1);
  const y = (v: number) => 5 + (1 - (v - min) / span) * (H - 10);
  const line = snaps.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(s.net).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="hsl(var(--ledger-navy))" fillOpacity={0.08} />
      <path d={line} fill="none" stroke="hsl(var(--ledger-navy))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface DashboardViewProps {
  data: LedgerData;
  onPickDate?: (date: string) => void;
  onGoAssets?: () => void;
  onPickCategory?: (categoryId: string) => void;
  onGoTx?: () => void;
  onGoBudget?: () => void;
}

export function DashboardView({ data, onPickDate, onGoAssets, onPickCategory, onGoTx, onGoBudget }: DashboardViewProps) {
  const today = todayKey();
  const month = monthOf(today);
  const prev = prevMonthOf(month);
  const { entries, budgets, recurring, settings, categories } = data;

  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);
  const prevSum = useMemo(() => summarizeMonth(entries, prev), [entries, prev]);
  const cats = useMemo(() => {
    const meta = new Map(categories.map((c) => [c.id, c]));
    return categoryTotals(entries, month).map((t) => ({
      id: t.categoryId as string | null,
      label: meta.get(t.categoryId)?.label ?? t.categoryId, emoji: meta.get(t.categoryId)?.emoji ?? '', total: t.total,
    }));
  }, [entries, month, categories]);
  const daily = useMemo(() => dailyExpense(entries, month), [entries, month]);
  const spent = useMemo(() => bucketSpent(entries, month, categories), [entries, month, categories]);
  const briefing = useMemo(
    () => buildBriefing(entries, month, prev, categories, budgets, today),
    [entries, month, prev, categories, budgets, today],
  );
  const card = useMemo(() => cardCharge(entries, month), [entries, month]);

  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const upcoming = recurring
    .filter((r) => r.active && r.day >= dayOfMonth)
    .sort((a, b) => a.day - b.day)
    .slice(0, 4);

  const expenseDiff = prevSum.expense > 0 ? sum.expense - prevSum.expense : null;

  return (
    <div className="grid grid-cols-1 gap-4 pb-32 xl:grid-cols-2">
      {/* ① 이번 달 결산 */}
      <Card title={`${mm}월 결산`} className="xl:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-[12px] text-muted-foreground">수입</p><p className="text-[20px] font-bold tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(sum.income)}</p></div>
          <div><p className="text-[12px] text-muted-foreground">지출</p><p className="text-[20px] font-bold tabular-nums">{KRW(sum.expense)}</p>
            {expenseDiff !== null && <p className={cn('text-[11.5px] tabular-nums', expenseDiff > 0 ? 'text-[hsl(var(--ledger-red))]' : 'text-muted-foreground')}>지난달 대비 {expenseDiff >= 0 ? '+' : ''}{KRW(expenseDiff)}</p>}
          </div>
          <div><p className="text-[12px] text-muted-foreground">남은 돈</p><p className={cn('text-[20px] font-bold tabular-nums', sum.net < 0 && 'text-[hsl(var(--ledger-red))]')}>{KRW(sum.net)}</p>
            {sum.savedRate !== null && sum.transfer > 0 && <p className="text-[11.5px] text-muted-foreground">저축·투자 이체 {Math.round(sum.savedRate * 100)}%</p>}
          </div>
        </div>
      </Card>

      {/* ⑧ 순자산 — 자산이 있을 때만 */}
      {data.assets.length > 0 && (() => {
        const nw = netWorth(data.assets);
        const snaps = data.snapshots;
        const diff = snaps.length >= 2 ? nw.net - snaps[0].net : null;
        return (
          <Card
            title="순자산"
            className="xl:col-span-2"
            right={onGoAssets && (
              <button type="button" onClick={onGoAssets} className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">자산 관리 →</button>
            )}
          >
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                <p className="text-[20px] font-bold tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(nw.net)}</p>
                <p className="text-[11.5px] tabular-nums text-muted-foreground">
                  자산 {KRW(nw.assets)}{nw.debt > 0 && <> · 부채 -{KRW(nw.debt)}</>}
                  {diff !== null && <span className={cn('ml-1.5', diff >= 0 ? 'text-[hsl(var(--ledger-navy))]' : 'text-[hsl(var(--ledger-red))]')}>{diff >= 0 ? '+' : ''}{KRW(diff)}</span>}
                </p>
              </div>
              <div className="min-w-0 flex-1"><NetWorthSpark data={data} /></div>
            </div>
            {dayOfMonth >= 25 && !snaps.some((s) => s.month === month) && (
              <p className="mt-2 text-[11.5px] text-muted-foreground">월말이에요 — 자산 탭에서 이번 달 스냅샷을 저장하면 순자산 추이에 점이 찍혀요</p>
            )}
          </Card>
        );
      })()}

      {/* ⑦ AI 브리핑 */}
      <Card title="브리핑" className="xl:col-span-2">
        <ul className="space-y-1.5">
          {briefing.map((line) => <li key={line} className="text-[13.5px] leading-relaxed">· {line}</li>)}
        </ul>
      </Card>

      {/* ② 예산 페이스 */}
      <Card title="예산 페이스">
        {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => {
          const budget = budgets[b];
          if (!budget) return null;
          const s = spent[b];
          const pace = budgetPace(s, budget, dayOfMonth, daysInMonth);
          const pct = Math.min(100, Math.round((s / budget) * 100));
          return (
            <div key={b} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span>{BUCKET_META[b].label}</span>
                <span className="tabular-nums text-muted-foreground">{KRW(s)} / {KRW(budget)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <div className={cn('h-full rounded-full', pace.over ? 'bg-[hsl(var(--ledger-red))]' : 'bg-[hsl(var(--ledger-navy))]')} style={{ width: `${pct}%` }} />
              </div>
              {pace.over && <p className="mt-1 text-[11.5px] text-[hsl(var(--ledger-red))]">이 속도면 월말 {KRW(pace.projected)}</p>}
            </div>
          );
        })}
        {!budgets.fixed && !budgets.variable && !budgets.irregular && (
          <p className="py-4 text-center text-[13px] text-muted-foreground">예산 탭에서 버킷별 월 예산을 정하면 페이스가 표시돼요</p>
        )}
      </Card>

      {/* ③ 카테고리 도넛 */}
      <Card title="어디에 썼나"><Donut data={cats} onPick={onPickCategory} /></Card>

      {/* ④ 히트맵 캘린더 */}
      <Card title="지출 캘린더"><Heatmap month={month} daily={daily} onPickDate={onPickDate} /></Card>

      {/* ⑤+⑥ 다가오는 고정지출 · 카드 청구 */}
      <Card title="다가오는 돈">
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-[hsl(var(--surface-3))] px-3 py-2.5">
          <CreditCard className="h-4 w-4 shrink-0 text-[hsl(var(--ledger-navy))]" />
          <span className="text-[13px]">이번 달 카드 사용</span>
          <span className="ml-auto text-[14px] font-bold tabular-nums">{KRW(card)}</span>
          {settings.cardBillingDay && <span className="text-[11.5px] text-muted-foreground">{settings.cardBillingDay}일 결제</span>}
        </div>
        {(() => {
          const div = monthlyDividends(data.assets)[mm - 1];
          return div > 0 && (
            <div className="mb-2 flex items-center gap-2 text-[13px]">
              <span className="text-[hsl(var(--ledger-navy))]">₩</span>
              <span>이번 달 예상 배당</span>
              <span className="ml-auto tabular-nums font-semibold text-[hsl(var(--ledger-navy))]">+{KRW(div)}</span>
            </div>
          );
        })()}
        {upcoming.length === 0
          ? <p className="text-[12.5px] text-muted-foreground">이번 달 남은 고정지출이 없어요</p>
          : upcoming.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{r.label}</span>
              <span className="ml-auto tabular-nums">{KRW(r.amount)}</span>
              <span className="w-9 text-right text-[11.5px] text-muted-foreground">{r.day}일</span>
            </div>
          ))}
      </Card>
    </div>
  );
}

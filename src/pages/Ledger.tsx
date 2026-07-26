/**
 * 가계부 — 내 돈의 기록 (/ledger).
 *
 * 시안 Ledger.dc.html 을 그대로 옮긴 셸.
 * 좌: 250px 사이드바(마크+제목 · 상세입력 CTA · 그룹형 내비 · 백업 카드)
 * 우: 54px 스티키 상단바(기준일·밀도·금액숨김) + 최대 1280px 본문 + 하단 스티키 채팅바.
 *
 * 원칙: 입력이 쉬워야 한다. 죄책감 UI(스트릭·빈 날 경고) 금지. 데이터는 전부 localStorage.
 */
import { useCallback, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useLedger } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, bucketSpent } from '@/lib/ledger/stats';
import type { ParsedEntry } from '@/lib/ledger/parse';
import { ChatBar } from '@/components/ledger/ChatBar';
import { EntryFormDialog } from '@/components/ledger/EntryFormDialog';
import { DashboardView } from '@/components/ledger/DashboardView';
import { EntriesView } from '@/components/ledger/EntriesView';
import { BudgetView } from '@/components/ledger/BudgetView';
import { CalendarView } from '@/components/ledger/CalendarView';
import { BulkImportDialog } from '@/components/ledger/BulkImportDialog';
import { RecurringView } from '@/components/ledger/RecurringView';
import { RulesView } from '@/components/ledger/RulesView';
import { AssetsView } from '@/components/ledger/AssetsView';
import { ReportView } from '@/components/ledger/ReportView';
import { C } from '@/components/ledger/theme';

type View = 'dashboard' | 'entries' | 'calendar' | 'budget' | 'recurring' | 'rules' | 'assets' | 'report';

/** 시안의 그룹형 내비 — 기록 / 계획 / 분석. */
const NAV: Array<{ label: string; items: Array<{ id: View; t: string; icon: string }> }> = [
  { label: '기록', items: [
    { id: 'dashboard', t: '대시보드', icon: '🏠' },
    { id: 'entries', t: '내역', icon: '📒' },
    { id: 'calendar', t: '캘린더', icon: '🗓️' },
  ] },
  { label: '계획', items: [
    { id: 'budget', t: '예산', icon: '🎯' },
    { id: 'recurring', t: '고정지출', icon: '🔁' },
    { id: 'rules', t: '분류 규칙', icon: '🏷️' },
  ] },
  { label: '분석', items: [
    { id: 'assets', t: '자산', icon: '💎' },
    { id: 'report', t: '월 결산', icon: '📊' },
  ] },
];

/**
 * 뷰별 본문 폭 — 시안 각 화면의 max-width(+좌우 패딩 56).
 * 컬럼 자체를 이 폭으로 잡고 가운데 두어야 좌우 여백이 같아진다.
 */
const VIEW_MAX: Record<View, number> = {
  dashboard: 1280, entries: 1280, report: 1280, calendar: 1280,
  budget: 940 + 56, assets: 900 + 56, recurring: 860 + 56, rules: 780 + 56,
};

export default function Ledger() {
  const data = useLedger();
  const [view, setView] = useState<View>('dashboard');
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [focusCategory, setFocusCategory] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  /* 금액 숨김·줄 간격 — 켜고 끄는 자리(사이드바 발치)는 걷어냈고 저장된 값만 읽어 쓴다.
     매일 보는 자리에 1년에 몇 번 만지는 스위치를 두지 않는다. */
  const hideAmounts = typeof window !== 'undefined' && window.localStorage.getItem('ledger.privacy.v1') === '1';
  const compact = typeof window !== 'undefined' && window.localStorage.getItem('ledger.compact.v1') === '1';

  const today = todayKey();
  const month = monthOf(today);

  const openEdit = useCallback((id: string) => { setEditId(id); setFormOpen(true); }, []);
  const openNew = useCallback(() => { setEditId(null); setFormOpen(true); }, []);

  const selectView = useCallback((v: View) => {
    if (v === 'entries') { setFocusDate(null); setFocusCategory(null); }
    setView(v);
  }, []);

  const suggestRecurring = useCallback((p: ParsedEntry) => {
    if (window.confirm(`"${p.memo || '이 항목'}" ${p.amount.toLocaleString('ko-KR')}원을 매달 ${Number(p.date.slice(8, 10))}일 고정지출로 등록할까요?`)) {
      ledgerStore.addRecurring({
        label: p.memo || '고정지출', amount: p.amount, type: p.type, categoryId: p.categoryId,
        day: Math.min(28, Number(p.date.slice(8, 10))), method: p.method,
      });
      toast('고정지출로 등록했어요 — 매달 자동 기록됩니다');
    }
  }, []);


  const quickChips = useMemo(() => {
    const cnt = new Map<string, { n: number; amount: number }>();
    for (const e of data.entries.slice(0, 200)) {
      if (e.type !== 'expense' || !e.memo) continue;
      const cur = cnt.get(e.memo) ?? { n: 0, amount: e.amount };
      cnt.set(e.memo, { n: cur.n + 1, amount: e.amount });
    }
    return [...cnt.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n).slice(0, 3)
      .map(([memo, v]) => ({ label: `${memo} ${v.amount.toLocaleString('ko-KR')}`, input: `${memo} ${v.amount}` }));
  }, [data.entries]);

  /** 내비 우측 힌트 — 시안: 내역 N건 · 예산 N% · 고정지출 개수 · 규칙 개수. */
  const hints = useMemo(() => {
    const planned = (data.budgets.fixed ?? 0) + (data.budgets.variable ?? 0) + (data.budgets.irregular ?? 0);
    const spentAll = Object.values(bucketSpent(data.entries, month, data.categories)).reduce((s, v) => s + v, 0);
    return {
      entries: data.entries.length ? `${data.entries.length}건` : '',
      budget: planned > 0 ? `${Math.round((spentAll / planned) * 100)}%` : '',
      recurring: data.recurring.length ? String(data.recurring.length) : '',
      rules: Object.keys(data.dict).length ? String(Object.keys(data.dict).length) : '',
    } as Partial<Record<View, string>>;
  }, [data.entries, data.budgets, data.categories, data.recurring, data.dict, month]);


  return (
    /* ledger-theme 은 남아 있는 var(--ledger-*) 사용처(자산·결산·채팅바·입력 다이얼로그)의
       스코프다 — 빼면 그 색들이 정의되지 않은 변수가 된다. */
    <div className={`ledger-theme${hideAmounts ? ' ledger-hide-amounts' : ''}`}
      style={{ display: 'flex', alignItems: 'stretch', minHeight: '100dvh', width: '100%', background: C.bg, color: C.ink }}>

      {/* ── 사이드바 (시안 250px) ── */}
      <aside className="hidden lg:flex"
        style={{ width: 250, flex: '0 0 250px', borderRight: `1px solid ${C.lineSoft}`, background: C.side, flexDirection: 'column', padding: '16px 12px 14px' }}>
        {/* 헤더 — 다른 방(아카이브·마이위키·노트)과 같은 락업:
            34px 흰 마크 + 굵은 제목 + 부제 한 줄. 영문 아이브로우와 이모지 타일은 여기만 달랐다. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 6px 14px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: '#fff', color: C.navy,
            display: 'grid', placeItems: 'center', boxShadow: '0 1px 2px rgba(27,31,39,0.09)', flexShrink: 0,
          }}>
            <Wallet style={{ width: 18, height: 18 }} strokeWidth={1.9} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: '#191c20' }}>가계부</div>
            <div style={{ fontSize: 12, lineHeight: 1.2, color: C.muted2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              내 돈이 어디로 가는지
            </div>
          </div>
        </div>

        <button type="button" onClick={openNew}
          style={{ width: '100%', height: 40, border: 'none', borderRadius: 10, background: C.navy, color: '#fff', fontSize: 13.5, fontWeight: 650, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 1px 2px rgba(27,31,39,0.14)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.navyDeep; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.navy; }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span><span>상세 입력</span>
        </button>


        <nav aria-label="가계부 섹션" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18, overflow: 'auto' }}>
          {NAV.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.muted3, padding: '0 8px 6px' }}>{s.label}</div>
              {s.items.map((it) => {
                const on = view === it.id;
                return (
                  <button key={it.id} type="button" onClick={() => selectView(it.id)} aria-current={on ? 'page' : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '0 9px', borderRadius: 9, cursor: 'pointer', border: 'none', background: on ? C.navSel : 'transparent', textAlign: 'left' }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = C.hoverSide; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize: 13.5, width: 17, textAlign: 'center' }}>{it.icon}</span>
                    <span style={{ fontSize: 13.5, fontWeight: on ? 700 : 550, color: on ? C.ink : C.navInactive, flex: 1 }}>{it.t}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? C.sub : C.muted3, fontVariantNumeric: 'tabular-nums' }}>{hints[it.id] ?? ''}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 사이드바 발치의 기준일·밀도·금액숨김·백업 카드 덩어리는 걷어냈다.
            늘 보이는 자리인데 1년에 몇 번 만지는 것들이 매일 시야를 차지했다. */}
      </aside>

      {/* ── 본문 ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100dvh', overflowY: 'auto' }}>
        {/* 모바일 섹션 탭 — 사이드바가 lg 미만에서 숨겨지는 것 보완 */}
        <div className="flex gap-1.5 overflow-x-auto px-5 pt-3 lg:hidden" role="tablist" aria-label="가계부 섹션">
          {NAV.flatMap((s) => s.items).map((it) => {
            const on = view === it.id;
            return (
              <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => selectView(it.id)}
                style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? C.navy : C.line}`, background: on ? C.navSel : '#fff', fontSize: 12.5, fontWeight: on ? 700 : 550, color: on ? C.ink : C.navInactive, cursor: 'pointer' }}>
                {it.icon} {it.t}
              </button>
            );
          })}
        </div>

        {/* 폭은 뷰마다 다르지만 컬럼째 가운데 둔다 — 억지로 늘리지 않고 좌우 여백을 같게. */}
        <div style={{ flex: 1, width: '100%', maxWidth: VIEW_MAX[view], margin: '0 auto', padding: '22px 28px 40px', display: 'flex', flexDirection: 'column' }}>
          {view === 'dashboard' && (
            <DashboardView
              data={data}
              onPickDate={(d) => { setFocusDate(d); setView('entries'); }}
              onGoAssets={() => setView('assets')}
              onPickCategory={(c) => { setFocusCategory(c); setView('entries'); }}
              onGoTx={() => selectView('entries')}
              onGoBudget={() => setView('budget')}
            />
          )}
          {view === 'entries' && (
            <EntriesView
              data={data} onEdit={openEdit} compact={compact}
              focusDate={focusDate} onFocusConsumed={() => setFocusDate(null)}
              initialCategory={focusCategory}
              onOpenImport={() => setImportOpen(true)}
            />
          )}
          {view === 'calendar' && <CalendarView data={data} onEdit={openEdit} />}
          {view === 'budget' && <BudgetView data={data} />}
          {view === 'recurring' && <RecurringView data={data} />}
          {view === 'rules' && <RulesView data={data} />}
          {view === 'assets' && <AssetsView data={data} />}
          {view === 'report' && <ReportView data={data} onGoAssets={() => setView('assets')} />}

          <ChatBar
            categories={data.categories}
            entries={data.entries}
            quickChips={quickChips}
            onEdit={openEdit}
            onSuggestRecurring={suggestRecurring}
            onOpenDetail={openNew}
          />
        </div>
      </div>

      <EntryFormDialog open={formOpen} entryId={editId} categories={data.categories} buckets={data.buckets} onClose={() => setFormOpen(false)} />
      <BulkImportDialog open={importOpen} categories={data.categories} entries={data.entries} onClose={() => setImportOpen(false)} />
    </div>
  );
}

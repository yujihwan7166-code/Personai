/**
 * 가계부 — 내 돈의 기록 (/ledger).
 *
 * 시안 Ledger.dc.html 을 그대로 옮긴 셸.
 * 좌: 250px 사이드바(마크+제목 · 상세입력 CTA · 그룹형 내비 · 백업 카드)
 * 우: 54px 스티키 상단바(기준일·밀도·금액숨김) + 최대 1280px 본문 + 하단 스티키 채팅바.
 *
 * 원칙: 입력이 쉬워야 한다. 죄책감 UI(스트릭·빈 날 경고) 금지. 데이터는 전부 localStorage.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLedger } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth, bucketSpent } from '@/lib/ledger/stats';
import { toCsv } from '@/lib/csv';
import type { ParsedEntry } from '@/lib/ledger/parse';
import { ChatBar } from '@/components/ledger/ChatBar';
import { EntryFormDialog } from '@/components/ledger/EntryFormDialog';
import { DashboardView } from '@/components/ledger/DashboardView';
import { EntriesView } from '@/components/ledger/EntriesView';
import { BudgetView } from '@/components/ledger/BudgetView';
import { BulkImportDialog } from '@/components/ledger/BulkImportDialog';
import { RecurringView } from '@/components/ledger/RecurringView';
import { RulesView } from '@/components/ledger/RulesView';
import { AssetsView } from '@/components/ledger/AssetsView';
import { ReportView } from '@/components/ledger/ReportView';
import { C } from '@/components/ledger/theme';

type View = 'dashboard' | 'entries' | 'budget' | 'recurring' | 'rules' | 'assets' | 'report';

/** 시안의 그룹형 내비 — 기록 / 계획 / 분석. */
const NAV: Array<{ label: string; items: Array<{ id: View; t: string; icon: string }> }> = [
  { label: '기록', items: [
    { id: 'dashboard', t: '대시보드', icon: '🏠' },
    { id: 'entries', t: '내역', icon: '📒' },
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
  dashboard: 1280, entries: 1280, report: 1280,
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
  const [hideAmounts, setHideAmounts] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('ledger.privacy.v1') === '1');
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('ledger.compact.v1') === '1');
  const fileRef = useRef<HTMLInputElement>(null);

  const togglePrivacy = useCallback(() => {
    setHideAmounts((h) => { window.localStorage.setItem('ledger.privacy.v1', h ? '0' : '1'); return !h; });
  }, []);
  const toggleCompact = useCallback(() => {
    setCompact((c) => { window.localStorage.setItem('ledger.compact.v1', c ? '0' : '1'); return !c; });
  }, []);

  const today = todayKey();
  const month = monthOf(today);
  const sum = useMemo(() => summarizeMonth(data.entries, month), [data.entries, month]);

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

  const exportBackup = useCallback(() => {
    const blob = new Blob([ledgerStore.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    ledgerStore.markBackedUp();
  }, []);

  /** 백업 나이 — 잔소리가 아니라 계기판. */
  const backup = useMemo(() => {
    const at = ledgerStore.getLastBackupAt();
    if (!at) return data.entries.length > 0 ? { text: '아직 안 함', warn: true } : null;
    const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
    return { text: days === 0 ? '오늘 함' : `${days}일 전`, warn: days >= 14 };
  }, [data.entries]);

  const exportCsv = useCallback(() => {
    const label = new Map(data.categories.map((c) => [c.id, c.label]));
    const typeLabel = { expense: '지출', income: '수입', transfer: '이체' } as const;
    const methodLabel = { card: '카드', cash: '현금', account: '계좌이체' } as const;
    const rows: Array<Array<string | number>> = [
      ['날짜', '종류', '금액', '카테고리', '메모', '결제수단', '더치페이 총액'],
      ...data.entries.map((e) => [
        e.date, typeLabel[e.type], e.amount, label.get(e.categoryId) ?? e.categoryId,
        e.memo, e.method ? methodLabel[e.method] : '', e.groupTotal ?? '',
      ]),
    ];
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-${todayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [data.entries, data.categories]);

  const importBackup = useCallback(async (file: File) => {
    const ok = ledgerStore.importJson(await file.text());
    toast(ok ? '백업을 불러왔어요' : '백업 파일을 읽지 못했어요 — 내보내기로 만든 JSON 인지 확인해주세요');
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

  const monthDay = `${Number(month.slice(5, 7))}월 ${Number(today.slice(8, 10))}일 기준`;

  return (
    <div className={hideAmounts ? 'ledger-hide-amounts' : undefined}
      style={{ display: 'flex', alignItems: 'stretch', minHeight: '100dvh', width: '100%', background: C.bg, color: C.ink }}>

      {/* ── 사이드바 (시안 250px) ── */}
      <aside className="hidden lg:flex"
        style={{ width: 250, flex: '0 0 250px', borderRight: `1px solid ${C.lineSoft}`, background: C.side, flexDirection: 'column', padding: '16px 12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 14px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#EDEFF6', display: 'grid', placeItems: 'center', fontSize: 18 }}>🐷</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', color: C.muted2 }}>MY LEDGER</div>
            <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: '-0.01em' }}>가계부</div>
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

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          {/* 보기 설정 — 눈에 띄지 않게 맨 아래로 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span style={{ flex: 1, fontSize: 10.5, color: C.muted3 }}>{monthDay}</span>
            <button type="button" onClick={toggleCompact} title="줄 간격"
              style={{ height: 24, padding: '0 8px', border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff', fontSize: 10.5, fontWeight: 600, color: C.ink4, cursor: 'pointer' }}>
              {compact ? '촘촘' : '보통'}
            </button>
            <button type="button" onClick={togglePrivacy} title="금액 숨기기" aria-pressed={hideAmounts}
              style={{ width: 24, height: 24, border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff', fontSize: 11, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              {hideAmounts ? '🙈' : '👁'}
            </button>
          </div>
          <div style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 11, background: '#fff', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 650, color: C.ink3 }}>백업 · 내보내기</span>
              {backup && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: backup.warn ? C.backupInk : C.muted2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: backup.warn ? C.backupDot : C.greenDot }} />
                  {backup.text}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {([['JSON', exportBackup], ['CSV', exportCsv], ['가져오기', () => fileRef.current?.click()]] as const).map(([t, fn]) => (
                <button key={t} type="button" onClick={fn}
                  style={{ flex: 1, height: 27, border: `1px solid ${C.line}`, borderRadius: 7, background: C.cardAlt, fontSize: 11, fontWeight: 600, color: C.ink4, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F2F0EA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.cardAlt; }}>{t}</button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" aria-label="백업 파일"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ''; }} />
            <div style={{ fontSize: 10.5, lineHeight: 1.45, color: C.muted2 }}>기기에만 저장돼요. 기기 바꾸기 전 백업.</div>
          </div>
        </div>
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

      <EntryFormDialog open={formOpen} entryId={editId} categories={data.categories} onClose={() => setFormOpen(false)} />
      <BulkImportDialog open={importOpen} categories={data.categories} entries={data.entries} onClose={() => setImportOpen(false)} />
    </div>
  );
}

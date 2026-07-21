/**
 * 가계부 — 내 돈의 기록 (/ledger).
 *
 * 좌: 캐논 사이드바(마크+제목+부제 · 이모지 내비 · 백업 푸터)
 * 우: 마스트헤드(제목 + 실데이터 부제) + 뷰(대시보드·내역·예산·고정지출) + 하단 플로팅 AI 채팅바.
 *
 * 원칙: 입력이 쉬워야 한다. 죄책감 UI(스트릭·빈 날 경고) 금지. 데이터는 전부 localStorage.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Download, PiggyBank, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLedger } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth } from '@/lib/ledger/stats';
import type { ParsedEntry } from '@/lib/ledger/parse';
import { ChatBar } from '@/components/ledger/ChatBar';
import { EntryFormDialog } from '@/components/ledger/EntryFormDialog';
import { DashboardView } from '@/components/ledger/DashboardView';
import { EntriesView } from '@/components/ledger/EntriesView';
import { BudgetView } from '@/components/ledger/BudgetView';
import { RecurringView } from '@/components/ledger/RecurringView';
import { AssetsView } from '@/components/ledger/AssetsView';
import { ReportView } from '@/components/ledger/ReportView';
import { netWorth } from '@/lib/ledger/assetStats';

type View = 'dashboard' | 'entries' | 'budget' | 'recurring' | 'assets' | 'report';

const NAV: Array<{ id: View; label: string; emoji: string }> = [
  { id: 'dashboard', label: '대시보드', emoji: '🏠' },
  { id: 'entries',   label: '내역',     emoji: '📒' },
  { id: 'budget',    label: '예산',     emoji: '🎯' },
  { id: 'recurring', label: '고정지출', emoji: '🔁' },
  { id: 'assets',    label: '자산',     emoji: '💎' },
  { id: 'report',    label: '월 결산',  emoji: '📊' },
];

const VIEW_TITLE: Record<View, string> = {
  dashboard: '가계부', entries: '내역', budget: '예산', recurring: '고정지출', assets: '자산', report: '월 결산',
};

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export default function Ledger() {
  const data = useLedger();
  const [view, setView] = useState<View>('dashboard');
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  const month = monthOf(today);
  const sum = useMemo(() => summarizeMonth(data.entries, month), [data.entries, month]);

  const openEdit = useCallback((id: string) => { setEditId(id); setFormOpen(true); }, []);
  const openNew = useCallback(() => { setEditId(null); setFormOpen(true); }, []);

  /** 채팅에서 '매달' 감지 → 고정지출 등록 제안. */
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
  }, []);

  const importBackup = useCallback(async (file: File) => {
    const ok = ledgerStore.importJson(await file.text());
    toast(ok ? '백업을 불러왔어요' : '백업 파일을 읽지 못했어요 — 내보내기로 만든 JSON 인지 확인해주세요');
  }, []);

  /** 원탭 칩 — 최근 기록 중 같은 메모 2회↑ 상위 3개. */
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

  const nw = useMemo(() => netWorth(data.assets), [data.assets]);

  const subtitle = view === 'dashboard'
    ? <>이번 달 수입 {KRW(sum.income)} · 지출 {KRW(sum.expense)} · 내 기기에만 저장</>
    : view === 'entries' ? `이번 달 ${sum.count}건`
    : view === 'budget' ? '버킷 3개면 충분해요'
    : view === 'recurring' ? `규칙 ${data.recurring.filter((r) => r.active).length}개 활성`
    : view === 'assets' ? (data.assets.length ? <>순자산 {KRW(nw.net)} · 월말에 갱신하는 장부</> : '실시간 아님 — 월말에 한 번 적는 장부')
    : `스냅샷 ${data.snapshots.length}개 · 저축률과 순자산의 흐름`;

  return (
    <div className="ledger-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 (캐논) ── */}
      <aside className="hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-4 pb-5 pt-4 lg:flex">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[hsl(var(--ledger-navy)/0.25)] bg-[hsl(var(--ledger-navy)/0.12)] text-[hsl(var(--ledger-navy))]">
            <PiggyBank className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">My Ledger</p>
            <h1 className="truncate text-[17px] font-bold leading-tight">가계부</h1>
            <p className="truncate text-[11.5px] text-muted-foreground">흐름과 잔고, 내 돈의 기록</p>
          </div>
        </div>

        <nav className="space-y-0.5" aria-label="가계부 섹션">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors',
                view === n.id
                  ? 'bg-[hsl(var(--ledger-navy)/0.12)] font-semibold text-[hsl(var(--ledger-navy))]'
                  : 'text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground')}>
              <span className="text-[15px]">{n.emoji}</span>{n.label}
            </button>
          ))}
        </nav>

        <button type="button" onClick={openNew}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--input))] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> 상세 입력
        </button>

        <div className="mt-auto space-y-1 pt-6">
          <button type="button" onClick={exportBackup}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> JSON 백업 내보내기
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-foreground">
            <Upload className="h-3.5 w-3.5" /> 백업 가져오기
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" aria-label="백업 파일"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ''; }} />
          <p className="px-2.5 pt-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
            돈 기록은 내 기기에만 저장돼요 — 기기 변경 전 꼭 백업하세요.
          </p>
        </div>
      </aside>

      {/* ── 본문 — flex-col: 채팅바가 sticky(mt-auto)로 화면 하단부에 상주 ── */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-[980px] px-5 pt-6 lg:px-8">
          <header className="mb-6">
            <h2 className="text-[27px] font-bold leading-tight">{VIEW_TITLE[view]}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
          </header>

          {view === 'dashboard' && <DashboardView data={data} onPickDate={() => setView('entries')} onGoAssets={() => setView('assets')} />}
          {view === 'entries' && <EntriesView data={data} onEdit={openEdit} />}
          {view === 'budget' && <BudgetView data={data} />}
          {view === 'recurring' && <RecurringView data={data} />}
          {view === 'assets' && <AssetsView data={data} />}
          {view === 'report' && <ReportView data={data} />}
        </div>

        <ChatBar
          categories={data.categories}
          entries={data.entries}
          quickChips={quickChips}
          onEdit={openEdit}
          onSuggestRecurring={suggestRecurring}
        />
      </main>

      <EntryFormDialog open={formOpen} entryId={editId} categories={data.categories} onClose={() => setFormOpen(false)} />
    </div>
  );
}

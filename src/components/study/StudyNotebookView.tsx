import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { Download, Trash2, MoreHorizontal, PanelLeft, Home } from 'lucide-react';
import type { StudyNotebook, Flashcard, StudyPaneKind } from '@/types/study';
import { newId } from '@/types/study';
import { usePersistedStudyLayout } from '@/hooks/usePersistedStudyLayout';
import { useStudyAutoOcr } from '@/hooks/useStudyAutoOcr';
import { SourceViewer } from './SourceViewer';
import { StudyChat } from './StudyChat';
import { StudioDeck } from './StudioDeck';
import { QuickStartModal } from './QuickStartModal';
import { ExportMenu } from './ExportMenu';
import { LiveRecorder } from './LiveRecorder';
import { StudySession } from './StudySession';
import { LayoutSwitcher } from './LayoutSwitcher';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirmDialog';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onSessionComplete: () => void;
  paletteTrigger?: { action: 'session' | 'record' | 'quickstart' | 'export' | null; tick: number };
  onOpenPalette?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

type MobileTab = 'viewer' | 'chat' | 'studio';

export function StudyNotebookView({
  notebook, onChange, onDelete, onBack, onSessionComplete, paletteTrigger, onOpenPalette,
  sidebarOpen, onToggleSidebar,
}: Props) {
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [sessionOpts, setSessionOpts] = useState<{ filter?: 'saved' | 'deck' | 'quizDeck'; deckId?: string } | null>(null);
  const showSession = sessionOpts !== null;
  const setShowSession = (v: boolean) => setSessionOpts(v ? (sessionOpts ?? {}) : null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [activeSourcePage, setActiveSourcePage] = useState<number | undefined>(undefined);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const { prefs, setMode, setSlot, toggleLockSource, setWeights } = usePersistedStudyLayout();
  const desktopGridRef = useRef<HTMLDivElement>(null);

  // 노트북 진입 즉시 백그라운드 OCR + Vision 자동 시동.
  // PdfViewer 진입을 기다리지 않음 — 노트정리만 쓰는 흐름도 지원.
  // [중요] stale closure 회피: 항상 최신 notebook 을 ref 로 보존하고,
  // callback 내부에서 ref 의 현재값을 사용. 빠르게 연속 OCR page 완료가
  // 와도 이전 update 가 덮이지 않음.
  const notebookRef = useRef(notebook);
  notebookRef.current = notebook;
  const handleAutoOcrUpdate = useCallback((sourceId: string, content: string) => {
    const current = notebookRef.current;
    onChange({
      ...current,
      sources: current.sources.map((s) => s.id === sourceId ? { ...s, content } : s),
      updatedAt: Date.now(),
    });
  }, [onChange]);
  const ocrProgress = useStudyAutoOcr(notebook, handleAutoOcrUpdate);

  useEffect(() => {
    if (!paletteTrigger?.action) return;
    const a = paletteTrigger.action;
    if (a === 'session') setShowSession(true);
    if (a === 'record') setShowRecorder(true);
    if (a === 'quickstart') setShowQuickStart(true);
    if (a === 'export') setShowExport(true);
  }, [paletteTrigger?.tick, paletteTrigger?.action]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const typing = tgt && /input|textarea/i.test(tgt.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'q' || e.key === 'Q') setShowSession(true);
      if (e.key === 'r' || e.key === 'R') setShowRecorder(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!overflowOpen) return;
    const h = (e: MouseEvent) => { if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [overflowOpen]);

  const promoteToFlashcard = (front: string, back: string) => {
    const card: Flashcard = {
      id: newId('fc'), front, back,
      ease: 2.3, intervalDays: 1, dueAt: Date.now(), reviewsCount: 0,
      source: 'user',
    };
    onChange({ ...notebook, flashcards: [card, ...notebook.flashcards] });
  };

  // OCR/Vision 진행 중이면 로딩 화면 노출 — 끝나면 자동으로 노트북 진입
  if (ocrProgress.isProcessing) {
    return <PdfProcessingScreen progress={ocrProgress} notebookTitle={notebook.title} onBack={onBack} />;
  }

  return (
    <div className="study-root flex flex-col h-full bg-[#FAFBFC] dark:bg-[#0B1220]">
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={cn(
              'hidden sm:flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              sidebarOpen
                ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100',
            )}
            title={sidebarOpen ? '사이드바 접기 (Ctrl+B)' : '사이드바 열기 (Ctrl+B)'}
            aria-label="사이드바 토글"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          title="홈으로"
          aria-label="홈으로"
        >
          <Home className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0" />

        <div className="relative">
          <LayoutSwitcher
            prefs={prefs}
            onModeChange={setMode}
            onSlotChange={setSlot}
            onToggleLock={toggleLockSource}
            onResetWeights={() => setWeights(defaultWeightsFor(prefs.mode))}
          />
        </div>

        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen(!overflowOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label="더보기"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30" role="menu">
              <OverflowItem icon={<Download className="h-3.5 w-3.5" />} label="내보내기"
                onClick={() => { setOverflowOpen(false); setShowExport(true); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <OverflowItem icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="노트북 삭제" destructive
                onClick={async () => {
                  setOverflowOpen(false);
                  const ok = await confirmDialog({
                    title: '노트북을 삭제할까요?',
                    description: `"${notebook.title}" 노트북이 영구 삭제됩니다.`,
                    confirmLabel: '삭제',
                    tone: 'danger',
                  });
                  if (ok) { onDelete(notebook.id); onBack(); }
                }} />
            </div>
          )}
        </div>
      </div>

      <div className="sm:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {(['viewer', 'chat', 'studio'] as MobileTab[]).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={cn('flex-1 py-2.5 text-[11.5px] font-semibold transition-colors',
              mobileTab === t ? 'text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400')}
          >
            {t === 'viewer' ? '원본' : t === 'chat' ? '대화' : '스튜디오'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile: fixed tab-driven 3-pane (layout prefs ignored) */}
        <aside className={cn('sm:hidden', mobileTab === 'viewer' ? 'flex w-full' : 'hidden', 'bg-white dark:bg-slate-900')}>
          <SourceViewer notebook={notebook} onChange={onChange} onStartRecording={() => setShowRecorder(true)} activePage={activeSourcePage} onActivePageChange={setActiveSourcePage} />
        </aside>
        <main className={cn('sm:hidden', mobileTab === 'chat' ? 'flex w-full' : 'hidden')}>
          <StudyChat notebook={notebook} onChange={onChange} onPromoteToFlashcard={promoteToFlashcard} onStartRecording={() => setShowRecorder(true)} />
        </main>
        <aside className={cn('sm:hidden', mobileTab === 'studio' ? 'flex w-full' : 'hidden')}>
          <StudioDeck notebook={notebook} onChange={onChange} onStartSession={(opts) => setSessionOpts(opts ?? {})} onJumpToPage={(p) => { setActiveSourcePage(p); setMobileTab('viewer'); }} />
        </aside>

        {/* Desktop: dynamic slots with resizable grid */}
        <div
          ref={desktopGridRef}
          className="hidden sm:grid flex-1 min-w-0 h-full"
          style={{
            gridTemplateColumns: buildGridTemplate(prefs.slots.length, prefs.weights),
            maxWidth: '1600px',
            width: '100%',
          }}
        >
          {prefs.slots.flatMap((kind, i) => {
            const isLast = i === prefs.slots.length - 1;
            const paneEl = (
              <div key={`pane-${i}`} className="flex flex-col min-w-0 h-full overflow-hidden">
                {renderPane(kind, {
                  notebook, onChange, promoteToFlashcard,
                  onStartRecording: () => setShowRecorder(true),
                  onStartSession: (opts?: { filter?: 'saved' | 'deck' | 'quizDeck'; deckId?: string }) => setSessionOpts(opts ?? {}),
                  activeSourcePage,
                  onActiveSourcePageChange: setActiveSourcePage,
                })}
              </div>
            );
            if (isLast) return [paneEl];
            const handleEl = (
              <ResizeHandle
                key={`handle-${i}`}
                onDrag={(dx) => {
                  const container = desktopGridRef.current;
                  if (!container) return;
                  // 실제 pane px 를 기준으로 계산 → minmax(220px, ...) 와 충돌 없음.
                  const paneEls = Array.from(container.children).filter(
                    (c) => (c as HTMLElement).getAttribute('role') !== 'separator',
                  ) as HTMLElement[];
                  const leftEl = paneEls[i];
                  const rightEl = paneEls[i + 1];
                  if (!leftEl || !rightEl) return;
                  const leftPx = leftEl.getBoundingClientRect().width;
                  const rightPx = rightEl.getBoundingClientRect().width;
                  const pairPx = leftPx + rightPx;
                  if (pairPx <= 0) return;
                  const MIN_PX = 220;
                  const newLeftPx = Math.max(MIN_PX, Math.min(pairPx - MIN_PX, leftPx + dx));
                  const newRightPx = pairPx - newLeftPx;
                  // 변화가 거의 없으면 업데이트 스킵 (진동 방지)
                  if (Math.abs(newLeftPx - leftPx) < 0.5) return;

                  const weights = (prefs.weights ?? defaultWeightsFor(prefs.slots.length)).slice();
                  const pairWeight = weights[i] + weights[i + 1];
                  weights[i] = (newLeftPx / pairPx) * pairWeight;
                  weights[i + 1] = (newRightPx / pairPx) * pairWeight;
                  setWeights(weights);
                }}
              />
            );
            return [paneEl, handleEl];
          })}
        </div>
      </div>

      {showQuickStart && (
        <QuickStartModal notebook={notebook} onApply={(partial) => onChange({ ...notebook, ...partial })} onClose={() => setShowQuickStart(false)} />
      )}
      {showExport && <ExportMenu notebook={notebook} onClose={() => setShowExport(false)} />}
      {showRecorder && (
        <LiveRecorder onClose={() => setShowRecorder(false)} onDone={(src) => {
          onChange({ ...notebook, sources: [src, ...notebook.sources] });
          setShowRecorder(false);
        }} />
      )}
      {showSession && sessionOpts && (
        <StudySession
          notebook={notebook}
          onChange={onChange}
          onClose={() => setSessionOpts(null)}
          onSessionComplete={onSessionComplete}
          filter={sessionOpts.filter}
          deckId={sessionOpts.deckId}
        />
      )}
    </div>
  );
}

const DEFAULT_WEIGHTS: Record<number, number[]> = {
  1: [100],
  2: [40, 60],
  3: [22, 50, 28],
};

function defaultWeightsFor(count: number): number[] {
  return DEFAULT_WEIGHTS[count] ?? Array(count).fill(100 / count);
}

function buildGridTemplate(count: number, weights?: number[]): string {
  const w = weights && weights.length === count ? weights : defaultWeightsFor(count);
  const cols: string[] = [];
  for (let i = 0; i < count; i++) {
    cols.push(`minmax(220px, ${w[i]}fr)`);
    if (i < count - 1) cols.push('6px');
  }
  return cols.join(' ');
}

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!active) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [active]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="패널 크기 조정"
      className={cn(
        'group relative h-full cursor-col-resize select-none',
        'before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-slate-200 dark:before:bg-slate-800',
        active ? 'after:bg-indigo-400 after:w-[3px]' : 'after:bg-transparent hover:after:bg-indigo-300',
        'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-[2px] after:transition-all',
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        setActive(true);
        let lastX = e.clientX;
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - lastX;
          lastX = ev.clientX;
          onDrag(dx);
        };
        const onUp = () => {
          setActive(false);
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    />
  );
}

function renderPane(
  kind: StudyPaneKind,
  ctx: {
    notebook: StudyNotebook;
    onChange: (nb: StudyNotebook) => void;
    promoteToFlashcard: (f: string, b: string) => void;
    onStartRecording: () => void;
    onStartSession: (opts?: { filter?: 'saved' | 'deck' | 'quizDeck'; deckId?: string }) => void;
    activeSourcePage?: number;
    onActiveSourcePageChange?: (p: number) => void;
  },
): React.ReactElement {
  if (kind === 'sources') {
    return (
      <SourceViewer
        notebook={ctx.notebook}
        onChange={ctx.onChange}
        onStartRecording={ctx.onStartRecording}
        activePage={ctx.activeSourcePage}
        onActivePageChange={ctx.onActiveSourcePageChange}
      />
    );
  }
  if (kind === 'chat') {
    return <StudyChat notebook={ctx.notebook} onChange={ctx.onChange} onPromoteToFlashcard={ctx.promoteToFlashcard} onStartRecording={ctx.onStartRecording} />;
  }
  return <StudioDeck notebook={ctx.notebook} onChange={ctx.onChange} onStartSession={ctx.onStartSession} onJumpToPage={ctx.onActiveSourcePageChange} />;
}

function OverflowItem({
  icon, label, hint, onClick, disabled, destructive,
}: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className={cn(
        'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors disabled:opacity-40',
        destructive ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {hint && <kbd className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-mono text-slate-500">{hint}</kbd>}
    </button>
  );
}

/* ── PDF 분석 진행 화면 — OCR + Vision 실시간 진행률 ── */
function PdfProcessingScreen({
  progress,
  notebookTitle,
  onBack,
}: {
  progress: import('@/hooks/useStudyAutoOcr').AutoOcrProgress;
  notebookTitle: string;
  onBack: () => void;
}) {
  const ocrPct = progress.ocrTotal > 0
    ? Math.round((progress.ocrDone / progress.ocrTotal) * 100)
    : 0;
  const visionPct = progress.visionTotal > 0
    ? Math.round((progress.visionDone / progress.visionTotal) * 100)
    : 0;
  const overallPct = (() => {
    const total = progress.ocrTotal + progress.visionTotal;
    if (total === 0) return 0;
    return Math.round(((progress.ocrDone + progress.visionDone) / total) * 100);
  })();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#FAFBFC] px-6 dark:bg-[#0B1220]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-[12px] text-slate-500">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ← 홈
          </button>
          <span className="text-slate-300">/</span>
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{notebookTitle}</span>
        </div>

        <div className="mb-2 text-center text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          PDF 분석 중
        </div>
        <p className="mb-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          텍스트와 그림 라벨을 모두 추출하고 있어요. 끝나면 자동으로 노트북이 열립니다.
        </p>

        {/* 전체 진행률 큰 바 */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500">전체 진행률</span>
            <span className="text-[20px] font-bold tabular-nums text-slate-900 dark:text-slate-100">{overallPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* OCR + Vision 단계별 */}
        <div className="space-y-3">
          <PhaseRow
            emoji="🔤"
            label="텍스트 추출 (OCR)"
            sub={progress.ocrTotal > 0 ? `${progress.ocrDone}/${progress.ocrTotal} 페이지` : '준비 중'}
            pct={ocrPct}
            active={progress.phase === 'ocr'}
            done={progress.phase !== 'ocr' && progress.phase !== 'idle' && progress.ocrTotal > 0}
          />
          <PhaseRow
            emoji="🖼️"
            label="그림·라벨 분석 (Vision)"
            sub={progress.visionTotal > 0 ? `${progress.visionDone}/${progress.visionTotal} 페이지` : (progress.phase === 'ocr' ? '대기 중' : '대상 없음')}
            pct={visionPct}
            active={progress.phase === 'vision'}
            done={progress.phase === 'done' && progress.visionTotal > 0}
          />
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          시간이 걸려도 한 번만 처리하면 다음부터는 즉시 열려요.
        </p>
      </div>
    </div>
  );
}

function PhaseRow({
  emoji, label, sub, pct, active, done,
}: {
  emoji: string;
  label: string;
  sub: string;
  pct: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 transition-colors',
      active
        ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-950/20'
        : done
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
    )}>
      <div className="flex items-center gap-2.5">
        <span className="text-[18px] leading-none">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</span>
            <span className="text-[11px] tabular-nums text-slate-500">{sub}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                'h-full transition-all duration-300',
                active ? 'bg-indigo-500' : done ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
              )}
              style={{ width: `${done ? 100 : pct}%` }}
            />
          </div>
        </div>
        {done && <span className="text-emerald-600 dark:text-emerald-400" aria-label="완료">✓</span>}
        {active && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" aria-label="진행 중" />
        )}
      </div>
    </div>
  );
}

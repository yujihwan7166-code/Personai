import { Fragment, useState, useEffect, useRef } from 'react';
import { Download, Trash2, MoreHorizontal, PanelLeft, Home } from 'lucide-react';
import type { StudyNotebook, Flashcard, StudyPaneKind } from '@/types/study';
import { newId, countDueCards } from '@/types/study';
import { usePersistedStudyLayout } from '@/hooks/usePersistedStudyLayout';
import { SourceViewer } from './SourceViewer';
import { StudyChat } from './StudyChat';
import { StudioDeck } from './StudioDeck';
import { QuickStartModal } from './QuickStartModal';
import { ExportMenu } from './ExportMenu';
import { LiveRecorder } from './LiveRecorder';
import { StudySession } from './StudySession';
import { LayoutSwitcher } from './LayoutSwitcher';
import { cn } from '@/lib/utils';

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
  const [showSession, setShowSession] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(notebook.title);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const { prefs, setMode, setSlot, toggleLockSource, setWeights } = usePersistedStudyLayout();
  const desktopGridRef = useRef<HTMLDivElement>(null);

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
    };
    onChange({ ...notebook, flashcards: [card, ...notebook.flashcards] });
  };

  const due = countDueCards(notebook);
  const activeSources = notebook.sources.filter((s) => s.enabled && s.status === 'ready').length;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayQuestions = notebook.chat.filter((t) => t.role === 'user' && t.createdAt >= todayStart.getTime()).length;
  const wrongCount = notebook.wrongAnswers.length;

  return (
    <div className="study-root flex flex-col h-full bg-[#FAFBFC] dark:bg-[#0B1220]">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={cn(
              'hidden sm:flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              sidebarOpen
                ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100',
            )}
            title={sidebarOpen ? '사이드바 접기 (Ctrl+B)' : '사이드바 열기 (Ctrl+B)'}
            aria-label="사이드바 토글"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          title="홈으로"
          aria-label="홈으로"
        >
          <Home className="h-4 w-4" />
        </button>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg select-none">{notebook.icon}</span>
          {renaming ? (
            <input autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onChange({ ...notebook, title: titleDraft.trim() || notebook.title }); setRenaming(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setTitleDraft(notebook.title); setRenaming(false); } }}
              className="rounded-md border border-indigo-300 px-2 py-0.5 text-[15px] font-bold outline-none min-w-0 flex-1" />
          ) : (
            <h2 onClick={() => setRenaming(true)}
              className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate cursor-text hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 py-0.5"
              title="클릭해 이름 변경">
              {notebook.title}
            </h2>
          )}
        </div>

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
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label="더보기"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30" role="menu">
              <OverflowItem icon={<Download className="h-3.5 w-3.5" />} label="내보내기"
                onClick={() => { setOverflowOpen(false); setShowExport(true); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <OverflowItem icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="노트북 삭제" destructive
                onClick={() => {
                  setOverflowOpen(false);
                  if (confirm(`"${notebook.title}" 노트북을 삭제할까요?`)) { onDelete(notebook.id); onBack(); }
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
          <SourceViewer notebook={notebook} onChange={onChange} onStartRecording={() => setShowRecorder(true)} />
        </aside>
        <main className={cn('sm:hidden', mobileTab === 'chat' ? 'flex w-full' : 'hidden')}>
          <StudyChat notebook={notebook} onChange={onChange} onPromoteToFlashcard={promoteToFlashcard} onStartRecording={() => setShowRecorder(true)} />
        </main>
        <aside className={cn('sm:hidden', mobileTab === 'studio' ? 'flex w-full' : 'hidden')}>
          <StudioDeck notebook={notebook} onChange={onChange} onStartSession={() => setShowSession(true)} />
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
                  onStartSession: () => setShowSession(true),
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
                  const totalPx = container.clientWidth;
                  if (totalPx <= 0) return;
                  const weights = (prefs.weights ?? defaultWeightsFor(prefs.slots.length)).slice();
                  const total = weights.reduce((a, b) => a + b, 0);
                  const deltaPercent = (dx / totalPx) * total;
                  const minW = 12;
                  const left = Math.max(minW, weights[i] + deltaPercent);
                  const right = Math.max(minW, weights[i + 1] - deltaPercent);
                  const sumBefore = weights[i] + weights[i + 1];
                  const sumAfter = left + right;
                  const scale = sumBefore / sumAfter;
                  weights[i] = left * scale;
                  weights[i + 1] = right * scale;
                  setWeights(weights);
                }}
              />
            );
            return [paneEl, handleEl];
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-1.5 flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          활성 소스 <b className="text-slate-800 dark:text-slate-200">{activeSources}</b>
        </span>
        <span>·</span>
        <span>오늘 질문 <b className="text-slate-800 dark:text-slate-200">{todayQuestions}</b></span>
        <span>·</span>
        <span>복습 대기 <b className={cn(due > 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200')}>{due}</b></span>
        {wrongCount > 0 && (
          <>
            <span>·</span>
            <span>오답 <b className="text-rose-600 dark:text-rose-300">{wrongCount}</b></span>
          </>
        )}
        <span className="ml-auto text-[10.5px] text-slate-400">AI가 생성한 내용은 검증이 필요할 수 있습니다</span>
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
      {showSession && (
        <StudySession notebook={notebook} onChange={onChange} onClose={() => setShowSession(false)} onSessionComplete={onSessionComplete} />
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
    onStartSession: () => void;
  },
): React.ReactElement {
  if (kind === 'sources') {
    return (
      <SourceViewer
        notebook={ctx.notebook}
        onChange={ctx.onChange}
        onStartRecording={ctx.onStartRecording}
      />
    );
  }
  if (kind === 'chat') {
    return <StudyChat notebook={ctx.notebook} onChange={ctx.onChange} onPromoteToFlashcard={ctx.promoteToFlashcard} onStartRecording={ctx.onStartRecording} />;
  }
  return <StudioDeck notebook={ctx.notebook} onChange={ctx.onChange} onStartSession={ctx.onStartSession} />;
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

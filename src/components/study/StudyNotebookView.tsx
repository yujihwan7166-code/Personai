import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Download, Trash2, MoreHorizontal, PanelLeft, Home, CheckCircle2, Loader2, ScanText,
  FileUp, MessageSquare, Sparkles, FileText, Image,
} from 'lucide-react';
import type { HighlightColor, StudyNotebook, Flashcard, StudyPaneKind, StudySource } from '@/types/study';
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
import { NotebookIcon } from './NotebookIcon';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirmDialog';
import { getStudySourceReadiness } from '@/lib/studySourceReadiness';

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

const CHAT_DRAFT_STORAGE_KEY = 'study_chat_drafts_v1';
const MAX_STORED_CHAT_DRAFTS = 30;

function loadChatDrafts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CHAT_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
        .slice(-MAX_STORED_CHAT_DRAFTS),
    );
  } catch {
    return {};
  }
}

function persistChatDrafts(drafts: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(drafts)
      .filter(([, value]) => value.trim().length > 0)
      .slice(-MAX_STORED_CHAT_DRAFTS);
    if (entries.length === 0) {
      window.localStorage.removeItem(CHAT_DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CHAT_DRAFT_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Draft persistence should never block the study flow.
  }
}

export function StudyNotebookView({
  notebook, onChange, onDelete, onBack, onSessionComplete, paletteTrigger,
  sidebarOpen, onToggleSidebar,
}: Props) {
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [sessionOpts, setSessionOpts] = useState<{ filter?: 'saved' | 'deck' | 'quizDeck'; deckId?: string } | null>(null);
  const showSession = sessionOpts !== null;
  const setShowSession = useCallback((v: boolean) => {
    setSessionOpts((prev) => (v ? (prev ?? {}) : null));
  }, []);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [activeSourcePage, setActiveSourcePage] = useState<number | undefined>(undefined);
  const [sourceAddRequest, setSourceAddRequest] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [chatDraftByNotebook, setChatDraftByNotebook] = useState<Record<string, string>>(() => loadChatDrafts());
  const overflowRef = useRef<HTMLDivElement>(null);
  const { prefs, setMode, setSlot, toggleLockSource, setWeights } = usePersistedStudyLayout();
  const desktopGridRef = useRef<HTMLDivElement>(null);
  const readiness = getStudySourceReadiness(notebook.sources);
  const chatDraft = chatDraftByNotebook[notebook.id] ?? '';
  const setChatDraft = useCallback((value: string) => {
    setChatDraftByNotebook((prev) => {
      if (value) {
        const next = { ...prev, [notebook.id]: value };
        persistChatDrafts(next);
        return next;
      }
      if (!(notebook.id in prev)) {
        persistChatDrafts(prev);
        return prev;
      }
      const next = { ...prev };
      delete next[notebook.id];
      persistChatDrafts(next);
      return next;
    });
  }, [notebook.id]);

  // 노트북 진입 즉시 백그라운드 OCR + Vision 자동 시동.
  // PdfViewer 진입을 기다리지 않음 — 노트정리만 쓰는 흐름도 지원.
  // [중요] stale closure 회피: 항상 최신 notebook 을 ref 로 보존하고,
  // callback 내부에서 ref 의 현재값을 사용. 빠르게 연속 OCR page 완료가
  // 와도 이전 update 가 덮이지 않음.
  const notebookRef = useRef(notebook);
  notebookRef.current = notebook;
  const handleAutoOcrUpdate = useCallback((sourceId: string, content: string, status: StudySource['status'] = 'ready') => {
    const current = notebookRef.current;
    onChange({
      ...current,
      sources: current.sources.map((s) => s.id === sourceId ? { ...s, content, status } : s),
      updatedAt: Date.now(),
    });
  }, [onChange]);
  const ocrProgress = useStudyAutoOcr(notebook, handleAutoOcrUpdate, activeSourcePage);

  useEffect(() => {
    if (notebook.sources.length === 0) setMobileTab('viewer');
    else setMobileTab('chat');
  }, [notebook.id]);

  useEffect(() => {
    if (!paletteTrigger?.action) return;
    const a = paletteTrigger.action;
    if (a === 'session') setShowSession(true);
    if (a === 'record') setShowRecorder(true);
    if (a === 'quickstart') setShowQuickStart(true);
    if (a === 'export') setShowExport(true);
  }, [paletteTrigger?.tick, paletteTrigger?.action, setShowSession]);

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
  }, [setShowSession]);

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

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; color?: HighlightColor; page?: number }>).detail;
      const text = detail?.text?.trim();
      if (!text) return;
      const color = detail?.color ?? 'yellow';
      onChange({
        ...notebookRef.current,
        highlights: [
          ...(notebookRef.current.highlights ?? []),
          { id: newId('hl'), turnId: detail?.page ? `source:p${detail.page}` : 'source', text, color, createdAt: Date.now() },
        ],
        updatedAt: Date.now(),
      });
    };
    window.addEventListener('study:addHighlight', handler);
    return () => window.removeEventListener('study:addHighlight', handler);
  }, [onChange]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; prompt?: string; replayed?: boolean }>).detail;
      const text = detail?.text?.trim();
      const prompt = detail?.prompt?.trim();
      if (!text && !prompt) return;
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        if (mobileTab !== 'chat') {
          setMobileTab('chat');
          if (!detail?.replayed) {
            window.setTimeout(() => {
              window.dispatchEvent(new CustomEvent('study:askSelection', {
                detail: prompt ? { prompt, replayed: true } : { text, replayed: true },
              }));
            }, 80);
          }
        }
        window.setTimeout(() => focusStudyChatInput(), 100);
        return;
      }
      if (!prefs.slots.includes('chat')) {
        const index = Math.min(1, Math.max(0, prefs.slots.length - 1));
        setSlot(index, 'chat');
        if (!detail?.replayed) {
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('study:askSelection', {
              detail: prompt ? { prompt, replayed: true } : { text, replayed: true },
            }));
          }, 80);
        }
      } else {
        window.setTimeout(() => focusStudyChatInput(), 40);
      }
    };
    window.addEventListener('study:askSelection', handler);
    return () => window.removeEventListener('study:askSelection', handler);
  }, [mobileTab, prefs.slots, setSlot]);

  useEffect(() => {
    const handler = () => {
      setSourceAddRequest((prev) => prev + 1);
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        setMobileTab('viewer');
        return;
      }

      if (!prefs.slots.includes('sources')) {
        setSlot(0, 'sources');
      }
    };

    window.addEventListener('study:openSourceAdd', handler);
    return () => window.removeEventListener('study:openSourceAdd', handler);
  }, [prefs.slots, setSlot]);

  return (
    <div className="study-root flex h-full min-w-0 flex-col overflow-hidden bg-[#FAFBFC] dark:bg-[#0B1220]">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900 sm:py-0.5">
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
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:h-7 sm:w-7 sm:rounded-md"
          title="홈으로"
          aria-label="홈으로"
        >
          <Home className="h-3.5 w-3.5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <NotebookIcon icon={notebook.icon} className="hidden h-4 w-4 text-slate-500 dark:text-slate-400 sm:inline-flex" />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-bold leading-tight text-slate-900 dark:text-slate-100">
              {notebook.title}
            </p>
            <p className="hidden truncate text-[10.5px] leading-tight text-slate-400 md:block">
              {getNotebookSourceMeta(notebook)}
            </p>
          </div>
        </div>

        <div className="relative">
          <LayoutSwitcher
            prefs={prefs}
            onModeChange={setMode}
            onSlotChange={setSlot}
            onSetWeights={setWeights}
            onToggleLock={toggleLockSource}
            onResetWeights={() => setWeights(defaultWeightsFor(prefs.mode))}
          />
        </div>

        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen(!overflowOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:h-7 sm:w-7 sm:rounded-md"
            aria-label="더보기"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30" role="menu">
              <OverflowItem icon={<Download className="h-3.5 w-3.5" />} label="내보내기"
                onClick={() => { setOverflowOpen(false); setShowExport(true); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <OverflowItem icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="자료 삭제" destructive
                onClick={async () => {
                  setOverflowOpen(false);
                  const ok = await confirmDialog({
                    title: '자료를 삭제할까요?',
                    description: `"${notebook.title}" 자료가 영구 삭제됩니다.`,
                    confirmLabel: '삭제',
                    tone: 'danger',
                  });
                  if (ok) { onDelete(notebook.id); onBack(); }
                }} />
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 xl:hidden">
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/70">
          {([
            ['viewer', '원본', FileText],
            ['chat', '대화', MessageSquare],
            ['studio', '스튜디오', Sparkles],
          ] as const).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              aria-label={`${label} 탭 열기`}
              className={cn(
                'flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl text-[11.5px] font-bold transition-colors',
                mobileTab === t
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
              )}
              aria-pressed={mobileTab === t}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Mobile: fixed tab-driven 3-pane (layout prefs ignored) */}
        <aside className={cn('min-w-0 overflow-hidden xl:hidden', mobileTab === 'viewer' ? 'flex w-full' : 'hidden', 'bg-white dark:bg-slate-900')}>
          <SourceViewer notebook={notebook} onChange={onChange} onStartRecording={() => setShowRecorder(true)} activePage={activeSourcePage} onActivePageChange={setActiveSourcePage} ocrProgress={ocrProgress} openAddRequest={sourceAddRequest} />
        </aside>
        <main className={cn('min-w-0 overflow-hidden xl:hidden', mobileTab === 'chat' ? 'flex w-full' : 'hidden')}>
          <StudyChat
            notebook={notebook}
            onChange={onChange}
            onPromoteToFlashcard={promoteToFlashcard}
            onStartRecording={() => setShowRecorder(true)}
            chatDraft={chatDraft}
            onChatDraftChange={setChatDraft}
          />
        </main>
        <aside className={cn('min-w-0 overflow-hidden xl:hidden', mobileTab === 'studio' ? 'flex w-full' : 'hidden')}>
          <StudioDeck notebook={notebook} onChange={onChange} onStartSession={(opts) => setSessionOpts(opts ?? {})} onJumpToPage={(p) => { setActiveSourcePage(p); setMobileTab('viewer'); }} />
        </aside>

        {/* Desktop: dynamic slots with resizable grid */}
        <div
          ref={desktopGridRef}
          className="hidden flex-1 min-w-0 h-full xl:grid"
          style={{
            gridTemplateColumns: buildGridTemplate(prefs.slots, prefs.weights),
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
                  ocrProgress,
                  openSourceAddRequest: sourceAddRequest,
                  chatDraft,
                  onChatDraftChange: setChatDraft,
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
                  const minLeft = minWidthForPane(kind);
                  const minRight = minWidthForPane(prefs.slots[i + 1]);
                  if (pairPx < minLeft + minRight) return;
                  const newLeftPx = Math.max(minLeft, Math.min(pairPx - minRight, leftPx + dx));
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
          onChange({
            ...notebook,
            title: isUntitledStudyNotebook(notebook.title) ? src.title : notebook.title,
            sources: [src, ...notebook.sources],
            updatedAt: Date.now(),
          });
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
  2: [44, 56],
  3: [30, 42, 28],
};

const PANE_MIN_WIDTH: Record<StudyPaneKind, number> = {
  sources: 280,
  chat: 320,
  studio: 260,
};

function defaultWeightsFor(count: number): number[] {
  return DEFAULT_WEIGHTS[count] ?? Array(count).fill(100 / count);
}

function minWidthForPane(kind: StudyPaneKind) {
  return PANE_MIN_WIDTH[kind] ?? 240;
}

function buildGridTemplate(slots: StudyPaneKind[], weights?: number[]): string {
  const count = slots.length;
  const w = weights && weights.length === count ? weights : defaultWeightsFor(count);
  const cols: string[] = [];
  for (let i = 0; i < count; i++) {
    cols.push(`minmax(${minWidthForPane(slots[i])}px, ${w[i]}fr)`);
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

function StudyReadinessStrip({
  readiness,
  progress,
  generatedCount,
  onOpenSources,
}: {
  readiness: ReturnType<typeof getStudySourceReadiness>;
  progress: ReturnType<typeof useStudyAutoOcr>;
  generatedCount: number;
  onOpenSources: () => void;
}) {
  const total = progress.ocrTotal + progress.visionTotal;
  const percent = total > 0 ? getAnalysisPercent(progress) : 0;
  const waitingForText = readiness.hasOnlyPendingSources || (progress.isProcessing && !readiness.hasUsableSources);

  if (readiness.hasUsableSources && generatedCount > 0 && !progress.isProcessing) return null;

  if (!readiness.hasEnabledSources) return null;

  if (!readiness.hasEnabledSources) {
    return (
      <div className="border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/35">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              <FileUp className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">원본을 먼저 추가해 주세요</p>
              <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">PDF, PPTX, 링크, 붙여넣기, 녹음이 들어오면 대화와 스튜디오가 열려요.</p>
            </div>
          </div>
          <button
            onClick={onOpenSources}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:h-8"
          >
            <FileUp className="h-3.5 w-3.5" />
            원본 추가
          </button>
        </div>
      </div>
    );
  }

  if (waitingForText) {
    return (
      <div className="border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 text-indigo-600 ring-1 ring-indigo-100 dark:bg-slate-900/80 dark:text-indigo-300 dark:ring-indigo-900/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold">자료를 읽는 중이에요</p>
              <p className="truncate text-[10.5px] text-indigo-700/75 dark:text-indigo-200/70">
                분석이 끝나면 질문 입력과 스튜디오 생성이 자동으로 활성화돼요.
              </p>
            </div>
          </div>
          {total > 0 && (
            <div className="flex min-w-[130px] items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-9 text-right text-[11px] font-bold tabular-nums">{percent}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
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
    ocrProgress: ReturnType<typeof useStudyAutoOcr>;
    openSourceAddRequest: number;
    chatDraft: string;
    onChatDraftChange: (value: string) => void;
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
        ocrProgress={ctx.ocrProgress}
        openAddRequest={ctx.openSourceAddRequest}
      />
    );
  }
  if (kind === 'chat') {
    return (
      <StudyChat
        notebook={ctx.notebook}
        onChange={ctx.onChange}
        onPromoteToFlashcard={ctx.promoteToFlashcard}
        onStartRecording={ctx.onStartRecording}
        chatDraft={ctx.chatDraft}
        onChatDraftChange={ctx.onChatDraftChange}
      />
    );
  }
  return <StudioDeck notebook={ctx.notebook} onChange={ctx.onChange} onStartSession={ctx.onStartSession} onJumpToPage={ctx.onActiveSourcePageChange} />;
}

function AnalysisStatusPill({ progress }: { progress: ReturnType<typeof useStudyAutoOcr> }) {
  const total = progress.ocrTotal + progress.visionTotal;
  if (total === 0) return null;

  const done = progress.ocrDone + progress.visionDone;
  const percent = getAnalysisPercent(progress);
  const processing = progress.isProcessing;
  const label = processing
    ? progress.phase === 'vision'
      ? '그림 분석 중'
      : '텍스트 분석 중'
    : '분석 완료';

  return (
    <div
      className={cn(
        'hidden md:inline-flex h-7 max-w-[260px] items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
        processing
          ? 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200'
          : 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
      )}
      title={`${label} · ${done}/${total}`}
    >
      {processing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      <span className="truncate">{label}</span>
      <span className="tabular-nums text-current/70">{percent}%</span>
      <ScanText className="h-3.5 w-3.5 text-current/55" />
    </div>
  );
}

function getAnalysisPercent(progress: ReturnType<typeof useStudyAutoOcr>) {
  const total = progress.ocrTotal + progress.visionTotal;
  if (total <= 0) return 0;
  const done = progress.ocrDone + progress.visionDone;
  return Math.max(3, Math.min(100, Math.round((done / total) * 100)));
}

function getNotebookSourceMeta(notebook: StudyNotebook) {
  const source = notebook.sources[0];
  if (!source) return '자료 없음';
  const kind = getStudySourceKindLabel(source.kind);
  const page = source.pageCount ? ` · ${source.pageCount}p` : '';
  const extra = notebook.sources.length > 1 ? ` · 외 ${notebook.sources.length - 1}개` : '';
  return `${kind}${page}${extra} · ${source.title}`;
}

function getStudySourceKindLabel(kind: StudyNotebook['sources'][number]['kind']) {
  if (kind === 'paste') return '텍스트';
  if (kind === 'url') return '웹';
  if (kind === 'youtube') return '영상';
  if (kind === 'recording') return '녹음';
  return kind.toUpperCase();
}

function isUntitledStudyNotebook(title: string) {
  return ['새 자료', '새 파일', '새 노트북'].includes(title.trim());
}

function focusStudyChatInput() {
  window.dispatchEvent(new CustomEvent('study:focusChatInput'));
  const inputs = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[data-study-chat-input]'));
  const ta = inputs.find((input) => {
    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(input).visibility !== 'hidden';
  }) ?? inputs[0];
  if (!ta) return;
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(ta.value.length, ta.value.length);
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
          텍스트와 그림 라벨을 모두 추출하고 있어요. 끝나면 자동으로 자료가 열립니다.
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
            icon={<FileText className="h-4 w-4" />}
            label="텍스트 추출 (OCR)"
            sub={progress.ocrTotal > 0 ? `${progress.ocrDone}/${progress.ocrTotal} 페이지` : '준비 중'}
            pct={ocrPct}
            active={progress.phase === 'ocr'}
            done={progress.phase !== 'ocr' && progress.phase !== 'idle' && progress.ocrTotal > 0}
          />
          <PhaseRow
            icon={<Image className="h-4 w-4" />}
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
  icon, label, sub, pct, active, done,
}: {
  icon: ReactNode;
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
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          active
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-200'
            : done
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-200'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
        )}>{icon}</span>
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

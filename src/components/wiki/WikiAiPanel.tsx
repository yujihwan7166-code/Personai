import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Trash2, FileText, Plus as PlusIcon, Check, Copy as CopyIcon,
  BookOpen, MessageSquarePlus, History, Library, Network,
  type LucideIcon,
} from 'lucide-react';
import type { WikiPage } from '@/types/wiki';
import type { Expert } from '@/types/expert';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PageAiPanelHeader } from '@/components/PageAiPanelHeader';
import {
  PAGE_AI_PANEL_WIDTH,
  PAGE_AI_PANEL_SCROLL_CLASS,
  PAGE_AI_PANEL_SURFACE_CLASS,
  PAGE_AI_PANEL_TRANSITION_CLASS,
  PAGE_AI_TONE_DOT,
  PAGE_AI_TONE_ICON,
  clampPageAiPanelWidth,
  type PageAiTone,
} from '@/components/PageAiTokens';
import {
  AuxiliaryReferenceSelect,
  AuxiliaryToolTab,
  AuxiliaryToolTabs,
  PageAiComposer,
  PageAiEmptyState,
  PageAiMessageActionButton,
  PageAiMessageActions,
  PageAiMessageBubble,
  PageAiPromptSet,
  PageAiQuickAction,
  PageAiResizeHandle,
  PageAiTypingIndicator,
  getAuxiliaryToolsForSurface,
} from '@/components/PageAiScaffold';
import { AuxiliaryPlannerTool } from '@/components/AuxiliaryToolPanels';
import { streamExpert } from '@/pages/indexRuntime';
import { buildWikiAiContext, deriveWikiPageTitleFromAnswer } from '@/lib/wikiAiContext';

/**
 * 마이위키 AI 사이드 패널
 *
 * 컨셉: 그냥 사이드바 AI 비서. 일반 질문도 받고, 위키 페이지를 보고 있으면
 * 그 내용도 자동으로 컨텍스트로 첨부해 답한다. 페이지를 옮겨도 대화는 유지.
 *
 * - 멀티 스레드: 사용자가 명시적으로 "새 대화" 누를 때만 분리. 이전 대화는 보존.
 * - 리사이즈: 좌측 핸들 드래그로 너비 조절. localStorage 영속.
 * - AI: streamExpert + 외부 검색 비활성. 페이지/위키 컨텍스트만 사용.
 */

type Role = 'user' | 'assistant';
interface AiMsg {
  id: string;
  role: Role;
  text: string;
  ts: number;
  ctxPageId?: string;
}
interface ThreadMeta {
  id: string;
  title: string;
  updatedAt: number;
  msgCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 활성 페이지. 컨텍스트 첨부용 — null 이면 위키 전체 메타. */
  page: WikiPage | null;
  /** 전체 페이지 — 글로벌 컨텍스트(제목+요약) 생성용. */
  allPages?: WikiPage[];
  /** fallback */
  totalPages: number;
  onAppendToBody?: (snippet: string) => void;
  onCreatePageFromAnswer?: (title: string, body: string) => void;
}

const THREADS_KEY = 'wiki_ai_threads_v2';
const THREAD_PREFIX = 'wiki_ai_thread_v2:';
const ACTIVE_KEY = 'wiki_ai_active_v2';
const WIDTH_KEY = 'personai.ai-panel.width.wiki';

function loadThreads(): ThreadMeta[] {
  try {
    const r = window.localStorage.getItem(THREADS_KEY);
    if (!r) return [];
    const p = JSON.parse(r);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
function saveThreads(t: ThreadMeta[]): void {
  try { window.localStorage.setItem(THREADS_KEY, JSON.stringify(t)); } catch { /* quota */ }
}
function loadMsgs(id: string): AiMsg[] {
  try {
    const r = window.localStorage.getItem(THREAD_PREFIX + id);
    if (!r) return [];
    const p = JSON.parse(r);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
function saveMsgs(id: string, m: AiMsg[]): void {
  try { window.localStorage.setItem(THREAD_PREFIX + id, JSON.stringify(m.slice(-200))); } catch { /* quota */ }
}
function dropMsgs(id: string): void {
  try { window.localStorage.removeItem(THREAD_PREFIX + id); } catch { /* */ }
}
function loadWidth(): number {
  const raw = window.localStorage.getItem(WIDTH_KEY);
  if (raw === null || raw.trim() === '') return PAGE_AI_PANEL_WIDTH.default;
  const r = Number(raw);
  return Number.isFinite(r) ? clampPageAiPanelWidth(r) : PAGE_AI_PANEL_WIDTH.default;
}

function newId(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function newThreadId(): string {
  return `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function deriveTitle(msgs: AiMsg[]): string {
  const first = msgs.find((m) => m.role === 'user');
  if (!first) return '새 대화';
  const t = first.text.replace(/\s+/g, ' ').trim().slice(0, 24);
  return t || '새 대화';
}

const EXAMPLES = [
  {
    label: '문서 요약',
    description: '핵심을 3줄로 압축',
    prompt: '이 문서 핵심 3줄로 요약해줘',
    icon: FileText,
    tone: 'blue',
    emphasized: true,
  },
  {
    label: '위키 흐름 정리',
    description: '전체 주제와 연결 보기',
    prompt: '내 위키 전체 흐름 한눈에 정리해줘',
    icon: Network,
    tone: 'violet',
    emphasized: true,
  },
  {
    label: '글쓰기 도움',
    description: '막힌 생각 이어가기',
    prompt: '요즘 글쓰기 막막한데 도와줄래?',
    icon: BookOpen,
    tone: 'amber',
  },
  {
    label: '관련 문서 추천',
    description: '이어볼 문서 찾기',
    prompt: '관련된 위키 문서 추천해줘',
    icon: Library,
    tone: 'emerald',
  },
] satisfies ReadonlyArray<{
  label: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
  tone: PageAiTone;
  emphasized?: boolean;
}>;

const WIKI_AI_EXPERT: Expert = {
  id: 'wiki-ai',
  name: 'Wiki AI',
  nameKo: '위키 AI',
  icon: '✨',
  color: 'blue',
  category: 'ai',
  description: '사이드바 AI 비서',
  systemPrompt: [
    '당신은 사용자의 사이드바 AI 비서입니다.',
    '일반 질문에도 자연스럽게 답하되, 위키 페이지 컨텍스트가 첨부되면 그것을 우선 참고해 답하세요.',
    '한국어로 답하고, markdown 형식을 사용하되 과도한 헤더는 피하세요.',
    '모르는 정보는 추측하지 말고 모른다고 말하세요.',
  ].join('\n'),
};

export function WikiAiPanel({
  open,
  onClose,
  page,
  allPages,
  totalPages,
  onAppendToBody,
  onCreatePageFromAnswer,
}: Props) {
  const [threads, setThreads] = useState<ThreadMeta[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = window.localStorage.getItem(ACTIVE_KEY);
    const list = loadThreads();
    if (saved && list.some((t) => t.id === saved)) return saved;
    return list[0]?.id ?? '';
  });
  const [msgs, setMsgs] = useState<AiMsg[]>(() => activeId ? loadMsgs(activeId) : []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // 컨텍스트 범위: 현재 문서 / 전체 위키. 활성 페이지가 없으면 강제 'all'.
  const [ctxScope, setCtxScope] = useState<'page' | 'all'>(() => page ? 'page' : 'all');
  useEffect(() => {
    if (!page && ctxScope === 'page') setCtxScope('all');
  }, [page, ctxScope]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<AuxiliaryToolTab>('ai');
  const auxiliaryTools = useMemo(() => getAuxiliaryToolsForSurface('wiki'), []);
  const [width, setWidth] = useState<number>(() => loadWidth());
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    (panel as HTMLElement & { inert: boolean }).inert = !open;
  }, [open]);

  // 빈 상태 → 첫 스레드 자동 생성
  useEffect(() => {
    if (threads.length === 0) {
      const id = newThreadId();
      const meta: ThreadMeta = { id, title: '새 대화', updatedAt: Date.now(), msgCount: 0 };
      setThreads([meta]);
      saveThreads([meta]);
      setActiveId(id);
      setMsgs([]);
    }
  }, [threads.length]);

  // 활성 id 영속
  useEffect(() => {
    if (activeId) {
      try { window.localStorage.setItem(ACTIVE_KEY, activeId); } catch { /* */ }
    }
  }, [activeId]);

  // 활성 스레드 변경 시 메시지 로드
  useEffect(() => {
    if (activeId) setMsgs(loadMsgs(activeId));
  }, [activeId]);

  // 메시지 변경 시 저장 + 메타 업데이트 + 스크롤
  useEffect(() => {
    if (!activeId) return;
    saveMsgs(activeId, msgs);
    setThreads((prev) => {
      const next = prev.map((t) => t.id === activeId
        ? { ...t, msgCount: msgs.length, updatedAt: Date.now(), title: deriveTitle(msgs) }
        : t);
      saveThreads(next);
      return next;
    });
    queueMicrotask(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [msgs, activeId]);

  // 입력 중 Esc는 텍스트 편집을 우선하고, 그 외 영역에서만 패널/히스토리를 닫는다.
  useEscapeKey(() => {
    if (historyOpen) setHistoryOpen(false);
    else onClose();
  }, { enabled: open });

  useEffect(() => {
    if (!auxiliaryTools.some((tool) => tool.id === activeTool)) {
      setActiveTool('ai');
    }
  }, [activeTool, auxiliaryTools]);

  useEffect(() => {
    if (activeTool !== 'ai' && historyOpen) {
      setHistoryOpen(false);
    }
  }, [activeTool, historyOpen]);

  const ctxPageCount = allPages?.length ?? totalPages;

  const makeContextPayload = useCallback((question: string) =>
    buildWikiAiContext({
      scope: ctxScope,
      page,
      pages: allPages ?? [],
      question,
    }), [ctxScope, page, allPages]);

  async function send(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy || !activeId) return;

    const userMsg: AiMsg = { id: newId(), role: 'user', text: q, ts: Date.now(), ctxPageId: page?.id };
    const aiMsgId = newId();
    const aiMsg: AiMsg = { id: aiMsgId, role: 'assistant', text: '', ts: Date.now(), ctxPageId: page?.id };
    setMsgs((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setBusy(true);

    const ctxPayload = makeContextPayload(q);
    const previousResponses = ctxPayload ? [{ name: '컨텍스트', content: ctxPayload }] : [];
    let accumulated = '';

    try {
      await streamExpert({
        question: q,
        expert: WIKI_AI_EXPERT,
        previousResponses,
        round: 'summary',
        onDelta: (delta) => {
          accumulated += delta;
          setMsgs((prev) => prev.map((m) =>
            m.id === aiMsgId ? { ...m, text: accumulated } : m,
          ));
        },
        onDone: () => {
          if (!accumulated.trim()) {
            setMsgs((prev) => prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: '_(응답이 비어 있어요. 다시 시도해 주세요)_' } : m,
            ));
          }
        },
        searchPolicy: 'never',
      });
    } catch (e) {
      const errMsg = (e as Error)?.message ?? '알 수 없는 오류';
      setMsgs((prev) => prev.map((m) =>
        m.id === aiMsgId ? { ...m, text: `_(AI 호출 실패 — ${errMsg})_` } : m,
      ));
      notify.error('AI 응답을 받지 못했어요', { description: errMsg });
    } finally {
      setBusy(false);
    }
  }

  function newThread(): void {
    const id = newThreadId();
    const meta: ThreadMeta = { id, title: '새 대화', updatedAt: Date.now(), msgCount: 0 };
    const next = [meta, ...threads];
    setThreads(next);
    saveThreads(next);
    setActiveId(id);
    setMsgs([]);
    setHistoryOpen(false);
    window.setTimeout(() => {
      const composer = panelRef.current?.querySelector<HTMLTextAreaElement>('textarea[aria-label="AI 입력"]');
      composer?.focus();
    }, 30);
  }

  function switchThread(id: string): void {
    if (id === activeId) {
      setHistoryOpen(false);
      return;
    }
    setActiveId(id);
    setHistoryOpen(false);
  }

  function deleteThread(id: string): void {
    if (!window.confirm('이 대화를 삭제할까요? 메시지는 복구할 수 없어요.')) return;
    dropMsgs(id);
    const next = threads.filter((t) => t.id !== id);
    setThreads(next);
    saveThreads(next);
    if (id === activeId) {
      if (next.length > 0) {
        setActiveId(next[0].id);
      } else {
        const nid = newThreadId();
        const meta: ThreadMeta = { id: nid, title: '새 대화', updatedAt: Date.now(), msgCount: 0 };
        setThreads([meta]);
        saveThreads([meta]);
        setActiveId(nid);
        setMsgs([]);
      }
    }
    notify.info('대화를 삭제했어요');
  }

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      ref={panelRef}
      data-page-ai-panel="wiki"
      data-page-ai-panel-open={open ? 'true' : 'false'}
      style={{ ['--wiki-ai-w' as string]: `${width}px` }}
      className={cn(
        'fixed inset-0 z-50 h-full w-full overflow-hidden sm:static sm:inset-auto sm:z-auto sm:shrink-0',
        PAGE_AI_PANEL_TRANSITION_CLASS,
        open
          ? 'translate-x-0 sm:w-[var(--wiki-ai-w)]'
          : 'translate-x-full pointer-events-none max-sm:hidden sm:w-0 sm:translate-x-0',
      )}
      role="complementary"
      aria-label="보조 도구"
      aria-hidden={!open}
    >
      {open && (
      <div
        className={cn(
          'relative h-full w-full flex flex-col sm:w-[var(--wiki-ai-w)]',
          PAGE_AI_PANEL_SURFACE_CLASS,
        )}
      >
      <PageAiResizeHandle
        open={open}
        width={width}
        minWidth={PAGE_AI_PANEL_WIDTH.min}
        maxWidth={PAGE_AI_PANEL_WIDTH.max}
        defaultWidth={PAGE_AI_PANEL_WIDTH.default}
        onWidthChange={setWidth}
        onWidthCommit={(next) => {
          try { window.localStorage.setItem(WIDTH_KEY, String(next)); } catch { /* */ }
        }}
        title="드래그해서 너비 조절 · Enter로 기본값"
        className="wiki-trans-color"
      />

      {/* 헤더 */}
      <PageAiPanelHeader
        title="보조 도구"
        icon={<Network className="h-3.5 w-3.5" aria-hidden />}
        iconTone="violet"
        onClose={onClose}
        leading={(
          <AuxiliaryToolTabs active={activeTool} onChange={setActiveTool} items={auxiliaryTools} />
        )}
        actions={activeTool === 'ai' ? (
          <span className="contents" data-page-ai-chat-actions="true">
            {activeTool === 'ai' && (
              <AuxiliaryReferenceSelect
                value={page ? ctxScope : 'all'}
                onChange={(value) => setCtxScope(value === 'page' && page ? 'page' : 'all')}
                options={page
                  ? [
                      { value: 'all', label: `전체 위키 ${ctxPageCount}` },
                      { value: 'page', label: '현재 문서' },
                    ]
                  : [{ value: 'all', label: `전체 위키 ${ctxPageCount}` }]}
              />
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                historyOpen
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="대화 목록"
              aria-label={`대화 목록 ${threads.length}개`}
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={newThread}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="새 대화 시작"
              aria-label="새 대화"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : undefined}
      />

      {activeTool === 'planner' ? (
        <AuxiliaryPlannerTool />
      ) : (
      <>
      {/* 대화 목록 시트 — 아래 영역과 구분 강화 (bg + 라벨 + inset shadow) */}
      {activeTool === 'ai' && historyOpen && (
        <div
          className="border-b-2 border-[hsl(var(--hairline))] bg-accent/40 max-h-[45%] overflow-y-auto shrink-0"
          style={{ boxShadow: 'inset 0 -6px 8px -6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(0,0,0,0.04)' }}
        >
          <div className="sticky top-0 z-[1] px-3 py-1 bg-accent/70 backdrop-blur-sm border-b border-[hsl(var(--hairline))] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              대화 목록 · {sortedThreads.length}
            </span>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground wiki-trans-color"
              title="목록 닫기"
            >
              접기
            </button>
          </div>
          {sortedThreads.length === 0 ? (
            <div className="p-3 text-[11.5px] text-muted-foreground">대화가 없어요</div>
          ) : (
            <ul className="py-1">
              {sortedThreads.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/60 wiki-trans-color',
                    t.id === activeId && 'bg-primary/10',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => switchThread(t.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className={cn(
                      'text-[12px] truncate',
                      t.id === activeId ? 'text-primary font-semibold' : 'text-foreground',
                    )}>
                      {t.title || '새 대화'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t.msgCount}개 메시지 · {formatTime(t.updatedAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive wiki-trans-color"
                    title="대화 삭제"
                    aria-label="대화 삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 메시지 영역 */}
      <div ref={scrollRef} className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-3')}>
        {msgs.length === 0 ? (
          <PageAiEmptyState
            title="위키 흐름을 어떻게 정리할까요?"
            description="현재 위키 내용을 참고해 답합니다."
          >
            <PageAiPromptSet label="위키 추천 요청">
              {EXAMPLES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <PageAiQuickAction
                    key={ex.prompt}
                    label={ex.label}
                    description={ex.description}
                    icon={<Icon className="h-3.5 w-3.5" aria-hidden />}
                    iconClassName={PAGE_AI_TONE_ICON[ex.tone]}
                    accentClassName={cn(PAGE_AI_TONE_DOT[ex.tone], ex.emphasized ? 'opacity-90' : 'opacity-55')}
                    emphasized={ex.emphasized}
                    onClick={() => void send(ex.prompt)}
                    showArrow
                  />
                );
              })}
            </PageAiPromptSet>
          </PageAiEmptyState>
        ) : (
          msgs.map((m) => (
            <MsgBubble
              key={m.id}
              msg={m}
              canAppend={!!onAppendToBody && !!page}
              canCreate={!!onCreatePageFromAnswer}
              onAppend={() => onAppendToBody?.(m.text)}
              onCreate={() => onCreatePageFromAnswer?.(deriveWikiPageTitleFromAnswer(m.text), m.text)}
            />
          ))
        )}
        {busy && (
          <PageAiTypingIndicator />
        )}
      </div>

      {/* 입력 */}
      <PageAiComposer
        draft={input}
        onDraftChange={setInput}
        onSend={(text) => { void send(text); }}
        loading={busy}
        placeholder="문서 요약, 연결 추천, 위키 흐름을 물어보세요..."
        autoFocus={open}
      />
      </>
      )}
      </div>
      )}
    </aside>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

/** 가벼운 markdown 렌더러 — 헤더 / 리스트 / 인라인(굵게·기울임·코드·링크). */
function MdLite({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listBuf: string[] = [];
  let olBuf: string[] = [];

  const flushUl = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-4 my-1 space-y-0.5">
        {listBuf.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
      </ul>,
    );
    listBuf = [];
  };
  const flushOl = () => {
    if (olBuf.length === 0) return;
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="list-decimal pl-4 my-1 space-y-0.5">
        {olBuf.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
      </ol>,
    );
    olBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulM = /^\s*[-*]\s+(.*)$/.exec(line);
    const olM = /^\s*\d+\.\s+(.*)$/.exec(line);
    const hM = /^(#{1,3})\s+(.*)$/.exec(line);
    if (ulM) {
      flushOl();
      listBuf.push(ulM[1]);
      continue;
    }
    if (olM) {
      flushUl();
      olBuf.push(olM[1]);
      continue;
    }
    flushUl();
    flushOl();
    if (hM) {
      const level = hM[1].length;
      const cls = level === 1 ? 'text-[14px] font-bold mt-1.5 mb-0.5'
        : level === 2 ? 'text-[13px] font-bold mt-1.5 mb-0.5'
        : 'text-[12.5px] font-semibold mt-1 mb-0.5';
      blocks.push(<div key={`h-${i}`} className={cls}>{renderInline(hM[2])}</div>);
    } else if (line.trim() === '') {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
    } else {
      blocks.push(<div key={`p-${i}`}>{renderInline(line)}</div>);
    }
  }
  flushUl();
  flushOl();
  return <>{blocks}</>;
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      parts.push(<code key={key++} className="px-1 py-px rounded bg-muted text-[11.5px] font-mono">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key++} className="font-bold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      parts.push(<em key={key++} className="italic">{tok.slice(1, -1)}</em>);
    } else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (lm) {
        parts.push(<a key={key++} href={lm[2]} target="_blank" rel="noreferrer" className="text-primary underline">{lm[1]}</a>);
      } else {
        parts.push(tok);
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MsgBubble({
  msg,
  canAppend,
  canCreate,
  onAppend,
  onCreate,
}: {
  msg: AiMsg;
  canAppend: boolean;
  canCreate: boolean;
  onAppend: () => void;
  onCreate: () => void;
}) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const canCopy = !isUser && msg.text.trim().length > 0;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      notify.success('AI 답변을 복사했어요', { duration: 1200 });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      notify.error('클립보드 접근에 실패했어요');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <PageAiMessageBubble
        role={isUser ? 'user' : 'assistant'}
        bubbleClassName={cn(!isUser && 'wiki-ai-md')}
      >
        {isUser ? msg.text : <MdLite text={msg.text} />}
      </PageAiMessageBubble>
      {canCopy && (
        <PageAiMessageActions>
          <PageAiMessageActionButton
            onClick={handleCopy}
            title="AI 답변 복사"
            icon={copied ? <Check className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
          >
            {copied ? '복사됨' : '복사'}
          </PageAiMessageActionButton>
          {canAppend && (
            <PageAiMessageActionButton
              onClick={onAppend}
              title="현재 문서 본문 끝에 추가"
              icon={<BookOpen className="h-3 w-3" />}
            >
              본문에 추가
            </PageAiMessageActionButton>
          )}
          {canCreate && (
            <PageAiMessageActionButton
              onClick={onCreate}
              title="이 답변으로 새 문서 만들기"
              icon={<PlusIcon className="h-3 w-3" />}
            >
              새 문서로
            </PageAiMessageActionButton>
          )}
        </PageAiMessageActions>
      )}
    </div>
  );
}

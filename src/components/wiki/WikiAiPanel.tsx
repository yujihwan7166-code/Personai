import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bot, X, Send, Trash2, FileText, Plus as PlusIcon,
  BookOpen, MessageSquarePlus, History, Library,
} from 'lucide-react';
import type { WikiPage } from '@/types/wiki';
import type { Expert } from '@/types/expert';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { streamExpert } from '@/pages/indexRuntime';

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
const WIDTH_KEY = 'wiki_ai_panel_w';
const MIN_W = 320;
const MAX_W = 720;
const DEFAULT_W = 380;

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
  const r = Number(window.localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(r) && r >= MIN_W && r <= MAX_W ? r : DEFAULT_W;
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
  '이 페이지 핵심 3줄로 요약해줘',
  '내 위키 전체 흐름 한눈에 정리해줘',
  '요즘 글쓰기 막막한데 도와줄래?',
  '관련된 위키 페이지 추천해줘',
];

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
  const [width, setWidth] = useState<number>(() => loadWidth());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // 열릴 때 자동 포커스
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // ESC — history 열려 있으면 닫기, 아니면 패널 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (historyOpen) setHistoryOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, historyOpen]);

  // 리사이즈 — 좌측 핸들 드래그
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX)));
      setWidth(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        try { window.localStorage.setItem(WIDTH_KEY, String(w)); } catch { /* */ }
        return w;
      });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  const ctxPayload = useMemo(() => {
    if (ctxScope === 'page' && page) {
      return `현재 보고 있는 페이지:\n제목: ${page.title}\n\n${page.body.slice(0, 800)}`;
    }
    if (allPages && allPages.length > 0) {
      const lines = allPages.slice(0, 30).map((p) => {
        const firstLine = p.body.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
        return `- ${p.title}${firstLine ? ` — ${firstLine.slice(0, 80)}` : ''}`;
      });
      const more = allPages.length > 30 ? `\n(외 ${allPages.length - 30}개 더)` : '';
      return `사용자의 위키 페이지 목록 (${allPages.length}개):\n${lines.join('\n')}${more}`;
    }
    return totalPages > 0 ? `위키 페이지 ${totalPages}개` : '';
  }, [ctxScope, page, allPages, totalPages]);

  async function send(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy || !activeId) return;

    const userMsg: AiMsg = { id: newId(), role: 'user', text: q, ts: Date.now(), ctxPageId: page?.id };
    const aiMsgId = newId();
    const aiMsg: AiMsg = { id: aiMsgId, role: 'assistant', text: '', ts: Date.now(), ctxPageId: page?.id };
    setMsgs((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setBusy(true);

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
    window.setTimeout(() => inputRef.current?.focus(), 30);
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

  if (!open) return null;

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      style={{ width }}
      className={cn(
        'fixed top-0 right-0 h-full',
        'bg-background border-l border-[hsl(var(--hairline))] shadow-xl',
        'flex flex-col wiki-z-popover wiki-ai-panel-enter',
      )}
      role="complementary"
      aria-label="마이위키 AI 도우미 패널"
    >
      {/* 좌측 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 wiki-trans-color z-10"
        title="드래그해서 너비 조절"
        aria-label="너비 조절"
        role="separator"
      />

      {/* 헤더 */}
      <header className="h-9 px-2.5 border-b border-[hsl(var(--hairline))] flex items-center gap-1 shrink-0">
        <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
        <h2 className="flex-1 text-[12.5px] font-bold truncate">마이위키 AI 도우미</h2>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className={cn(
            'h-6 px-1.5 inline-flex items-center gap-1 rounded text-[10.5px] wiki-trans-color',
            historyOpen
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title="대화 목록"
        >
          <History className="h-3 w-3" />
          <span>대화 {threads.length > 0 && `(${threads.length})`}</span>
        </button>
        <button
          type="button"
          onClick={newThread}
          className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="새 대화 시작"
          aria-label="새 대화"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="닫기 (Esc)"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* 대화 목록 시트 */}
      {historyOpen && (
        <div className="border-b border-[hsl(var(--hairline))] bg-muted/20 max-h-[45%] overflow-y-auto shrink-0">
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

      {/* 참조 범위 — 컴팩트: 라벨 inline + h-6 pills */}
      <div className="px-2.5 py-1 border-b border-[hsl(var(--hairline))] flex items-center gap-1.5 shrink-0 bg-primary/[0.03]">
        <span className="text-[10.5px] font-semibold text-foreground/75 shrink-0">참조</span>
        <button
          type="button"
          onClick={() => setCtxScope('all')}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] border wiki-trans-color',
            ctxScope === 'all'
              ? 'bg-primary text-primary-foreground border-primary font-semibold'
              : 'bg-background text-foreground/70 border-[hsl(var(--hairline))] hover:bg-accent hover:text-foreground hover:border-foreground/20',
          )}
          title={`전체 위키 — ${totalPages}페이지`}
        >
          <Library className="h-3 w-3" />
          <span>전체 위키</span>
          {totalPages > 0 && (
            <span className={cn(
              'tabular-nums text-[10px] px-1 rounded-full',
              ctxScope === 'all'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}>
              {totalPages}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => page && setCtxScope('page')}
          disabled={!page}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] border wiki-trans-color min-w-0',
            ctxScope === 'page' && page
              ? 'bg-primary text-primary-foreground border-primary font-semibold'
              : 'bg-background text-foreground/70 border-[hsl(var(--hairline))] hover:bg-accent hover:text-foreground hover:border-foreground/20',
            'disabled:opacity-40 disabled:hover:bg-background disabled:hover:border-[hsl(var(--hairline))] disabled:cursor-not-allowed',
          )}
          title={page ? `현재 문서 — ${page.title}` : '활성 페이지가 없어요'}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[140px]">
            {page ? page.title : '현재 문서'}
          </span>
        </button>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              사이드바 AI 비서예요. 일반 질문도 받고, 위키 페이지를 보고 있으면 그 내용도 참고해 답해요.
            </p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void send(ex)}
                  className="text-left px-2.5 py-1.5 rounded-md text-[11.5px] bg-accent/40 hover:bg-accent text-foreground/80 wiki-trans-color"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m) => (
            <MsgBubble
              key={m.id}
              msg={m}
              canAppend={!!onAppendToBody && !!page}
              canCreate={!!onCreatePageFromAnswer}
              onAppend={() => onAppendToBody?.(m.text)}
              onCreate={() => onCreatePageFromAnswer?.(m.text.slice(0, 40).replace(/\n/g, ' '), m.text)}
            />
          ))
        )}
        {busy && (
          <div className="text-[11px] text-muted-foreground italic">생각하는 중…</div>
        )}
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-[hsl(var(--hairline))] p-2 flex items-end gap-2 shrink-0"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="무엇이든 물어보세요…"
          rows={2}
          className="flex-1 resize-none rounded-md border border-[hsl(var(--hairline))] bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 wiki-trans-color"
          title="보내기 (Enter)"
          aria-label="보내기"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
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
  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed',
          isUser
            ? 'bg-primary/10 text-foreground whitespace-pre-wrap'
            : 'bg-accent/60 text-foreground/90 wiki-ai-md',
        )}
      >
        {isUser ? msg.text : <MdLite text={msg.text} />}
      </div>
      {!isUser && msg.text.trim().length > 0 && (canAppend || canCreate) && (
        <div className="flex items-center gap-1.5 pl-1 pt-0.5">
          {canAppend && (
            <button
              type="button"
              onClick={onAppend}
              className="inline-flex items-center gap-1 px-2 h-6 rounded-full border border-[hsl(var(--hairline))] bg-background text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 wiki-trans-color"
              title="현재 페이지 본문 끝에 추가"
            >
              <BookOpen className="h-3 w-3" /> 본문에 추가
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1 px-2 h-6 rounded-full border border-[hsl(var(--hairline))] bg-background text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 wiki-trans-color"
              title="이 답변으로 새 페이지 만들기"
            >
              <PlusIcon className="h-3 w-3" /> 새 페이지로
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Sparkles, X, Send, Trash2, FileText, Plus as PlusIcon, BookOpen } from 'lucide-react';
import type { WikiPage } from '@/types/wiki';
import type { Expert } from '@/types/expert';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { streamExpert } from '@/pages/indexRuntime';

/**
 * 마이위키 AI 사이드 패널
 *
 * - 위치: 본문 오른쪽 슬라이드 인 (360px)
 * - 컨텍스트: 활성 페이지가 있으면 *제목 + 본문 첫 800자* 자동 첨부 (제거 가능)
 * - 스레드: 페이지별 독립 (localStorage). 대문은 글로벌 스레드 1개.
 * - AI: streamExpert (메인 채팅 인프라 재사용) + OpenRouter 기본 모델.
 *   페이지 컨텍스트는 previousResponses 로 주입, 외부 검색 disable (위키 컨텍스트만).
 */

type Role = 'user' | 'assistant';
interface AiMsg {
  id: string;
  role: Role;
  text: string;
  ts: number;
  /** 답변 시 첨부됐던 컨텍스트 페이지 id (있으면) */
  ctxPageId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 활성 페이지. null = 대문 / 그래프 (글로벌 스레드) */
  page: WikiPage | null;
  /** 전체 페이지 — 글로벌 컨텍스트 (제목+요약) 생성용. 없으면 메타만. */
  allPages?: WikiPage[];
  /** 위키 메타 — page=null + allPages 미제공 시 fallback */
  totalPages: number;
  /** AI 답변 → 본문 끝에 인용블록 추가 (활성 페이지가 있을 때만 활성) */
  onAppendToBody?: (snippet: string) => void;
  /** AI 답변 → 새 draft 페이지로 만들기 */
  onCreatePageFromAnswer?: (title: string, body: string) => void;
}

const STORAGE_PREFIX = 'wiki_ai_thread:';
const GLOBAL_KEY = STORAGE_PREFIX + '__global__';

function threadKey(pageId: string | null): string {
  return pageId ? STORAGE_PREFIX + pageId : GLOBAL_KEY;
}

function loadThread(key: string): AiMsg[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThread(key: string, msgs: AiMsg[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(msgs.slice(-200)));
  } catch {
    /* quota — 무시 */
  }
}

function newId(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const EXAMPLES_PAGE = [
  '이 페이지 핵심 3줄로 요약해줘',
  '관련된 위키 페이지 추천해줘',
  '이 내용에서 빠진 관점 짚어줘',
];
const EXAMPLES_GLOBAL = [
  '내 위키 전체 흐름 한눈에 정리해줘',
  '오랫동안 안 본 페이지 알려줘',
  '비슷한 주제로 묶어서 메인 문서 만들 후보',
];

/** 위키 AI 전용 dummy Expert — streamExpert 가 systemPrompt 만 사용. */
const WIKI_AI_EXPERT: Expert = {
  id: 'wiki-ai',
  name: 'Wiki AI',
  nameKo: '위키 AI',
  icon: '✨',
  color: 'blue',
  category: 'ai',
  description: '마이위키 보조 AI',
  systemPrompt: [
    '당신은 사용자의 개인 위키(마이위키)를 보조하는 AI입니다.',
    '페이지 컨텍스트가 첨부되면 그것을 우선 참고해 정확하고 간결하게 답하세요.',
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
  const tkey = threadKey(page?.id ?? null);
  const [msgs, setMsgs] = useState<AiMsg[]>(() => loadThread(tkey));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ctxOn, setCtxOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 페이지 변경 시 해당 스레드 로드
  useEffect(() => {
    setMsgs(loadThread(tkey));
    setCtxOn(true);
  }, [tkey]);

  // 메시지 변경 시 저장 + 스크롤 하단
  useEffect(() => {
    saveThread(tkey, msgs);
    queueMicrotask(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [msgs, tkey]);

  // 열릴 때 자동 포커스
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const ctxLabel = useMemo(() => {
    if (page) return `📄 ${page.title}`;
    return `🌐 위키 전체 (${totalPages}페이지)`;
  }, [page, totalPages]);

  const ctxPayload = useMemo(() => {
    if (!ctxOn) return '';
    if (page) return `${page.title}\n\n${page.body.slice(0, 800)}`;
    if (allPages && allPages.length > 0) {
      // 글로벌 모드 — 페이지 목록을 컨텍스트로 (제목 + 첫 줄 요약).
      // 너무 길어지지 않게 30개 제한 + 줄당 80자.
      const lines = allPages.slice(0, 30).map((p) => {
        const firstLine = p.body.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
        return `- ${p.title}${firstLine ? ` — ${firstLine.slice(0, 80)}` : ''}`;
      });
      const more = allPages.length > 30 ? `\n(외 ${allPages.length - 30}개 더)` : '';
      return `사용자의 위키 페이지 목록 (${allPages.length}개):\n${lines.join('\n')}${more}`;
    }
    return `위키 페이지 ${totalPages}개`;
  }, [ctxOn, page, allPages, totalPages]);

  const examples = page ? EXAMPLES_PAGE : EXAMPLES_GLOBAL;

  async function send(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy) return;

    const userMsg: AiMsg = { id: newId(), role: 'user', text: q, ts: Date.now(), ctxPageId: page?.id };
    const aiMsgId = newId();
    const aiMsg: AiMsg = { id: aiMsgId, role: 'assistant', text: '', ts: Date.now(), ctxPageId: page?.id };
    setMsgs((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setBusy(true);

    // 컨텍스트(현재 페이지 본문 또는 위키 메타) 를 previousResponses 로 전달.
    // 메인 채팅의 expert 패턴 재사용 — system 다음에 합성됨.
    const previousResponses = ctxPayload
      ? [{ name: '컨텍스트', content: ctxPayload }]
      : [];

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
          // 응답이 비어 있으면 안내 메시지로 교체.
          if (!accumulated.trim()) {
            setMsgs((prev) => prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: '_(응답이 비어 있어요. 다시 시도해 주세요)_' } : m,
            ));
          }
        },
        // 위키 컨텍스트만 사용 — 외부 검색 비활성화 (Q&A 안정성).
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

  function clearThread(): void {
    setMsgs([]);
    notify.info('스레드를 비웠어요');
  }

  if (!open) return null;

  return (
    <aside
      className={cn(
        'fixed top-0 right-0 h-full w-full max-w-[360px] sm:max-w-[380px]',
        'bg-background border-l border-[hsl(var(--hairline))] shadow-xl',
        'flex flex-col wiki-z-popover wiki-ai-panel-enter',
      )}
      role="complementary"
      aria-label="AI 채팅 패널"
    >
      {/* 헤더 */}
      <header className="h-12 px-3 border-b border-[hsl(var(--hairline))] flex items-center gap-2 shrink-0">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h2 className="flex-1 text-[13px] font-bold truncate">AI 보조</h2>
        <button
          type="button"
          onClick={clearThread}
          disabled={msgs.length === 0}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent wiki-trans-color"
          title="스레드 비우기"
          aria-label="스레드 비우기"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="닫기 (Esc / Ctrl+J)"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* 컨텍스트 칩 */}
      <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] flex items-center gap-2 shrink-0 bg-muted/20">
        <button
          type="button"
          onClick={() => setCtxOn((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[11px] wiki-trans-color',
            ctxOn
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground line-through',
          )}
          title={ctxOn ? '컨텍스트 끄기' : '컨텍스트 켜기'}
        >
          <FileText className="h-3 w-3" />
          <span className="truncate max-w-[220px]">{ctxLabel}</span>
        </button>
        <span className="text-[10px] text-muted-foreground/70 truncate">{ctxOn ? '첨부됨' : '미첨부'}</span>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {page
                ? '이 페이지에 대해 묻거나, 정리·연결을 부탁해보세요.'
                : '위키 전체에 대해 묻거나, 페이지를 찾아달라고 해보세요.'}
            </p>
            <div className="flex flex-col gap-1.5">
              {examples.map((ex) => (
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
          placeholder={page ? '이 페이지에 대해 묻기…' : '위키 전체에 대해 묻기…'}
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
  // 토큰: `code`, **bold**, *italic*, [text](url)
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

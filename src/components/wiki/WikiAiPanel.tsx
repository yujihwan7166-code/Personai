import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Send, Trash2, FileText, Plus as PlusIcon, BookOpen } from 'lucide-react';
import type { WikiPage } from '@/types/wiki';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

/**
 * 마이위키 AI 사이드 패널
 *
 * - 위치: 본문 오른쪽 슬라이드 인 (360px)
 * - 컨텍스트: 활성 페이지가 있으면 *제목 + 본문 첫 800자* 자동 첨부 (제거 가능)
 * - 스레드: 페이지별 독립 (localStorage). 대문은 글로벌 스레드 1개.
 * - AI 통합: 현재는 placeholder 응답. 실 프로바이더 hook 은 별도 PR.
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
  /** 위키 메타 — page=null 일 때 컨텍스트로 사용 */
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

/** 실 AI 통합 전 임시 응답기. 추후 useWikiAiProvider 훅으로 교체. */
async function simulateAiReply(question: string, ctx: string): Promise<string> {
  // 가벼운 latency 시뮬레이션 (실 모델 호출 자리)
  await new Promise((r) => setTimeout(r, 600));
  const trimmed = question.trim().slice(0, 80);
  return [
    '_(AI 통합 전 — 임시 응답입니다)_',
    '',
    `> 질문: ${trimmed}`,
    ctx ? `> 컨텍스트: ${ctx.slice(0, 60)}…` : '> 컨텍스트: (없음)',
    '',
    '실 AI 프로바이더가 연결되면 이 자리에 위키 컨텍스트를 반영한 답변이 표시됩니다. 우측 상단 휴지통으로 스레드 비우기 가능.',
  ].join('\n');
}

export function WikiAiPanel({
  open,
  onClose,
  page,
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
    return `위키 페이지 ${totalPages}개`;
  }, [ctxOn, page, totalPages]);

  const examples = page ? EXAMPLES_PAGE : EXAMPLES_GLOBAL;

  async function send(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy) return;
    const userMsg: AiMsg = { id: newId(), role: 'user', text: q, ts: Date.now(), ctxPageId: page?.id };
    setMsgs((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const reply = await simulateAiReply(q, ctxPayload);
      const aiMsg: AiMsg = { id: newId(), role: 'assistant', text: reply, ts: Date.now(), ctxPageId: page?.id };
      setMsgs((prev) => [...prev, aiMsg]);
    } catch {
      notify.error('AI 응답을 받지 못했어요');
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
          className="flex-1 resize-none rounded-md border border-[hsl(var(--hairline))] bg-background px-2 py-1.5 text-[12.5px] outline-none focus:border-primary/50 wiki-trans-color"
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
          'max-w-[90%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary/10 text-foreground'
            : 'bg-accent/60 text-foreground/90',
        )}
      >
        {msg.text}
      </div>
      {!isUser && (canAppend || canCreate) && (
        <div className="flex items-center gap-1 pl-1">
          {canAppend && (
            <button
              type="button"
              onClick={onAppend}
              className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
              title="현재 페이지 본문 끝에 추가"
            >
              <BookOpen className="h-3 w-3" /> 본문에 추가
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
              title="이 답변으로 새 페이지 만들기"
            >
              <PlusIcon className="h-3 w-3" /> 새 페이지
            </button>
          )}
        </div>
      )}
    </div>
  );
}

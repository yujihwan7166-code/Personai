/**
 * AI 사이드바 — 4개 화면 공통.
 *
 * 구조:
 *  - 헤더: 제목 + 컨텍스트 칩 + 닫기
 *  - 본문: 메시지 목록 (스크롤) / 빈 상태일 때 빠른 액션 칩 + 안내
 *  - 푸터: textarea + 보내기 + 대화 초기화
 *
 * - lg 이상: 우측 inline 사이드바 320px
 * - lg 미만: fixed 풀스크린 overlay + backdrop (Esc 또는 backdrop 클릭으로 닫기)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Send, RefreshCw, AlertTriangle, Copy as CopyIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { QUICK_ACTIONS } from '@/lib/cloudAi/prompts';
import type { AiContext, ChatMessage } from '@/lib/cloudAi/types';

interface AiSidebarProps {
  open: boolean;
  onClose: () => void;
  context: AiContext;
  messages: ChatMessage[];
  sending: boolean;
  onSend: (text: string) => void | Promise<void>;
  /** 마지막 user 메시지로 응답 재생성. 미제공이면 retry 버튼 X. */
  onRetry?: () => void | Promise<void>;
  onClear: () => void;
  /** 컨텍스트 칩 클릭 시 화면별 동작 (예: 시트 → selBounds 로 jump). 선택 사항 */
  onContextClick?: () => void;
}

export function AiSidebar({
  open, onClose, context, messages, sending, onSend, onRetry, onClear, onContextClick,
}: AiSidebarProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 새 메시지 / 로딩 → 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // 사이드바 열리면 입력창 포커스
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Esc 닫기 (모바일 풀스크린 시 특히 유용)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const t = e.target as HTMLElement | null;
        // 입력창 안에서 esc 면 닫지 말고 그냥 blur 만
        if (t?.tagName === 'TEXTAREA' || t?.tagName === 'INPUT') return;
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    void onSend(text);
  }, [draft, sending, onSend]);

  const handleQuickAction = useCallback((prompt: string) => {
    if (sending) return;
    void onSend(prompt);
  }, [sending, onSend]);

  if (!open) return null;

  const quickActions = QUICK_ACTIONS[context.kind];
  const isEmpty = messages.length === 0;

  return (
    <>
      {/* 모바일 backdrop — lg 미만에서만 보임 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'bg-background flex flex-col shrink-0',
          // 모바일: fixed 풀스크린
          'fixed inset-0 z-50',
          // lg 이상: in-flow column. 화면이 클수록 더 넓게 (본문 가독성 유지하면서 채팅 영역 확보).
          // lg: 384px, xl: 448px, 2xl: 512px. min-h-0 로 자식 flex-1 overflow 가 부모 높이를 넘지 않도록 강제.
          'lg:static lg:inset-auto lg:z-auto lg:border-l lg:border-border lg:h-full lg:min-h-0',
          'lg:w-96 xl:w-[28rem] 2xl:w-[32rem]',
        )}
        role="complementary"
        aria-label="AI 어시스턴트"
      >
      {/* 헤더 */}
      <div className="border-b border-border px-3 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-500" aria-hidden />
        <span className="text-sm font-medium">AI 어시스턴트</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 rounded hover:bg-muted"
          aria-label="사이드바 닫기"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 컨텍스트 칩 */}
      {context.summary && (
        <button
          type="button"
          onClick={onContextClick}
          disabled={!onContextClick}
          className={cn(
            'text-left text-xs px-3 py-1.5 border-b border-border bg-muted/30 truncate',
            onContextClick && 'hover:bg-muted cursor-pointer',
            !onContextClick && 'cursor-default',
          )}
          title={`현재 컨텍스트: ${context.summary}`}
        >
          <span className="text-muted-foreground">컨텍스트: </span>
          <span className="font-medium">{context.summary}</span>
        </button>
      )}

      {/* 본문 — 메시지 목록 또는 빈 상태.
          overscroll-contain: 메시지 끝까지 스크롤 후 휠이 부모(클라우드 본문)로 전파되는 걸 막아 스크롤 분리.
          min-h-0: 부모 flex column 안에서 자체 스크롤이 정상 작동하도록 보장. */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
        {isEmpty ? (
          <div className="space-y-3 py-4">
            <div className="text-center text-sm text-muted-foreground">
              👋 무엇을 도와드릴까요?
            </div>
            {context.summary && (
              <div className="text-center text-[11px] text-muted-foreground/80 px-2">
                현재 컨텍스트로 바로 시작할 수 있어요
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {quickActions.map((qa) => (
                <button
                  key={qa.id}
                  type="button"
                  onClick={() => handleQuickAction(qa.prompt)}
                  disabled={sending}
                  className="text-left px-3 py-2 rounded border border-border bg-background hover:bg-muted hover:border-foreground/30 text-sm disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-violet-500 inline mr-1.5 -mt-0.5" aria-hidden />
                  {qa.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center pt-2">
              또는 아래에 자유롭게 질문하세요.
            </div>
          </div>
        ) : (
          messages.map((m) =>
            // 빈 assistant 메시지 (streaming 시작 직전) 는 bubble 숨김 — spinner 가 대신
            m.role === 'assistant' && m.content === '' ? null : (
              <MessageBubble key={m.id} message={m} />
            ),
          )
        )}
        {/* 응답 시작 전 spinner — 마지막 assistant 메시지가 아직 비어 있을 때만 */}
        {sending && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        )}
      </div>

      {/* 푸터 — 입력창 */}
      <div className="border-t border-border p-2">
        {!isEmpty && (
          <div className="flex justify-between items-center pb-1.5">
            <span className="text-[10px] text-muted-foreground">{messages.length}개 메시지</span>
            <div className="flex items-center gap-0.5">
              {onRetry && messages.some((m) => m.role === 'user') && (
                <button
                  type="button"
                  onClick={() => { void onRetry(); }}
                  disabled={sending}
                  className="text-[11px] px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 disabled:opacity-40"
                  title="마지막 질문을 다시 보내 응답 재생성"
                >
                  ↻ 재시도
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (messages.length === 0) return;
                  if (window.confirm(`이 대화의 메시지 ${messages.length}개를 모두 삭제할까요? 되돌릴 수 없습니다.`)) {
                    onClear();
                  }
                }}
                className="text-[11px] px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1"
                title="대화 초기화 (모든 메시지 삭제)"
              >
                <RefreshCw className="w-3 h-3" /> 새 대화
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="질문 또는 명령을 입력…"
            rows={2}
            disabled={sending}
            className="flex-1 min-h-[36px] max-h-[120px] resize-none px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-foreground/40 text-sm disabled:opacity-60"
            aria-label="AI 입력"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="p-2 rounded bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="보내기"
            title="보내기 (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const canCopy = !isUser && !message.error && message.content.length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({ title: 'AI 응답 복사됨' });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({ title: '클립보드 접근 실패' });
    }
  };

  return (
    <div className={cn('flex group', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm break-words relative',
          isUser
            ? 'bg-foreground text-background whitespace-pre-wrap'
            : message.error
              ? 'bg-destructive/10 text-destructive border border-destructive/30 whitespace-pre-wrap'
              : 'bg-muted text-foreground',
        )}
      >
        {message.error && (
          <span className="inline-flex items-center gap-1 text-xs font-medium mb-1">
            <AlertTriangle className="w-3 h-3" />
            에러
          </span>
        )}
        {isUser || message.error ? (
          message.content
        ) : (
          <div className="markdown-msg [&>*+*]:mt-1.5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-foreground/10 [&_code]:text-[0.85em] [&_code]:font-mono [&_pre]:p-2 [&_pre]:rounded [&_pre]:bg-foreground/10 [&_pre]:overflow-x-auto [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:font-semibold [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_a]:text-violet-600 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/30 [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute -top-2 -right-2 p-1 rounded border border-border bg-background shadow-sm transition-opacity',
              copied ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground',
            )}
            title={copied ? '복사됨' : 'AI 응답 복사'}
            aria-label="AI 응답 복사"
          >
            {copied ? <Check className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

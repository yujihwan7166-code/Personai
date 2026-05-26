import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy as CopyIcon,
  FileText,
  Heading,
  ListChecks,
  MessageCircleQuestion,
  Search,
  Sparkles,
  Tags,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
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
  PageAiComposer,
  PageAiContextStrip,
  PageAiEmptyState,
  PageAiMessageActionButton,
  PageAiMessageActions,
  PageAiMessageBubble,
  PageAiPromptSet,
  PageAiQuickAction,
  PageAiResizeHandle,
  PageAiTypingIndicator,
} from '@/components/PageAiScaffold';
import { QUICK_ACTIONS } from '@/lib/cloudAi/prompts';
import type { AiContext, AiKind, ChatMessage } from '@/lib/cloudAi/types';

interface QuickActionVisual {
  icon: LucideIcon;
  tone: PageAiTone;
  emphasized?: boolean;
}

const QUICK_ACTION_VISUALS: Partial<Record<AiKind, Record<string, QuickActionVisual>>> = {
  memo: {
    summarize: { icon: FileText, tone: 'blue', emphasized: true },
    tasks: { icon: ListChecks, tone: 'amber', emphasized: true },
    title: { icon: Heading, tone: 'violet' },
    tags: { icon: Tags, tone: 'emerald' },
  },
  journal: {
    reflect: { icon: BookOpen, tone: 'emerald', emphasized: true },
    question: { icon: MessageCircleQuestion, tone: 'blue', emphasized: true },
    title: { icon: Heading, tone: 'violet' },
    pattern: { icon: Search, tone: 'amber' },
  },
};

function getQuickActionVisual(kind: AiKind, id: string, index: number): QuickActionVisual {
  return QUICK_ACTION_VISUALS[kind]?.[id] ?? {
    icon: Sparkles,
    tone: index === 0 ? 'blue' : index === 1 ? 'amber' : index === 2 ? 'violet' : 'emerald',
    emphasized: index < 2,
  };
}

function getHeaderVisual(kind: AiKind): QuickActionVisual {
  if (kind === 'memo') return { icon: FileText, tone: 'blue' };
  if (kind === 'journal') return { icon: BookOpen, tone: 'emerald' };
  return { icon: Sparkles, tone: 'violet' };
}

function aiWidthStorageKey(kind: AiKind): string {
  return `personai.ai-panel.width.${kind}`;
}

function clampAiWidth(next: number): number {
  return clampPageAiPanelWidth(next);
}

function loadAiWidth(kind: AiKind): number {
  if (typeof window === 'undefined') return PAGE_AI_PANEL_WIDTH.default;
  try {
    const raw = window.localStorage.getItem(aiWidthStorageKey(kind));
    if (raw === null || raw.trim() === '') return PAGE_AI_PANEL_WIDTH.default;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampAiWidth(parsed) : PAGE_AI_PANEL_WIDTH.default;
  } catch {
    return PAGE_AI_PANEL_WIDTH.default;
  }
}

function saveAiWidth(kind: AiKind, width: number): void {
  try {
    window.localStorage.setItem(aiWidthStorageKey(kind), String(clampAiWidth(width)));
  } catch {
    /* private mode / quota */
  }
}

interface AiSidebarProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  inputPlaceholder?: string;
  context: AiContext;
  messages: ChatMessage[];
  sending: boolean;
  onSend: (text: string) => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  onClear: () => void;
  onContextClick?: () => void;
}

export function AiSidebar({
  open,
  onClose,
  title = 'AI 어시스턴트',
  subtitle,
  emptyTitle = '무엇을 도와드릴까요?',
  emptyDescription = '현재 화면의 내용을 참고해 답합니다.',
  inputPlaceholder = '질문하거나 정리할 내용을 입력...',
  context,
  messages,
  sending,
  onSend,
  onRetry,
  onClear,
  onContextClick,
}: AiSidebarProps) {
  const [draft, setDraft] = useState('');
  const [width, setWidth] = useState(() => loadAiWidth(context.kind));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWidth(loadAiWidth(context.kind));
  }, [context.kind]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  useEscapeKey(() => onClose(), { enabled: open });

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || sending) return;
    void onSend(text);
  }, [sending, onSend]);

  const handleQuickAction = useCallback((prompt: string) => {
    if (sending) return;
    void onSend(prompt);
  }, [sending, onSend]);

  if (!open) return null;

  const quickActions = QUICK_ACTIONS[context.kind] ?? [];
  const isEmpty = messages.length === 0;
  const headerVisual = getHeaderVisual(context.kind);
  const HeaderIcon = headerVisual.icon;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/35 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        data-page-ai-panel={context.kind}
        data-page-ai-panel-open="true"
        className={cn(
          'fixed inset-0 z-50 flex shrink-0 flex-col overflow-hidden',
          PAGE_AI_PANEL_SURFACE_CLASS,
          PAGE_AI_PANEL_TRANSITION_CLASS,
          'lg:relative lg:inset-auto lg:z-auto lg:h-full lg:min-h-0 lg:w-[var(--ai-sidebar-w)]',
        )}
        style={{ ['--ai-sidebar-w' as string]: `${width}px` }}
        role="complementary"
        aria-label={title}
      >
        <PageAiResizeHandle
          open={open}
          width={width}
          minWidth={PAGE_AI_PANEL_WIDTH.min}
          maxWidth={PAGE_AI_PANEL_WIDTH.max}
          defaultWidth={PAGE_AI_PANEL_WIDTH.default}
          onWidthChange={setWidth}
          onWidthCommit={(next) => saveAiWidth(context.kind, next)}
        />

        <PageAiPanelHeader
          title={title}
          subtitle={subtitle ?? context.summary}
          icon={<HeaderIcon className="h-3.5 w-3.5" aria-hidden />}
          iconTone={headerVisual.tone}
          onClose={onClose}
          actions={!isEmpty && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`대화의 메시지 ${messages.length}개를 모두 삭제할까요?`)) onClear();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="대화 비우기"
              aria-label="대화 비우기"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        />

        {context.summary && (
          <PageAiContextStrip
            summary={context.summary}
            title={`현재 참조: ${context.summary}`}
            onClick={onContextClick}
            className={!onContextClick ? 'cursor-default' : undefined}
          />
        )}

        <div ref={scrollRef} className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-3')}>
          {isEmpty ? (
            <PageAiEmptyState title={emptyTitle} description={emptyDescription}>
              <PageAiPromptSet label={`${title} 추천 요청`}>
                {quickActions.map((qa, index) => {
                  const visual = getQuickActionVisual(context.kind, qa.id, index);
                  const Icon = visual.icon;
                  return (
                    <PageAiQuickAction
                      key={qa.id}
                      label={qa.label}
                      description={qa.description}
                      icon={<Icon className="h-3.5 w-3.5" aria-hidden />}
                      iconClassName={PAGE_AI_TONE_ICON[visual.tone]}
                      accentClassName={cn(PAGE_AI_TONE_DOT[visual.tone], visual.emphasized ? 'opacity-90' : 'opacity-55')}
                      emphasized={visual.emphasized}
                      onClick={() => handleQuickAction(qa.prompt)}
                      disabled={sending}
                      showArrow
                    />
                  );
                })}
              </PageAiPromptSet>
            </PageAiEmptyState>
          ) : (
            messages.map((m) =>
              m.role === 'assistant' && m.content === '' ? null : (
                <MessageBubble key={m.id} message={m} />
              ),
            )
          )}
          {sending && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
            <PageAiTypingIndicator />
          )}
        </div>

        {!isEmpty && onRetry && messages.some((m) => m.role === 'user') && (
          <div className="shrink-0 border-t border-[hsl(var(--hairline))] bg-card/45 px-2.5 pt-2.5">
            <div className="mb-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => { void onRetry(); }}
                disabled={sending}
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                다시 생성
              </button>
            </div>
          </div>
        )}
        <PageAiComposer
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          loading={sending}
          placeholder={inputPlaceholder}
          autoFocus={open}
          className={cn(!isEmpty && onRetry && messages.some((m) => m.role === 'user') && 'border-t-0 pt-0')}
        />
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
      toast({ title: 'AI 답변을 복사했어요' });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({ title: '클립보드 접근에 실패했어요' });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <PageAiMessageBubble role={isUser ? 'user' : 'assistant'} tone={message.error ? 'error' : 'default'}>
        {message.error && (
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
        )}
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
              code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[12px]">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
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
        </PageAiMessageActions>
      )}
    </div>
  );
}

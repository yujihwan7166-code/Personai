import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ArrowRight, ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageAiContextStripProps {
  label?: string;
  summary?: ReactNode;
  title?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function PageAiContextStrip({
  label = '참조',
  summary,
  title,
  onClick,
  children,
  className,
}: PageAiContextStripProps) {
  const content = (
    <>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {summary && (
        <span className="min-w-0 truncate font-medium text-foreground">
          {summary}
        </span>
      )}
      {children}
    </>
  );

  const baseClass = cn(
    'flex min-h-[37px] shrink-0 items-center gap-1.5 border-b border-[hsl(var(--hairline))] bg-primary/[0.03] px-3.5 py-2 text-left text-[11.5px]',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-page-ai-context-strip
        className={cn(baseClass, 'w-full transition-colors hover:bg-accent')}
        title={title}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClass} title={title} data-page-ai-context-strip>
      {content}
    </div>
  );
}

interface PageAiEmptyStateProps {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

export function PageAiEmptyState({
  title,
  description,
  children,
  className,
}: PageAiEmptyStateProps) {
  return (
    <div className={cn('flex min-h-full flex-col justify-start pt-12 pb-5 sm:pt-14', className)}>
      <div className="mb-4 text-center">
        <div className="mb-1 text-[13.5px] font-semibold text-foreground">
          {title}
        </div>
        <div className="text-[11.5px] leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}

interface PageAiPromptSetProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function PageAiPromptSet({
  label = '추천 요청',
  children,
  className,
}: PageAiPromptSetProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-page-ai-prompt-set
      className={cn('flex w-full flex-col gap-1.5', className)}
    >
      {children}
    </div>
  );
}

interface PageAiQuickActionProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  iconClassName?: string;
  disabled?: boolean;
  emphasized?: boolean;
  accentClassName?: string;
  showArrow?: boolean;
  onClick: () => void;
  className?: string;
}

export function PageAiQuickAction({
  label,
  description,
  icon,
  iconClassName,
  disabled,
  emphasized,
  accentClassName,
  showArrow,
  onClick,
  className,
}: PageAiQuickActionProps) {
  const accessibleLabel = description ? `${label} - ${description}` : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      data-page-ai-quick-action
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-card/65 px-3 py-2 text-left transition-colors',
        'hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40',
        emphasized && 'border-foreground/15 bg-accent/20',
        className,
      )}
    >
      {icon && (
        <span className={cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/80 text-primary',
          iconClassName,
        )}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn(
          'block truncate text-[12.5px] leading-tight text-foreground',
          emphasized ? 'font-bold' : 'font-semibold',
        )}>
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {(accentClassName || showArrow) && (
        <span className="flex shrink-0 items-center gap-1.5">
          {accentClassName && (
            <span className={cn('h-1 w-1 shrink-0 rounded-full', accentClassName)} aria-hidden />
          )}
          {showArrow && (
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground/60" />
          )}
        </span>
      )}
    </button>
  );
}

interface PageAiMessageBubbleProps {
  children: ReactNode;
  role?: 'assistant' | 'user';
  tone?: 'default' | 'error';
  className?: string;
  bubbleClassName?: string;
}

export function PageAiMessageBubble({
  children,
  role = 'assistant',
  tone = 'default',
  className,
  bubbleClassName,
}: PageAiMessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start', className)}>
      <div
        className={cn(
          'relative max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
          isUser
            ? 'bg-primary/12 text-foreground whitespace-pre-wrap'
            : 'border border-[hsl(var(--hairline))] bg-card text-foreground',
          tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
          bubbleClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface PageAiMessageActionsProps {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function PageAiMessageActions({
  children,
  align = 'start',
  className,
}: PageAiMessageActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 pt-0.5',
        align === 'end' ? 'justify-end pr-1' : 'justify-start pl-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PageAiMessageActionButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function PageAiMessageActionButton({
  children,
  icon,
  onClick,
  disabled,
  title,
  className,
}: PageAiMessageActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border border-[hsl(var(--hairline))] bg-background px-2 text-[10.5px] text-muted-foreground transition-colors',
        'hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function PageAiTypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 pl-1 text-sm text-muted-foreground" aria-label="AI 답변 작성 중">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '120ms' }} />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '240ms' }} />
    </div>
  );
}

interface PageAiResizeHandleProps {
  open: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  onWidthChange: (next: number) => void;
  onWidthCommit?: (next: number) => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export function PageAiResizeHandle({
  open,
  width,
  minWidth,
  maxWidth,
  defaultWidth,
  onWidthChange,
  onWidthCommit,
  ariaLabel = 'AI 패널 너비 조정',
  title = '드래그로 너비 조정 · Enter로 기본값',
  className,
}: PageAiResizeHandleProps) {
  const dragRef = useRef<{ active: boolean }>({ active: false });
  const lastWidthRef = useRef(width);
  const clampWidth = useCallback((next: number) => (
    Math.max(minWidth, Math.min(maxWidth, Math.round(next)))
  ), [maxWidth, minWidth]);
  useEffect(() => {
    lastWidthRef.current = width;
  }, [width]);
  const commitWidth = useCallback((next: number) => {
    const clamped = clampWidth(next);
    lastWidthRef.current = clamped;
    onWidthChange(clamped);
    onWidthCommit?.(clamped);
  }, [clampWidth, onWidthChange, onWidthCommit]);
  const clearResizeSideEffects = useCallback(() => {
    dragRef.current.active = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => () => clearResizeSideEffects(), [clearResizeSideEffects]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current.active = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const next = clampWidth(window.innerWidth - event.clientX);
    lastWidthRef.current = next;
    onWidthChange(next);
  };
  const stopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      /* pointer capture may already be released by the browser */
    }
    clearResizeSideEffects();
    onWidthCommit?.(lastWidthRef.current);
  };
  const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 48 : 16;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = width + step;
    else if (event.key === 'ArrowRight') next = width - step;
    else if (event.key === 'Home') next = minWidth;
    else if (event.key === 'End') next = maxWidth;
    else if (event.key === 'Enter' || event.key === ' ') next = defaultWidth;
    if (next === null) return;
    event.preventDefault();
    commitWidth(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      aria-label={ariaLabel}
      tabIndex={open ? 0 : -1}
      title={title}
      className={cn(
        'absolute top-0 left-0 h-full w-1.5 -ml-0.5 cursor-col-resize transition-colors z-10',
        'hover:bg-primary/30 active:bg-primary/50 focus-visible:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        open ? 'hidden sm:block' : 'hidden',
        className,
      )}
      onPointerDown={startResize}
      onPointerMove={onResizeMove}
      onPointerUp={stopResize}
      onPointerCancel={stopResize}
      onDoubleClick={() => commitWidth(defaultWidth)}
      onKeyDown={onResizeKeyDown}
    />
  );
}

interface PageAiComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  loading?: boolean;
  placeholder?: string;
  loadingPlaceholder?: string;
  draft?: string;
  onDraftChange?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function PageAiComposer({
  onSend,
  onStop,
  loading = false,
  placeholder = '무엇이든 물어보세요',
  loadingPlaceholder = '답변 중...',
  draft,
  onDraftChange,
  autoFocus = false,
  className,
}: PageAiComposerProps) {
  const [internalDraft, setInternalDraft] = useState('');
  const value = draft ?? internalDraft;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const setValue = (next: string) => {
    if (onDraftChange) onDraftChange(next);
    else setInternalDraft(next);
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = value.trim()
      ? `${Math.max(40, Math.min(132, input.scrollHeight))}px`
      : '40px';
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  const handleSend = () => {
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className={cn(
      'shrink-0 border-t border-[hsl(var(--hairline))] bg-card/45 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]',
      className,
    )}>
      <div className="flex items-end gap-1.5">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            const composing = event.nativeEvent.isComposing || event.keyCode === 229;
            if (event.key === 'Enter' && !event.shiftKey && !composing) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder={loading ? loadingPlaceholder : placeholder}
          rows={1}
          disabled={loading && !onStop}
          className="min-h-10 max-h-[132px] flex-1 resize-none rounded-lg border border-[hsl(var(--hairline))] bg-background px-2.5 py-2 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/40 disabled:opacity-60"
          aria-label="AI 입력"
        />
        {loading && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/85 text-background transition-colors hover:bg-foreground"
            aria-label="중단"
            title="중단"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || loading}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              value.trim() && !loading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-foreground/10 text-foreground/40',
            )}
            aria-label="보내기"
            title="보내기"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

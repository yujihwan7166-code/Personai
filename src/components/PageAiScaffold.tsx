import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ArrowRight, ArrowUp, BookOpen, CalendarDays, FileText, Sparkles, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memoPreview, memoTimeLabel, memoTitle, useMemos } from '@/lib/memoStore';
import { loadAllPages } from '@/lib/wikiStore';
import { WIKI_TYPE_META, type WikiPage } from '@/types/wiki';
import { PAGE_AI_PANEL_SCROLL_CLASS } from '@/components/PageAiTokens';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import {
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
  type PlannerEvent,
  type PlannerTask,
} from '@/types/planner';

export type AuxiliaryToolTab = 'ai' | 'planner' | 'memos' | 'wiki';
export type AuxiliaryToolSurface = 'planner' | 'memos' | 'wiki' | 'journal' | 'default';

interface AuxiliaryToolItem {
  id: AuxiliaryToolTab;
  label: string;
  icon: ReactNode;
}

const AUXILIARY_TOOL_META: Record<AuxiliaryToolTab, Omit<AuxiliaryToolItem, 'id'>> = {
  ai: {
    label: 'AI',
    icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />,
  },
  planner: {
    label: '플래너',
    icon: <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.1} />,
  },
  memos: {
    label: '메모',
    icon: <FileText className="h-3.5 w-3.5" strokeWidth={2.1} />,
  },
  wiki: {
    label: '위키',
    icon: <BookOpen className="h-3.5 w-3.5" strokeWidth={2.1} />,
  },
};

const AUXILIARY_TOOLS_BY_SURFACE: Record<AuxiliaryToolSurface, AuxiliaryToolTab[]> = {
  planner: ['ai', 'memos', 'wiki'],
  memos: ['ai', 'planner', 'wiki'],
  wiki: ['ai', 'memos', 'planner'],
  journal: ['ai', 'planner', 'memos', 'wiki'],
  default: ['ai', 'memos', 'wiki'],
};

export function getAuxiliaryToolsForSurface(surface: AuxiliaryToolSurface = 'default'): AuxiliaryToolItem[] {
  return (AUXILIARY_TOOLS_BY_SURFACE[surface] ?? AUXILIARY_TOOLS_BY_SURFACE.default).map((id) => ({
    id,
    ...AUXILIARY_TOOL_META[id],
  }));
}

interface AuxiliaryToolTabsProps {
  active: AuxiliaryToolTab;
  onChange: (tab: AuxiliaryToolTab) => void;
  items?: AuxiliaryToolItem[];
}

export function AuxiliaryToolTabs({ active, onChange, items = getAuxiliaryToolsForSurface() }: AuxiliaryToolTabsProps) {
  const itemClass =
    'inline-flex h-7 w-11 min-w-0 items-center justify-center rounded-md text-[11.5px] font-semibold transition-colors';
  const getClass = (tab: AuxiliaryToolTab) =>
    cn(
      itemClass,
      active === tab
        ? 'bg-card text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
    );

  return (
    <nav
      aria-label="보조 도구 탭"
      className="w-fit max-w-full shrink-0"
    >
      <div
        className="grid w-fit max-w-full gap-0.5 overflow-hidden rounded-lg bg-muted/45 p-0.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, 2.75rem)` }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={active === item.id ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
            className={getClass(item.id)}
          >
            {item.icon}
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

interface AuxiliaryReferenceOption {
  value: string;
  label: string;
}

interface AuxiliaryReferenceSelectProps {
  value: string;
  options: AuxiliaryReferenceOption[];
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function AuxiliaryReferenceSelect({
  value,
  options,
  onChange,
  label = '참조 범위',
  disabled,
}: AuxiliaryReferenceSelectProps) {
  return (
    <label className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[hsl(var(--hairline))] bg-card/75 px-1.5 text-[11px] text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        className="h-full max-w-[116px] bg-transparent text-[11px] font-semibold text-foreground outline-none disabled:text-muted-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AuxiliaryPlannerTool() {
  const [snapshot, setSnapshot] = useState(() => getPlannerSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(getPlannerSnapshot());
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
    };
  }, []);

  return (
    <div className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-3')}>
      <div className="pb-1">
        <div className="text-[13px] font-semibold text-foreground">오늘 플래너</div>
        <div className="text-[11.5px] text-muted-foreground">
          현재 화면을 떠나지 않고 일정과 할 일을 확인합니다.
        </div>
      </div>

      <section className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>시간 잡힌 일</span>
          <span className="tabular-nums">{snapshot.scheduled.length}</span>
        </div>
        {snapshot.scheduled.length === 0 ? (
          <InlineToolEmpty
            icon={<CalendarDays className="h-4 w-4" />}
            title="오늘 잡힌 일정이 없어요"
            description="플래너에서 시간을 배정하면 여기에 표시됩니다."
          />
        ) : (
          snapshot.scheduled.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5"
            >
              <div className="flex items-start gap-2">
                <time className="shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-primary">
                  {formatPlannerTime(item.startAt)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-foreground">{item.title}</div>
                  {item.endAt && (
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                      {formatPlannerTime(item.startAt)}-{formatPlannerTime(item.endAt)}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>미배정 할 일</span>
          <span className="tabular-nums">{snapshot.todos.length}</span>
        </div>
        {snapshot.todos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/45 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            바로 처리할 할 일이 비어 있어요.
          </div>
        ) : (
          snapshot.todos.map((task) => (
            <article
              key={task.id}
              className="rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2"
            >
              <div className="truncate text-[12.5px] font-semibold text-foreground">
                {task.title}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

export function AuxiliaryMemoTool() {
  const memos = useMemos();
  const activeMemos = memos
    .filter((memo) => !memo.deletedAt && !memo.archivedAt)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
    .slice(0, 24);

  return (
    <div className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-2.5')}>
      <div className="pb-1">
        <div className="text-[13px] font-semibold text-foreground">최근 메모</div>
        <div className="text-[11.5px] text-muted-foreground">페이지를 떠나지 않고 메모를 훑어봅니다.</div>
      </div>
      {activeMemos.length === 0 ? (
        <InlineToolEmpty
          icon={<FileText className="h-4 w-4" />}
          title="보여줄 메모가 없어요"
          description="메모 화면에서 새 메모를 만들면 여기에 바로 나타납니다."
        />
      ) : (
        activeMemos.map((memo) => (
          <article
            key={memo.id}
            className="rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-foreground">
                  {memo.pinned && <span className="mr-1 text-primary">고정</span>}
                  {memoTitle(memo)}
                </div>
                {memoPreview(memo) && (
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted-foreground">
                    {memoPreview(memo)}
                  </p>
                )}
              </div>
              <time className="shrink-0 text-[10.5px] text-muted-foreground">
                {memoTimeLabel(memo.updatedAt)}
              </time>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

export function AuxiliaryWikiTool() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAllPages()
      .then((next) => {
        if (!cancelled) setPages(next.filter((page) => page.status !== 'archived').slice(0, 24));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-2.5')}>
      <div className="pb-1">
        <div className="text-[13px] font-semibold text-foreground">위키 문서</div>
        <div className="text-[11.5px] text-muted-foreground">현재 화면 옆에서 지식 문서를 참고합니다.</div>
      </div>
      {loading ? (
        <InlineToolEmpty
          icon={<BookOpen className="h-4 w-4" />}
          title="위키를 불러오는 중"
          description="잠시만 기다려주세요."
        />
      ) : pages.length === 0 ? (
        <InlineToolEmpty
          icon={<BookOpen className="h-4 w-4" />}
          title="보여줄 위키 문서가 없어요"
          description="마이위키에서 문서를 만들면 여기에 바로 나타납니다."
        />
      ) : (
        pages.map((page) => (
          <article
            key={page.id}
            className="rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-sm" aria-hidden>
                {WIKI_TYPE_META[page.type]?.icon ?? '📄'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-foreground">
                  {page.title}
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted-foreground">
                  {stripInlineMarkdown(page.body) || '본문이 아직 비어 있어요.'}
                </p>
                {page.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {page.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function InlineToolEmpty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/45 px-5 text-center">
      <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="text-[13px] font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{description}</div>
    </div>
  );
}

function getPlannerSnapshot(): {
  scheduled: Array<Pick<PlannerEvent | PlannerTask, 'id' | 'title' | 'startAt' | 'endAt'>>;
  todos: PlannerTask[];
} {
  const todayIso = new Date().toISOString();
  const scheduled = [
    ...eventStore.listByDate(todayIso),
    ...taskStore.listScheduled(todayIso),
  ]
    .filter((item) => item.startAt)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 8);
  const todos = taskStore
    .list()
    .filter((task) => !task.done && !task.canceled && !task.startAt)
    .slice(0, 8);
  return { scheduled, todos };
}

function formatPlannerTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

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
    'flex min-h-[28px] shrink-0 items-center gap-1.5 border-b border-[hsl(var(--hairline))] bg-background px-3 py-1 text-left text-[11px]',
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
    <div className={cn('flex min-h-full flex-col justify-start pt-4 pb-5 sm:pt-5', className)}>
      <div className="mb-3 text-center">
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
          {description && (
            <span className="font-medium text-muted-foreground">
              {' · '}
              {description}
            </span>
          )}
        </span>
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
  ariaLabel = '보조 도구 패널 너비 조정',
  title = '드래그로 보조 도구 너비 조정 · Enter로 기본값',
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
    <div
      data-page-ai-composer="true"
      className={cn(
        'shrink-0 border-t border-[hsl(var(--hairline))] bg-card/45 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
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

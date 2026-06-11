import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ExternalLink, FileText, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addMemo, memoPreview, memoTimeLabel, memoTitle, updateMemo, useMemos, type Memo } from '@/lib/memoStore';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import { loadAllPages, upsertPage } from '@/lib/wikiStore';
import { PAGE_AI_PANEL_SCROLL_CLASS } from '@/components/PageAiTokens';
import {
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
  type PlannerEvent,
  type PlannerTask,
} from '@/types/planner';
import { WIKI_TYPE_META, type WikiPage } from '@/types/wiki';

interface ScheduledSummary {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
}

interface PlannerSnapshot {
  scheduled: ScheduledSummary[];
  todos: PlannerTask[];
}

export function AuxiliaryPlannerTool() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot>(() => getPlannerSnapshot());

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
      <ToolIntro
        title="오늘 플래너"
        description="현재 화면을 떠나지 않고 일정과 할 일을 확인합니다."
        action={
          <ToolRouteButton to="/planner" className={TOOL_GHOST_BUTTON_CLASS}>
            열기
            <ExternalLink className="h-3 w-3" />
          </ToolRouteButton>
        }
      />

      <ToolSection title="시간 잡힌 일정" count={snapshot.scheduled.length}>
        {snapshot.scheduled.length === 0 ? (
          <ToolEmpty
            icon={<CalendarDays className="h-4 w-4" />}
            title="오늘 시간 잡힌 일정이 없어요"
            description="플래너에서 시간을 배정하면 여기에 바로 표시됩니다."
          />
        ) : (
          snapshot.scheduled.map((item) => (
            <ToolRouteButton
              key={item.id}
              to={`/planner?date=${toLocalDateKey(new Date(item.startAt))}`}
              className="group w-full rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
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
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </ToolRouteButton>
          ))
        )}
      </ToolSection>

      <ToolSection title="오늘 할 일" count={snapshot.todos.length}>
        {snapshot.todos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/45 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            바로 처리할 할 일이 비어 있어요.
          </div>
        ) : (
          snapshot.todos.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => taskStore.update(task.id, { done: !task.done })}
              className="group flex w-full items-center gap-2 rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary/50 text-primary">
                {task.done && <Check className="h-3 w-3" strokeWidth={2.4} />}
              </span>
              <div className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">
                {task.title}
              </div>
              <span className="shrink-0 text-[10.5px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                완료
              </span>
            </button>
          ))
        )}
      </ToolSection>
    </div>
  );
}

export function AuxiliaryMemoTool() {
  const memos = useMemos();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const activeMemos = memos
    .filter((memo) => !memo.deletedAt && !memo.archivedAt)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
    .slice(0, 24);
  const editingMemo = editingId ? activeMemos.find((memo) => memo.id === editingId) ?? null : null;

  const startEdit = (memo: Memo) => {
    setEditingId(memo.id);
    setDraft(memo.body);
  };

  const saveEdit = () => {
    if (!editingMemo) return;
    updateMemo(editingMemo.id, { body: draft });
  };

  const createMemo = () => {
    const memo = addMemo({ body: '# 새 메모\n' });
    setEditingId(memo.id);
    setDraft(memo.body);
  };

  // 편집 모드 / 목록 모드를 명확히 분리한다.
  // 같은 사이드바 안에 ToolIntro 헤더가 그대로 떠 있으면 "지금 뭘 하고 있는지" 가 모호하다.
  // 편집 모드에선 ToolIntro 를 숨기고, [← 목록 + 제목/날짜 + 열기/저장] 헤더 + 큰 textarea
  // 두 영역으로 구조를 재구성.
  return (
    <div
      className={cn(
        'min-h-0 flex-1 px-3 py-3',
        editingMemo
          ? 'flex flex-col overflow-hidden'
          : 'overflow-y-auto overscroll-contain space-y-2.5',
      )}
    >
      {editingMemo ? (
        <section className="flex min-h-0 flex-1 flex-col">
          <header className="mb-2.5 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="목록으로 돌아가기"
              title="목록"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
              목록
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold leading-tight text-foreground">
                {memoTitle(editingMemo)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ToolRouteButton
                to={`/memos?id=${editingMemo.id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                열기
              </ToolRouteButton>
              <button
                type="button"
                onClick={saveEdit}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check className="h-3 w-3" strokeWidth={2.4} />
                저장
              </button>
            </div>
          </header>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="메모를 적어보세요..."
            className="min-h-0 flex-1 resize-none rounded-xl border border-[hsl(var(--hairline))] bg-card/65 px-3.5 py-3 text-[13px] leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/12"
          />
        </section>
      ) : (
        <>
          <ToolIntro
            title="최근 메모"
            description="사이드바에서 메모를 확인하고 바로 고칩니다."
            action={
              <ToolGhostButton onClick={createMemo}>
                <Plus className="h-3 w-3" />
                새 메모
              </ToolGhostButton>
            }
          />
          {activeMemos.length === 0 ? (
            <ToolEmpty
              icon={<FileText className="h-4 w-4" />}
              title="보여줄 메모가 없어요"
              description="새 메모를 만들면 이곳에서 바로 열고 수정할 수 있어요."
            />
          ) : (
            activeMemos.map((memo) => (
              <button
                key={memo.id}
                type="button"
                onClick={() => startEdit(memo)}
                className="group w-full rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
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
                  <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/35 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))
          )}
        </>
      )}
    </div>
  );
}

export function AuxiliaryWikiTool() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState('');

  const refreshPages = useCallback(() => {
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

  useEffect(() => refreshPages(), [refreshPages]);

  const editingPage = editingId ? pages.find((page) => page.id === editingId) ?? null : null;

  const startEditPage = (page: WikiPage) => {
    setEditingId(page.id);
    setDraftBody(page.body);
  };

  const savePage = async () => {
    if (!editingPage) return;
    const next = { ...editingPage, body: draftBody, updatedAt: Date.now() };
    await upsertPage(next);
    setPages((current) => current.map((page) => (page.id === next.id ? next : page)));
    setEditingId(null);
  };

  // 메모와 동일한 편집/목록 명확 분리. 편집 모드에선 ToolIntro 헤더 숨김 + 큰 textarea 영역.
  return (
    <div
      className={cn(
        'min-h-0 flex-1 px-3 py-3',
        editingPage
          ? 'flex flex-col overflow-hidden'
          : 'overflow-y-auto overscroll-contain space-y-2.5',
      )}
    >
      {editingPage ? (
        <section className="flex min-h-0 flex-1 flex-col">
          <header className="mb-2.5 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="목록으로 돌아가기"
              title="목록"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
              목록
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm" aria-hidden>
                  {WIKI_TYPE_META[editingPage.type]?.icon ?? '📄'}
                </span>
                <span className="truncate text-[13px] font-bold leading-tight text-foreground">
                  {editingPage.title}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-foreground">
                {WIKI_TYPE_META[editingPage.type]?.label ?? '문서'}
                {editingPage.tags.length > 0 ? ` · #${editingPage.tags.slice(0, 2).join(' #')}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ToolRouteButton
                to="/wiki"
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                열기
              </ToolRouteButton>
              <button
                type="button"
                onClick={() => void savePage()}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check className="h-3 w-3" strokeWidth={2.4} />
                저장
              </button>
            </div>
          </header>
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            placeholder="위키 문서를 정리해보세요..."
            className="min-h-0 flex-1 resize-none rounded-xl border border-[hsl(var(--hairline))] bg-card/65 px-3.5 py-3 text-[12.5px] leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/12"
          />
        </section>
      ) : (
        <>
          <ToolIntro
            title="위키 문서"
            description="문서를 읽고 필요한 부분을 바로 정리합니다."
            action={
              <ToolRouteButton to="/wiki" className={TOOL_GHOST_BUTTON_CLASS}>
                전체
                <ExternalLink className="h-3 w-3" />
              </ToolRouteButton>
            }
          />
          {loading ? (
            <ToolEmpty
              icon={<BookOpen className="h-4 w-4" />}
              title="위키를 불러오는 중"
              description="잠시만 기다려주세요."
            />
          ) : pages.length === 0 ? (
            <ToolEmpty
              icon={<BookOpen className="h-4 w-4" />}
              title="보여줄 위키 문서가 없어요"
              description="마이위키에서 문서를 만들면 여기에 바로 나타납니다."
            />
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => startEditPage(page)}
                className="group w-full rounded-xl border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-sm" aria-hidden>
                    {WIKI_TYPE_META[page.type]?.icon ?? '📄'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-foreground">
                      {page.title}
                    </div>
                    <p className="mt-1 line-clamp-3 text-[11.5px] leading-5 text-muted-foreground">
                      {cleanReadableWikiText(page.body) || '본문이 아직 비어 있어요.'}
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
                  <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/35 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))
          )}
        </>
      )}
    </div>
  );
}

function ToolIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 pb-1">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        <div className="text-[11.5px] leading-5 text-muted-foreground">{description}</div>
      </div>
      {action}
    </div>
  );
}

function ToolSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>{title}</span>
        <span className="tabular-nums">{count}</span>
      </div>
      {children}
    </section>
  );
}

const TOOL_GHOST_BUTTON_CLASS =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[hsl(var(--hairline))] bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

function ToolGhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={TOOL_GHOST_BUTTON_CLASS}
    >
      {children}
    </button>
  );
}

function ToolRouteButton({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const hasRouter = useInRouterContext();
  if (hasRouter) {
    return (
      <ToolRouteButtonWithRouter to={to} className={className}>
        {children}
      </ToolRouteButtonWithRouter>
    );
  }

  return (
    <button type="button" onClick={() => routeWithoutRouter(to)} className={className}>
      {children}
    </button>
  );
}

function ToolRouteButtonWithRouter({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)} className={className}>
      {children}
    </button>
  );
}

function routeWithoutRouter(to: string) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function ToolEmpty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/45 px-5 text-center">
      <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="text-[13px] font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{description}</div>
    </div>
  );
}

function getPlannerSnapshot(): PlannerSnapshot {
  const today = new Date();
  const todayIso = today.toISOString();
  const todayKey = toLocalDateKey(today);
  const scheduled = [
    ...eventStore.listByDate(todayIso),
    ...taskStore.listScheduled(todayIso),
  ]
    .filter((item): item is (PlannerEvent | PlannerTask) & { startAt: string } => Boolean(item.startAt))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
    }));
  const todos = taskStore
    .list()
    .filter((task) => !task.done && !task.canceled && !task.startAt && (!task.plannedFor || task.plannedFor === todayKey))
    .slice(0, 8);
  return { scheduled, todos };
}

function formatPlannerTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cleanReadableWikiText(value: string): string {
  const withoutTemplateRows = value
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/예시 페이지|교체하세요|YYYY|YY\/MM|항목\s*\||내용\s*\||일자\s*\||출처\s*\|/.test(trimmed)) return false;
      if (/^[|｜\s:;.,/\\<>[\]{}()-]+$/.test(trimmed)) return false;
      return true;
    })
    .join(' ');

  return withoutTemplateRows
    .replace(/\[\[([^\]|]+)\|([^\]]+)]]/g, '$2')
    .replace(/\[\[([^\]]+)]]/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[|｜]{2,}/g, ' ')
    .replace(/<{2,}|>{2,}|<\/+>/g, ' ')
    .replace(/[*_~>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

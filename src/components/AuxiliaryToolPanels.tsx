import { useEffect, useState, type ReactNode } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import { PAGE_AI_PANEL_SCROLL_CLASS } from '@/components/PageAiTokens';
import {
  PLANNER_EVENT_CHANGED,
  PLANNER_TASK_CHANGED,
  type PlannerEvent,
  type PlannerTask,
} from '@/types/planner';

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

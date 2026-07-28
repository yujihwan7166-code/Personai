import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Check,
  Circle,
  Flag,
  ListChecks,
  Pause,
  Play,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { goalStore } from '@/services/planner/goalStore';
import { computeAllGoalProgress, type GoalProgress } from '@/lib/planner/goalProgress';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { GoalColor, PlannerGoal, PlannerMilestone, PlannerTask } from '@/types/planner';
import { GOAL_COLORS, PLANNER_GOAL_CHANGED, PLANNER_TASK_CHANGED } from '@/types/planner';

interface GoalProgressViewProps {
  onTaskClick?: (task: { id: string; title: string }) => void;
}

const COLOR_ORDER: GoalColor[] = ['blue', 'teal', 'amber', 'rose', 'violet', 'green', 'slate'];

const formatDate = (date?: string) => {
  if (!date) return '기한 없음';
  return new Date(`${date}T00:00:00`).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
};

export const GoalProgressView = ({ onTaskClick }: GoalProgressViewProps) => {
  const [goals, setGoals] = useState<PlannerGoal[]>(() => goalStore.list());
  const [tasks, setTasks] = useState<PlannerTask[]>(() => taskStore.list());
  const [milestones, setMilestones] = useState<PlannerMilestone[]>(() => goalStore.listMilestones());
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState<GoalColor>('blue');
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const refreshGoals = () => {
      setGoals(goalStore.list());
      setMilestones(goalStore.listMilestones());
    };
    const refreshTasks = () => setTasks(taskStore.list());

    refreshGoals();
    refreshTasks();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_GOAL_CHANGED, refreshGoals);
    window.addEventListener(PLANNER_TASK_CHANGED, refreshTasks);
    return () => {
      window.removeEventListener(PLANNER_GOAL_CHANGED, refreshGoals);
      window.removeEventListener(PLANNER_TASK_CHANGED, refreshTasks);
    };
  }, []);

  const progress = useMemo(
    () => computeAllGoalProgress(goals, tasks, milestones),
    [goals, tasks, milestones],
  );

  const activeProgress = progress.filter((item) => item.goal.status !== 'done');
  const doneProgress = progress.filter((item) => item.goal.status === 'done');
  const totalOpen = activeProgress.reduce((sum, item) => sum + item.openTasks, 0);
  const totalScheduled = activeProgress.reduce((sum, item) => sum + item.scheduledTasks, 0);
  const averageProgress = activeProgress.length
    ? Math.round(activeProgress.reduce((sum, item) => sum + item.percent, 0) / activeProgress.length)
    : 0;

  const addGoal = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const next = goalStore.add({
      title: trimmed,
      dueDate: dueDate || undefined,
      color,
    });
    setTitle('');
    setDueDate('');
    setColor('blue');
    notify.success(`${next.title} 목표가 생겼어요`, { duration: 1300 });
  };

  const addMilestone = (goalId: string) => {
    const value = milestoneDrafts[goalId]?.trim();
    if (!value) return;
    goalStore.addMilestone({ goalId, title: value });
    setMilestoneDrafts((prev) => ({ ...prev, [goalId]: '' }));
  };

  const addTask = (goalId: string) => {
    const value = taskDrafts[goalId]?.trim();
    if (!value) return;
    const next = taskStore.add({ title: value, goalId });
    setTaskDrafts((prev) => ({ ...prev, [goalId]: '' }));
    notify.success('목표 작업으로 추가됐어요', {
      duration: 1200,
      action: { label: '열기', onClick: () => onTaskClick?.({ id: next.id, title: next.title }) },
    });
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-7xl px-5 py-5 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Goal planner
            </div>
            <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-foreground">
              목표별 진행
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              큰 목표를 마일스톤과 오늘 할 일로 내려보내는 곳입니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-[300px]">
            <SummaryMetric label="진행" value={`${averageProgress}%`} />
            <SummaryMetric label="남은 작업" value={totalOpen} />
            <SummaryMetric label="일정화" value={totalScheduled} />
          </div>
        </div>

        <div className="rounded-2xl border hairline bg-card px-4 py-3.5 shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_220px_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addGoal();
              }}
              placeholder="새 목표"
              className="h-10 rounded-md border border-foreground/20 bg-background px-3 text-[13px] outline-none focus:border-foreground/40"
            />
            <input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              className="h-10 rounded-md border border-foreground/20 bg-background px-3 text-[13px] outline-none focus:border-foreground/40"
            />
            <div className="flex items-center gap-1">
              {COLOR_ORDER.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  aria-label={`${item} 색상`}
                  title={item}
                  className={cn(
                    'h-8 w-8 rounded-md border transition-transform',
                    color === item ? 'border-foreground scale-105' : 'border-transparent hover:border-foreground/20',
                  )}
                  style={{ backgroundColor: GOAL_COLORS[item].chipBg }}
                >
                  <span
                    className="mx-auto block h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: GOAL_COLORS[item].stripe }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addGoal}
              className="h-10 inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </div>

        {activeProgress.length === 0 ? (
          <div className="min-h-[320px] rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-card/40 flex flex-col items-center justify-center text-center px-6">
            <Target className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-[15px] font-semibold text-foreground">아직 진행 중인 목표가 없어요</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              목표를 하나 만들고, 작업 입력창에서 @목표이름으로 바로 연결할 수 있어요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeProgress.map((item) => (
              <GoalCard
                key={item.goal.id}
                item={item}
                milestoneDraft={milestoneDrafts[item.goal.id] ?? ''}
                taskDraft={taskDrafts[item.goal.id] ?? ''}
                onMilestoneDraft={(value) => setMilestoneDrafts((prev) => ({ ...prev, [item.goal.id]: value }))}
                onTaskDraft={(value) => setTaskDrafts((prev) => ({ ...prev, [item.goal.id]: value }))}
                onAddMilestone={() => addMilestone(item.goal.id)}
                onAddTask={() => addTask(item.goal.id)}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        )}

        {doneProgress.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
              완료된 목표
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {doneProgress.map((item) => (
                <button
                  key={item.goal.id}
                  type="button"
                  onClick={() => goalStore.update(item.goal.id, { status: 'active' })}
                  className="rounded-md border border-foreground/20 bg-card px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="text-[13px] font-medium text-foreground">{item.goal.title}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">다시 활성화</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryMetric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-md border border-foreground/20 bg-card px-3 py-2">
    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    <div className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</div>
  </div>
);

const GoalCard = ({
  item,
  milestoneDraft,
  taskDraft,
  onMilestoneDraft,
  onTaskDraft,
  onAddMilestone,
  onAddTask,
  onTaskClick,
}: {
  item: GoalProgress;
  milestoneDraft: string;
  taskDraft: string;
  onMilestoneDraft: (value: string) => void;
  onTaskDraft: (value: string) => void;
  onAddMilestone: () => void;
  onAddTask: () => void;
  onTaskClick?: (task: { id: string; title: string }) => void;
}) => {
  const { goal } = item;
  const color = GOAL_COLORS[goal.color];
  const visibleTasks = item.tasks
    .filter((task) => !task.done && !task.canceled)
    .sort((a, b) => {
      if (a.startAt && b.startAt) return a.startAt.localeCompare(b.startAt);
      if (a.startAt && !b.startAt) return -1;
      if (!a.startAt && b.startAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 5);

  return (
    <section className="rounded-2xl border hairline bg-card overflow-hidden shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]">
      <div className="h-1" style={{ backgroundColor: color.stripe }} />
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[17px] font-semibold tracking-tight text-foreground">
                {goal.title}
              </h3>
              {goal.status === 'paused' && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  paused
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(goal.dueDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {item.openTasks}개 남음
              </span>
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" />
                {item.scheduledTasks}개 일정화
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              title={goal.status === 'paused' ? '재개' : '일시정지'}
              onClick={() => goalStore.update(goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' })}
            >
              {goal.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </IconButton>
            <IconButton title="완료" onClick={() => goalStore.update(goal.id, { status: 'done' })}>
              <Check className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              title="삭제"
              danger
              onClick={() => {
                if (!window.confirm(`${goal.title} 목표를 삭제할까요? 작업은 남고 목표 연결만 사라집니다.`)) return;
                /* 되돌리기 대비 — 마일스톤과 끊어낸 작업의 연결을 미리 적어둔다. */
                const milestones = goalStore.listMilestones(goal.id);
                const links = item.tasks.map((t) => ({ id: t.id, goalId: t.goalId, milestoneId: t.milestoneId }));
                links.forEach((l) => taskStore.update(l.id, { goalId: undefined, milestoneId: undefined }));
                goalStore.remove(goal.id);
                notify.success(`'${goal.title}' 목표를 지웠어요`, {
                  action: {
                    label: '되돌리기',
                    onClick: () => {
                      goalStore.restore(goal, milestones);
                      links.forEach((l) => taskStore.update(l.id, { goalId: l.goalId, milestoneId: l.milestoneId }));
                    },
                  },
                });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            <span>progress</span>
            <span>{item.percent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.percent}%`, backgroundColor: color.stripe }}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              Milestones
            </div>
            <div className="space-y-1">
              {item.milestones.map((milestone) => (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => goalStore.updateMilestone(milestone.id, { done: !milestone.done })}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors"
                >
                  {milestone.done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn('text-[12.5px] truncate', milestone.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {milestone.title}
                  </span>
                </button>
              ))}
              <InlineInput
                value={milestoneDraft}
                placeholder="마일스톤 추가"
                onChange={onMilestoneDraft}
                onSubmit={onAddMilestone}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              Next tasks
            </div>
            <div className="space-y-1">
              {visibleTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors"
                >
                  <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{task.title}</span>
                  {task.startAt && (
                    <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(task.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </button>
              ))}
              <InlineInput
                value={taskDraft}
                placeholder="작업 추가"
                onChange={onTaskDraft}
                onSubmit={onAddTask}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const IconButton = ({
  title,
  danger,
  children,
  onClick,
}: {
  title: string;
  danger?: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    onClick={onClick}
    className={cn(
      'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
      danger
        ? 'text-rose-500 hover:bg-rose-500/10'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
    )}
  >
    {children}
  </button>
);

const InlineInput = ({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) => (
  <div className="flex items-center gap-1 rounded-md border border-foreground/20 bg-background px-2">
    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSubmit();
      }}
      placeholder={placeholder}
      className="h-8 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
    />
  </div>
);

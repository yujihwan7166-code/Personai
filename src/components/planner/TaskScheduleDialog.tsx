/**
 * 시간 배정 모달 — 인박스 할일 클릭 시 띄움. 또는 빈 슬롯 클릭 시 신규 추가.
 *
 * 모드 2종:
 * - schedule: 기존 task 의 시간만 배정/변경 (taskId 전달)
 * - create:   신규 항목 추가 (presetStartIso 전달, 사용자가 title 입력)
 *
 * UX:
 * - 날짜 = 'YYYY-MM-DD' input (HTML date)
 * - 시작 시각 = 'HH:mm' input (HTML time, 30분 단위 권장)
 * - 길이 = chip 4종 (30 / 60 / 90 / 120 분)
 * - 인박스로 (시간 해제) 옵션 — schedule 모드에서만
 */
import { useEffect, useState } from 'react';
import { Trash2, Flag, FileText, RotateCw, ChevronDown, ListChecks, Folder, Target } from 'lucide-react';
import { SubtaskList } from './SubtaskList';
import { StreakCard } from './StreakIndicator';
import { computeStreakStats } from '@/lib/planner/streak';
import type { Subtask } from '@/types/planner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { taskListStore } from '@/services/planner/taskListStore';
import { goalStore } from '@/services/planner/goalStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { PlannerGoal, PlannerMilestone, PlannerTask, Priority, RecurrenceRule, TaskList, TaskListColor, WeekdayCode } from '@/types/planner';
import { GOAL_COLORS, PLANNER_GOAL_CHANGED, PLANNER_LIST_CHANGED, PRIORITY_COLORS, PRIORITY_LABELS, TASK_LIST_COLORS, WEEKDAY_ORDER, WEEKDAY_LABELS } from '@/types/planner';
import { isInstanceId, parseInstanceId, expandRecurrence } from '@/lib/planner/recurrence';
import { editAll, editThisAndFuture, editThisOnly } from '@/lib/planner/seriesEdit';

type Mode =
  | {
      kind: 'schedule';
      taskId: string;
      initialTitle: string;
      initialStart?: string;
      initialEnd?: string;
      initialPriority?: Priority;
      initialNote?: string;
      initialPinned?: boolean;
    }
  | { kind: 'create'; presetStartIso: string };

interface TaskScheduleDialogProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

const DURATIONS = [30, 60, 120] as const;
const TASK_COLOR_OPTIONS: Array<{ value: TaskListColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'green', label: '초록' },
  { value: 'amber', label: '노랑' },
  { value: 'rose', label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'teal', label: '청록' },
];

const toDateInput = (iso: string): string => iso.slice(0, 10);
const toTimeInput = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const minutesBetween = (startIso: string, endIso: string): number =>
  Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);

const buildIso = (dateStr: string, timeStr: string): string => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const addMinutes = (iso: string, mins: number): string =>
  new Date(new Date(iso).getTime() + mins * 60_000).toISOString();

/** 가상 인스턴스 id 면 마스터 task/event 와 occurrenceIso 분해. 일반 id 면 그대로. */
const resolveSeries = (id: string) => {
  if (!isInstanceId(id)) return null;
  const parsed = parseInstanceId(id);
  if (!parsed) return null;
  const masterTask = taskStore.findMaster(parsed.masterId);
  if (masterTask) return { kind: 'task' as const, master: masterTask, occurrenceIso: parsed.occurrenceIso };
  const masterEvent = eventStore.findMaster(parsed.masterId);
  if (masterEvent) return { kind: 'event' as const, master: masterEvent, occurrenceIso: parsed.occurrenceIso };
  return null;
};

type RecurrencePreset = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const presetToRule = (
  preset: RecurrencePreset,
  byday: WeekdayCode[],
  until?: string,
): RecurrenceRule | undefined => {
  if (preset === 'none') return undefined;
  const base: RecurrenceRule = { freq: preset, interval: 1 };
  if (preset === 'weekly' && byday.length > 0) base.byday = byday;
  if (until) base.until = until;
  return base;
};

const ruleToPreset = (rec: RecurrenceRule | undefined): { preset: RecurrencePreset; byday: WeekdayCode[]; until: string } => {
  if (!rec) return { preset: 'none', byday: [], until: '' };
  return {
    preset: rec.freq as RecurrencePreset,
    byday: rec.byday ?? [],
    until: rec.until ?? '',
  };
};

export const TaskScheduleDialog = ({ open, mode, onClose }: TaskScheduleDialogProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [isEvent, setIsEvent] = useState(false);
  const [priority, setPriority] = useState<Priority>(0);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrencePreset>('none');
  const [byday, setByday] = useState<WeekdayCode[]>([]);
  /** 반복 종료일 (YYYY-MM-DD) — 빈 값 = 무한. 사용자가 명시 입력 가능. */
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  /** 서브태스크 — schedule 모드에서 master 의 subtasks 를 직접 편집 (자동 저장).
   * create 모드에선 생성 시 함께 저장. */
  const [subtasksDraft, setSubtasksDraft] = useState<Subtask[]>([]);
  const [taskColor, setTaskColor] = useState<TaskListColor | undefined>();
  const [listId, setListId] = useState<string | undefined>();
  const [goalId, setGoalId] = useState<string | undefined>();
  const [milestoneId, setMilestoneId] = useState<string | undefined>();
  // 사용자 카테고리 / 목표 — store 구독 (모달 열릴 때마다 최신).
  const [lists, setLists] = useState<TaskList[]>(() => taskListStore.list());
  const [goals, setGoals] = useState<PlannerGoal[]>(() => goalStore.listActive());
  const [milestones, setMilestones] = useState<PlannerMilestone[]>(() => goalStore.listMilestones());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refreshLists = () => setLists(taskListStore.list());
    const refreshGoals = () => {
      setGoals(goalStore.listActive());
      setMilestones(goalStore.listMilestones());
    };
    window.addEventListener(PLANNER_LIST_CHANGED, refreshLists);
    window.addEventListener(PLANNER_GOAL_CHANGED, refreshGoals);
    return () => {
      window.removeEventListener(PLANNER_LIST_CHANGED, refreshLists);
      window.removeEventListener(PLANNER_GOAL_CHANGED, refreshGoals);
    };
  }, []);
  const selectedGoal = goalId ? goals.find((g) => g.id === goalId) : undefined;
  const selectedMilestones = goalId ? milestones.filter((m) => m.goalId === goalId) : [];
  // 모드 변경 시 폼 초기화.
  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'schedule') {
      setTitle(mode.initialTitle);
      const start = mode.initialStart ?? new Date().toISOString();
      const end = mode.initialEnd ?? addMinutes(start, 60);
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setDuration(minutesBetween(start, end) || 60);
      setIsEvent(false);
      setPriority(mode.initialPriority ?? 0);
      setNote(mode.initialNote ?? '');
      setNoteOpen(Boolean(mode.initialNote && mode.initialNote.length > 0));
      // 시리즈 인스턴스인 경우 마스터에서 recurrence 회수.
      const series = resolveSeries(mode.taskId);
      if (series) {
        const { preset, byday: bd, until } = ruleToPreset(series.master.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setRecurrenceUntil(until ? until.slice(0, 10) : '');
        setSubtasksDraft(series.kind === 'task' ? (series.master.subtasks ?? []) : []);
        setTaskColor(series.kind === 'task' ? series.master.color : undefined);
        if (series.kind === 'task') {
          setListId(series.master.listId);
          setGoalId(series.master.goalId);
          setMilestoneId(series.master.milestoneId);
        } else {
          setListId(undefined);
          setGoalId(undefined);
          setMilestoneId(undefined);
        }
      } else {
        // 비-인스턴스 — task store 에서 직접 마스터 조회 (단발/시리즈 마스터 양쪽).
        const direct = taskStore.findMaster(mode.taskId);
        const { preset, byday: bd, until } = ruleToPreset(direct?.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setRecurrenceUntil(until ? until.slice(0, 10) : '');
        setSubtasksDraft(direct?.subtasks ?? []);
        setTaskColor(direct?.color);
        setListId(direct?.listId);
        setGoalId(direct?.goalId);
        setMilestoneId(direct?.milestoneId);
      }
    } else {
      setTitle('');
      setDate(toDateInput(mode.presetStartIso));
      setTime(toTimeInput(mode.presetStartIso));
      setDuration(60);
      setIsEvent(false);
      setPriority(0);
      setNote('');
      setNoteOpen(false);
      setRecurrence('none');
      setByday([]);
      setRecurrenceUntil('');
      setSubtasksDraft([]);
      setTaskColor(undefined);
      setListId(undefined);
      setGoalId(undefined);
      setMilestoneId(undefined);
    }
  }, [mode, open]);

  if (!mode) return null;

  const series = mode.kind === 'schedule' ? resolveSeries(mode.taskId) : null;
  const isSeriesInstance = Boolean(series);
  /**
   * scope: 시리즈 인스턴스 편집 시 정책 — 'this' / 'future' / 'all'.
   * 단발 항목이면 무관 (그냥 update).
   */
  const submitWithScope = (scope: 'this' | 'future' | 'all' = 'all') => {
    if (!date || !time) return;
    const startIso = buildIso(date, time);
    const endIso = addMinutes(startIso, duration);
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    const noteTrim = note.trim();
    const untilIso = recurrenceUntil
      ? new Date(`${recurrenceUntil}T23:59:59`).toISOString()
      : undefined;
    const newRecurrence = presetToRule(recurrence, byday, untilIso);

    if (mode.kind === 'schedule') {
      const patch: Partial<PlannerTask> = {
        title: trimmed,
        startAt: startIso,
        endAt: endIso,
        // 시간이 잡혔으면 "계획"(plannedFor) 마킹은 자동 해제 — 좌측 계획 컬럼에 중복 안 뜨고
        // 시간표 이동의 의도가 명확.
        plannedFor: undefined,
        priority: priority === 0 ? undefined : priority,
        color: taskColor,
        note: noteTrim.length > 0 ? noteTrim : undefined,
        recurrence: newRecurrence,
        subtasks: subtasksDraft.length > 0 ? subtasksDraft : undefined,
        listId,
        goalId,
        // goal 해제 시 milestone 도 같이 해제 (UI 가드와 일관).
        milestoneId: goalId ? milestoneId : undefined,
      };

      if (series && series.kind === 'task') {
        if (scope === 'this') {
          editThisOnly(taskStore, series.master, series.occurrenceIso, patch);
          notify.success('이 항목만 변경됐어요');
        } else if (scope === 'future') {
          editThisAndFuture(taskStore, series.master, series.occurrenceIso, patch);
          notify.success('이 항목과 이후 시리즈가 변경됐어요');
        } else {
          editAll(taskStore, series.master, patch);
          notify.success('전체 시리즈가 변경됐어요');
        }
      } else {
        // 단발 항목 또는 시리즈 마스터 자체.
        taskStore.update(mode.taskId, patch);
        notify.success(newRecurrence ? '시리즈 갱신됐어요' : '시간 배정됐어요');
      }
    } else {
      if (isEvent) {
        eventStore.add({
          title: trimmed,
          startAt: startIso,
          endAt: endIso,
          source: 'user',
          recurrence: newRecurrence,
          // taskColor (TaskListColor enum) → stripe hex 매핑.
          color: taskColor ? TASK_LIST_COLORS[taskColor].stripe : undefined,
        });
        notify.success(newRecurrence ? '반복 일정 추가됐어요' : '일정 추가됐어요');
      } else {
        taskStore.add({
          title: trimmed,
          startAt: startIso,
          endAt: endIso,
          priority: priority === 0 ? undefined : priority,
          color: taskColor,
          note: noteTrim.length > 0 ? noteTrim : undefined,
          recurrence: newRecurrence,
          subtasks: subtasksDraft.length > 0 ? subtasksDraft : undefined,
          listId,
          goalId,
          milestoneId: goalId ? milestoneId : undefined,
        });
        notify.success(newRecurrence ? '반복 할 일 추가됐어요' : '할 일 추가됐어요');
      }
    }
    onClose();
  };

  const handleSubmit = () => submitWithScope(isSeriesInstance ? 'this' : 'all');

  const handleUnschedule = () => {
    if (mode.kind === 'schedule') {
      taskStore.unschedule(mode.taskId);
      notify.info('대기함으로 옮겼어요', { duration: 1500 });
      onClose();
    }
  };

  const handleDelete = (scope: 'this' | 'all' = 'all') => {
    if (mode.kind !== 'schedule') return;

    if (series && series.kind === 'task' && scope === 'this') {
      // 시리즈 인스턴스 한 회만 — exdate 추가 (createNew=false 로 단순 skip).
      editThisOnly(
        taskStore,
        series.master,
        series.occurrenceIso,
        {} as Partial<PlannerTask>,
        { createNew: false },
      );
      notify.success('이 항목 건너뛰기', { duration: 1500 });
      onClose();
      return;
    }

    // 단발 항목 또는 전체 시리즈 삭제.
    const target = series ? series.master : taskStore.findMaster(mode.taskId);
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'priority' | 'color' | 'note' | 'pinned' | 'recurrence'> = {
      title: title.trim() || mode.initialTitle,
      done: false,
      startAt: target?.startAt ?? mode.initialStart,
      endAt: target?.endAt ?? mode.initialEnd,
      priority: priority === 0 ? undefined : priority,
      color: target?.color,
      note: note.trim().length > 0 ? note.trim() : undefined,
      pinned: mode.initialPinned,
      recurrence: target?.recurrence,
    };
    const idToRemove = target?.id ?? mode.taskId;
    taskStore.remove(idToRemove);
    notify.success(series ? '전체 시리즈 삭제됐어요' : '삭제됐어요', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => taskStore.add(snapshot),
      },
    });
    onClose();
  };

  // Ctrl+Enter / Cmd+Enter 제출 단축키 (textarea·input 어디서나 동작).
  const handleKeyDownGlobal = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onKeyDown={handleKeyDownGlobal}>
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
            <span aria-hidden>{isEvent ? '🗓' : '✅'}</span>
            <span>
              {mode.kind === 'schedule'
                ? `${isEvent ? '일정' : '할 일'} 시간 배정`
                : `새 ${isEvent ? '일정' : '할 일'}`}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEvent
              ? '일정의 시간·색·반복을 편집합니다.'
              : '할 일의 시간·우선순위·리스트·목표·체크리스트·노트를 편집합니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mt-2">
          {/* 제목 — schedule/create 모두 편집 가능. full row */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus={mode.kind === 'create'}
              placeholder="할 일 또는 일정 제목"
              className="w-full px-3 py-2 text-[14px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/50 focus:outline-none transition-colors text-foreground"
            />
          </div>

          {/* 종류 (create 모드만) — 큰 segmented control + 의미 hint */}
          {mode.kind === 'create' && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-1.5 p-1 rounded-md bg-accent/40 border border-[hsl(var(--hairline))]">
              <button
                type="button"
                onClick={() => setIsEvent(false)}
                aria-pressed={!isEvent}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-[12.5px] rounded transition-all',
                  !isEvent
                    ? 'bg-foreground text-background font-semibold shadow-sm'
                    : 'text-foreground/65 hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>✅</span>
                  <span>할 일</span>
                </span>
                <span className={cn('text-[10.5px] font-normal leading-tight', !isEvent ? 'text-background/65' : 'text-foreground/45')}>
                  체크리스트·우선순위·목표
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsEvent(true)}
                aria-pressed={isEvent}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-[12.5px] rounded transition-all',
                  isEvent
                    ? 'bg-foreground text-background font-semibold shadow-sm'
                    : 'text-foreground/65 hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>🗓</span>
                  <span>일정</span>
                </span>
                <span className={cn('text-[10.5px] font-normal leading-tight', isEvent ? 'text-background/65' : 'text-foreground/45')}>
                  시간 블록·색·반복
                </span>
              </button>
            </div>
          )}

          {/* 날짜 + 시간 — full row, 내부 2col */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
                날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-2 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
                시작
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={1800}
                className="px-2.5 py-2 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none"
              />
            </div>
          </div>

          {/* 길이 chip — full row (10개 chip 많아 wrap 시 좁으면 답답) */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              길이
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'px-3 py-2 text-[12px] tabular-nums rounded-md transition-colors',
                    duration === d
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                  )}
                >
                  {d < 60 ? `${d}분` : `${Math.floor(d / 60)}시간${d % 60 ? ` ${d % 60}분` : ''}`}
                </button>
              ))}
            </div>
            <label className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              직접
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setDuration(Number.isFinite(next) && next > 0 ? Math.max(5, next) : 5);
                }}
                className="h-7 w-20 rounded-md border border-[hsl(var(--hairline))] bg-card px-2 text-[12px] tabular-nums text-foreground focus:border-foreground/40 focus:outline-none"
                aria-label="길이 직접 입력"
              />
              분
            </label>
          </div>

          {/* 우선순위 chip — 할 일 모드에서만 (일정은 priority 없음). 좌측 col */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
                우선순위
              </label>
              <div className="flex gap-1.5">
                {([0, 1, 2, 3] as Priority[]).map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md transition-colors border',
                        active
                          ? 'bg-foreground text-background font-medium border-foreground'
                          : 'border-[hsl(var(--hairline))] hover:bg-accent text-foreground',
                      )}
                    >
                      {p > 0 && (
                        <Flag
                          className="h-3 w-3"
                          style={{ color: active ? undefined : PRIORITY_COLORS[p], fill: active ? 'currentColor' : PRIORITY_COLORS[p] }}
                        />
                      )}
                      <span>{PRIORITY_LABELS[p]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 색상 — 할 일/일정 둘 다. 일정은 시간 블록 색, 할 일은 카테고리 색. */}
          <div className={cn('flex flex-col gap-1.5', isEvent && 'sm:col-span-2')}>
            <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              색상
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTaskColor(undefined)}
                className={cn(
                  'h-8 rounded-md border px-2.5 text-[11px] transition-colors',
                  !taskColor
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                기본
              </button>
              {TASK_COLOR_OPTIONS.map((option) => {
                const active = taskColor === option.value;
                const color = TASK_LIST_COLORS[option.value].stripe;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTaskColor(option.value)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors',
                      active
                        ? 'border-foreground bg-accent text-foreground'
                        : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 리스트 — 좌측 col */}
          {!isEvent && lists.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold inline-flex items-center gap-1.5">
                <Folder className="h-3 w-3" />
                리스트
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setListId(undefined)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                    !listId
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                  )}
                >
                  대기함
                </button>
                {lists.map((l) => {
                  const active = listId === l.id;
                  const c = TASK_LIST_COLORS[l.color];
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setListId(l.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                        active
                          ? 'bg-foreground text-background font-medium'
                          : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                      )}
                    >
                      {l.emoji ? (
                        <span aria-hidden>{l.emoji}</span>
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.stripe }}
                          aria-hidden
                        />
                      )}
                      <span>{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 목표 — 우측 col */}
          {!isEvent && goals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold inline-flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                목표
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setGoalId(undefined);
                    setMilestoneId(undefined);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                    !goalId
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                  )}
                >
                  연결 안 함
                </button>
                {goals.map((goal) => {
                  const active = goalId === goal.id;
                  const color = GOAL_COLORS[goal.color];
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setGoalId(goal.id);
                        setMilestoneId(undefined);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                        active
                          ? 'bg-foreground text-background font-medium'
                          : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: active ? 'currentColor' : color.stripe }}
                        aria-hidden
                      />
                      <span>{goal.title}</span>
                    </button>
                  );
                })}
              </div>

              {selectedGoal && selectedMilestones.length > 0 && (
                <select
                  value={milestoneId ?? ''}
                  onChange={(event) => setMilestoneId(event.target.value || undefined)}
                  className="mt-1 w-full px-2.5 py-2 text-[12px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none text-foreground"
                  aria-label="마일스톤"
                >
                  <option value="">마일스톤 없이 연결</option>
                  {selectedMilestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.done ? '완료 - ' : ''}{milestone.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 시리즈 인스턴스 streak — 반복 task 편집 시에만. full row */}
          {!isEvent && series && series.kind === 'task' && series.master.recurrence && (() => {
            const stats = computeStreakStats(series.master);
            return (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold inline-flex items-center gap-1.5">
                  🔥
                  진행률
                </label>
                <StreakCard {...stats} />
              </div>
            );
          })()}

          {/* 반복 — Apple Cal/Google Cal 패턴. 단발 → 시리즈 / 시리즈 → 단발 모두 가능. full row */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold inline-flex items-center gap-1.5">
              <RotateCw className="h-3 w-3" />
              반복
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {(
                [
                  ['none', '안 함'],
                  ['daily', '매일'],
                  ['weekly', '매주'],
                  ['monthly', '매달'],
                  ['yearly', '매년'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRecurrence(key)}
                  className={cn(
                    'px-3 py-1.5 text-[12px] rounded-md transition-colors',
                    recurrence === key
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* 매주 — 요일 선택 (다중) */}
            {recurrence === 'weekly' && (
              <div className="flex gap-1 mt-0.5">
                {WEEKDAY_ORDER.map((wd) => {
                  const active = byday.includes(wd);
                  return (
                    <button
                      key={wd}
                      type="button"
                      onClick={() =>
                        setByday((prev) =>
                          prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd],
                        )
                      }
                      className={cn(
                        'h-7 w-7 text-[11px] font-medium rounded-md transition-colors',
                        active
                          ? 'bg-foreground text-background'
                          : 'border border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                      title={`${WEEKDAY_LABELS[wd]}요일`}
                    >
                      {WEEKDAY_LABELS[wd]}
                    </button>
                  );
                })}
              </div>
            )}
            {/* 종료일 (반복 일시정지/종료) — 반복 활성 시만 */}
            {recurrence !== 'none' && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[10.5px] font-mono uppercase tracking-wide text-muted-foreground">
                  ~까지
                </span>
                <input
                  type="date"
                  value={recurrenceUntil}
                  onChange={(e) => setRecurrenceUntil(e.target.value)}
                  className="px-2 py-1 text-[12px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none"
                />
                {recurrenceUntil && (
                  <button
                    type="button"
                    onClick={() => setRecurrenceUntil('')}
                    className="text-[10.5px] text-muted-foreground hover:text-foreground"
                  >
                    무한
                  </button>
                )}
              </div>
            )}

            {/* 다음 발생 미리보기 — 반복 규칙이 있을 때 */}
            {recurrence !== 'none' && date && time && (() => {
              const untilIso = recurrenceUntil
                ? new Date(`${recurrenceUntil}T23:59:59`).toISOString()
                : undefined;
              const previewRule = presetToRule(recurrence, byday, untilIso);
              if (!previewRule) return null;
              try {
                const startIso = buildIso(date, time);
                const fakeMaster = {
                  id: 'preview', title: '', done: false, createdAt: '',
                  startAt: startIso,
                  endAt: addMinutes(startIso, duration),
                  recurrence: previewRule,
                } as PlannerTask;
                const rangeEnd = new Date(new Date(startIso).getTime() + 60 * 86_400_000); // 60일
                const next = expandRecurrence(fakeMaster, new Date(startIso), rangeEnd).slice(0, 5);
                if (next.length === 0) return null;
                return (
                  <div className="mt-1 px-2 py-1.5 rounded bg-accent/30 text-[10.5px] text-muted-foreground tabular-nums leading-snug">
                    <span className="font-mono uppercase tracking-wide text-[9.5px] mr-1">다음:</span>
                    {next.map((inst, i) => {
                      const d = new Date(inst.occurrenceStartIso);
                      return (
                        <span key={inst.id}>
                          {i > 0 && <span className="mx-1 text-muted-foreground/50">·</span>}
                          {d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                        </span>
                      );
                    })}
                  </div>
                );
              } catch {
                return null;
              }
            })()}
          </div>

          {/* 서브태스크 (체크리스트) — 할 일 모드만. full row */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold inline-flex items-center gap-1.5">
                <ListChecks className="h-3 w-3" />
                체크리스트
                {subtasksDraft.length > 0 && (
                  <span className="text-muted-foreground font-mono normal-case tracking-normal">
                    ({subtasksDraft.filter((s) => s.done).length}/{subtasksDraft.length})
                  </span>
                )}
              </label>
              <SubtaskList
                subtasks={subtasksDraft}
                onAdd={(text) => {
                  setSubtasksDraft((prev) => [
                    ...prev,
                    {
                      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                      text,
                      done: false,
                      order: prev.length > 0 ? Math.max(...prev.map((s) => s.order)) + 1 : 0,
                    },
                  ]);
                }}
                onToggle={(sid) => {
                  setSubtasksDraft((prev) =>
                    prev.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)),
                  );
                }}
                onRemove={(sid) => {
                  setSubtasksDraft((prev) => prev.filter((s) => s.id !== sid));
                }}
                onUpdate={(sid, text) => {
                  setSubtasksDraft((prev) =>
                    prev.map((s) => (s.id === sid ? { ...s, text } : s)),
                  );
                }}
                mode="modal"
              />
            </div>
          )}

          {/* 노트 (collapsible) — 할 일 모드만. full row */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              {!noteOpen ? (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="self-start inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>+ 노트 추가</span>
                </button>
              ) : (
                <>
                  <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
                    노트
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="자세한 설명·메모 (선택)"
                    rows={3}
                    className="w-full px-3 py-2 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/50 focus:outline-none transition-colors text-foreground resize-none"
                  />
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row sm:justify-between mt-2 gap-2">
          {mode.kind === 'schedule' ? (
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={handleUnschedule}
                className="px-3 py-1.5 text-[12px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                대기함으로
              </button>
              {/* 삭제 — 시리즈면 split button 으로 '이 항목만 / 전체' 분기 */}
              {isSeriesInstance ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleDelete('this')}>이 항목만 건너뛰기</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete('all')} className="text-rose-500 focus:text-rose-500">
                      전체 시리즈 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDelete('all')}
                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  삭제
                </button>
              )}
            </div>
          ) : <div />}
          <div className="flex gap-1.5 items-stretch">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              취소
            </button>
            {isSeriesInstance ? (
              // 시리즈 인스턴스 편집 — split button. 본 클릭 = 이 항목만, 화살표 = 정책 선택.
              <div className="flex rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => submitWithScope('this')}
                  title="이 항목만 (Ctrl/Cmd + Enter)"
                  className="px-4 py-1.5 text-[12px] bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                >
                  이 항목만
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-2 py-1.5 bg-foreground text-background hover:opacity-90 transition-opacity border-l border-background/20"
                      title="정책 선택"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => submitWithScope('this')}>이 항목만</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => submitWithScope('future')}>이 항목과 이후</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => submitWithScope('all')}>전체 시리즈</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                title="Ctrl/Cmd + Enter"
                className="px-4 py-1.5 text-[12px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
              >
                {mode.kind === 'schedule' ? '배정' : '추가'}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

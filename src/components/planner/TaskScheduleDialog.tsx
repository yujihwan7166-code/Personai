import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  Palette,
  RotateCw,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import {
  formatReminderSummary,
  notificationPermission,
  normalizeReminderMinutes,
  PLANNER_REMINDER_OPTIONS,
  requestNotificationPermission,
} from '@/lib/planner/reminders';
import { editAll, editThisAndFuture, editThisOnly } from '@/lib/planner/seriesEdit';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_LIST_COLORS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type PlannerTask,
  type Priority,
  type RecurrenceRule,
  type TaskListColor,
  type WeekdayCode,
} from '@/types/planner';

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
  | { kind: 'create'; presetStartIso: string; presetIsEvent?: boolean };

interface TaskScheduleDialogProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

type EntryKind = 'event' | 'task';
type RecurrencePreset = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const DURATION_PRESETS = [30, 60, 90] as const;
const DEFAULT_DURATION_MIN = 60;

const TASK_COLOR_OPTIONS: Array<{ value: TaskListColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'teal', label: '청록' },
  { value: 'green', label: '초록' },
  { value: 'amber', label: '노랑' },
  { value: 'orange', label: '주황' },
  { value: 'rose', label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'cyan', label: '하늘' },
];

const toDateInput = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toTimeInput = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const buildIso = (dateStr: string, timeStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
};

const addMinutes = (iso: string, mins: number): string =>
  new Date(new Date(iso).getTime() + mins * 60_000).toISOString();

const minutesBetween = (startIso: string, endIso: string): number =>
  Math.max(5, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
};

const formatDateValue = (dateStr?: string): string => {
  if (!dateStr) return '없음';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
};

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
    until: rec.until ? rec.until.slice(0, 10) : '',
  };
};

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

const Row = ({
  icon,
  label,
  value,
  children,
  className,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  children?: ReactNode;
  className?: string;
}) => (
  <div className={cn('grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-foreground/10 px-1 py-2', className)}>
    <span className="flex h-7 w-6 items-center justify-center text-foreground/72">{icon}</span>
    <div className="min-w-0">
      {children ? (
        <div className="grid min-h-7 grid-cols-[92px_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground/86">{label}</p>
            {value && <p className="mt-0.5 truncate text-[11.5px] font-medium text-foreground/54">{value}</p>}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        <div className="flex min-h-7 items-center justify-between gap-3">
          <p className="truncate text-[14px] font-semibold text-foreground/86">{label}</p>
          {value && <p className="shrink-0 text-[13px] font-semibold text-foreground/68">{value}</p>}
        </div>
      )}
    </div>
  </div>
);

const Pill = ({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex h-7 items-center justify-center rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
      active
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-transparent bg-muted/55 text-foreground/70 hover:bg-muted hover:text-foreground',
      className,
    )}
  >
    {children}
  </button>
);

const fieldInputClass =
  'h-8 rounded-md border-0 bg-[#f3f0ea] px-2.5 text-[13px] font-semibold text-foreground outline-none focus:bg-white focus:ring-1 focus:ring-primary/55';

export const TaskScheduleDialog = ({ open, mode, onClose }: TaskScheduleDialogProps) => {
  const [title, setTitle] = useState('');
  const [entryKind, setEntryKind] = useState<EntryKind>('task');
  const [plannedFor, setPlannedFor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_MIN);
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>(0);
  const [taskColor, setTaskColor] = useState<TaskListColor | undefined>();
  const [recurrence, setRecurrence] = useState<RecurrencePreset>('none');
  const [byday, setByday] = useState<WeekdayCode[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [note, setNote] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number[] | undefined>();
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderInput, setCustomReminderInput] = useState('15');

  const lastResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mode || !open) {
      lastResetKeyRef.current = null;
      return;
    }

    const key = mode.kind === 'schedule'
      ? `s:${mode.taskId}`
      : `c:${mode.presetStartIso}:${mode.presetIsEvent ? 'event' : 'task'}`;
    if (lastResetKeyRef.current === key) return;
    lastResetKeyRef.current = key;

    if (mode.kind === 'schedule') {
      const direct = taskStore.findMaster(mode.taskId);
      const series = resolveSeries(mode.taskId);
      const masterTask = series?.kind === 'task' ? series.master : direct;
      const masterEvent = series?.kind === 'event' ? series.master : undefined;
      const start = mode.initialStart ?? masterTask?.startAt ?? masterEvent?.startAt ?? new Date().toISOString();
      const end = mode.initialEnd ?? masterTask?.endAt ?? masterEvent?.endAt ?? addMinutes(start, DEFAULT_DURATION_MIN);
      const taskPlannedDay = masterTask?.plannedFor ?? toDateInput(start);
      const recSource = series?.master.recurrence ?? direct?.recurrence ?? masterEvent?.recurrence;
      const rec = ruleToPreset(recSource);
      const reminderSource = masterTask?.reminderMinutes ?? masterEvent?.reminderMinutes ?? direct?.reminderMinutes;
      const normalizedReminder = normalizeReminderMinutes(reminderSource);

      setTitle(mode.initialTitle);
      setEntryKind(masterTask?.startAt || masterEvent ? 'event' : 'task');
      setPlannedFor(taskPlannedDay);
      setStartDate(toDateInput(start));
      setStartTime(toTimeInput(start));
      setDuration(minutesBetween(start, end) || DEFAULT_DURATION_MIN);
      setCustomDurationOpen(!DURATION_PRESETS.includes((minutesBetween(start, end) || DEFAULT_DURATION_MIN) as typeof DURATION_PRESETS[number]));
      setPriority(mode.initialPriority ?? masterTask?.priority ?? 0);
      setTaskColor(masterTask?.color);
      setRecurrence(rec.preset);
      setByday(rec.byday);
      setRecurrenceUntil(rec.until);
      setNote(mode.initialNote ?? masterTask?.note ?? '');
      setReminderMinutes(normalizedReminder);
      setCustomReminderOpen(normalizedReminder?.[0] !== undefined && !PLANNER_REMINDER_OPTIONS.some((option) => option.minutes === normalizedReminder[0]));
      setCustomReminderInput(String(normalizedReminder?.[0] ?? 15));
      return;
    }

    const presetDate = toDateInput(mode.presetStartIso);
    const presetTime = toTimeInput(mode.presetStartIso);
    const kind: EntryKind = mode.presetIsEvent ? 'event' : 'task';
    setTitle('');
    setEntryKind(kind);
    setPlannedFor(presetDate);
    setStartDate(presetDate);
    setStartTime(presetTime);
    setDuration(DEFAULT_DURATION_MIN);
    setCustomDurationOpen(false);
    setPriority(0);
    setTaskColor(undefined);
    setRecurrence('none');
    setByday([]);
    setRecurrenceUntil('');
    setNote('');
    setReminderMinutes(undefined);
    setCustomReminderOpen(false);
    setCustomReminderInput('15');
  }, [mode, open]);

  const isEvent = entryKind === 'event';
  const series = mode?.kind === 'schedule' ? resolveSeries(mode.taskId) : null;
  const isSeriesInstance = Boolean(series);
  const dateForRecurrence = isEvent ? startDate : plannedFor;

  if (!mode) return null;

  const recurrenceUntilIso = recurrenceUntil
    ? new Date(`${recurrenceUntil}T23:59:59`).toISOString()
    : undefined;

  const buildRecurrence = () => presetToRule(recurrence, byday, recurrenceUntilIso);

  const switchKind = (kind: EntryKind) => {
    setEntryKind(kind);
    if (kind === 'task') {
      setPlannedFor((current) => current || startDate);
      return;
    }
    setStartDate((current) => current || plannedFor || toDateInput(new Date().toISOString()));
  };

  const ensureReminderPermission = async (): Promise<boolean> => {
    const current = notificationPermission();
    if (current === 'unsupported') {
      notify.warning('이 브라우저는 알림을 지원하지 않아요', { duration: 2200 });
      return false;
    }
    if (current === 'granted') return true;
    if (current === 'denied') {
      notify.warning('브라우저 설정에서 알림 권한을 허용해주세요', { duration: 2600 });
      return false;
    }
    const next = await requestNotificationPermission();
    if (next === 'granted') return true;
    notify.warning('알림 권한이 허용되지 않아 저장하지 않았어요', { duration: 2400 });
    return false;
  };

  const handleReminderSelect = async (minutes: number | null) => {
    if (minutes === null) {
      setReminderMinutes(undefined);
      setCustomReminderOpen(false);
      return;
    }
    const allowed = await ensureReminderPermission();
    if (!allowed) return;
    setReminderMinutes([minutes]);
    setCustomReminderOpen(false);
  };

  const handleCustomReminderApply = async () => {
    const minutes = Math.max(0, Math.min(30 * 24 * 60, Math.round(Number(customReminderInput))));
    if (!Number.isFinite(minutes)) {
      notify.warning('알림 시간을 분 단위로 입력해주세요', { duration: 1800 });
      return;
    }
    const allowed = await ensureReminderPermission();
    if (!allowed) return;
    setCustomReminderInput(String(minutes));
    setReminderMinutes([minutes]);
    setCustomReminderOpen(false);
  };

  const submitWithScope = (scope: 'this' | 'future' | 'all' = 'all') => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (recurrenceUntil && dateForRecurrence && recurrenceUntil < dateForRecurrence) {
      notify.warning('반복 종료일이 시작 날짜보다 빠를 수 없어요');
      return;
    }

    const recurrenceRule = buildRecurrence();

    if (!isEvent) {
      if (!plannedFor) return;
      const patch: Partial<PlannerTask> = {
        title: trimmed,
        plannedFor,
        startAt: undefined,
        endAt: undefined,
        allDay: undefined,
        priority: priority === 0 ? undefined : priority,
        color: taskColor,
        recurrence: recurrenceRule,
        note: note.trim() || undefined,
        reminderMinutes,
      };

      if (mode.kind === 'schedule') {
        if (series && series.kind === 'task') {
          if (scope === 'this') editThisOnly(taskStore, series.master, series.occurrenceIso, patch);
          else if (scope === 'future') editThisAndFuture(taskStore, series.master, series.occurrenceIso, patch);
          else editAll(taskStore, series.master, patch);
        } else {
          taskStore.update(mode.taskId, patch);
        }
        notify.success('할 일을 저장했어요');
      } else {
        taskStore.add(patch as Omit<PlannerTask, 'id' | 'createdAt' | 'done'>);
        notify.success('할 일을 추가했어요');
      }
      onClose();
      return;
    }

    if (!startDate) return;
    const eventStartIso = buildIso(startDate, startTime || '09:00');
    const eventEndIso = addMinutes(eventStartIso, duration);
    const patch: Partial<PlannerTask> = {
      title: trimmed,
      plannedFor: undefined,
      startAt: eventStartIso,
      endAt: eventEndIso,
      priority: undefined,
      color: taskColor,
      recurrence: recurrenceRule,
      note: note.trim() || undefined,
      reminderMinutes,
      allDay: undefined,
    };

    if (mode.kind === 'schedule') {
      if (series && series.kind === 'task') {
        if (scope === 'this') editThisOnly(taskStore, series.master, series.occurrenceIso, patch);
        else if (scope === 'future') editThisAndFuture(taskStore, series.master, series.occurrenceIso, patch);
        else editAll(taskStore, series.master, patch);
      } else {
        taskStore.update(mode.taskId, patch);
      }
      notify.success('일정을 저장했어요');
    } else {
      taskStore.add(patch as Omit<PlannerTask, 'id' | 'createdAt' | 'done'>);
      notify.success('일정을 추가했어요');
    }
    onClose();
  };

  const handleSubmit = () => {
    if (isSeriesInstance) {
      notify.info('반복 항목은 저장 버튼의 범위를 선택해주세요', { duration: 2200 });
      return;
    }
    submitWithScope('all');
  };

  const handleDelete = (scope: 'this' | 'all' = 'all') => {
    if (mode.kind !== 'schedule') return;
    if (series && series.kind === 'task' && scope === 'this') {
      editThisOnly(taskStore, series.master, series.occurrenceIso, {} as Partial<PlannerTask>);
      notify.success('이번 항목을 건너뛰었어요');
      onClose();
      return;
    }
    taskStore.remove(mode.taskId);
    notify.success('휴지통으로 이동했어요');
    onClose();
  };

  const handleKeyDownGlobal = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (isSeriesInstance) submitWithScope('this');
      else handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-h-[84vh] max-w-[520px] overflow-hidden rounded-[14px] border border-foreground/20 bg-[#fffefa] p-0 shadow-[0_24px_70px_rgba(25,22,18,0.22)]"
        onKeyDown={handleKeyDownGlobal}
        hideClose
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{mode.kind === 'schedule' ? '항목 편집' : '새 항목'}</DialogTitle>
          <DialogDescription>일정 또는 할 일을 설정합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[84vh] flex-col bg-[#fffefa]">
          <div className="shrink-0 border-b border-foreground/10 px-5 pb-2 pt-2">
            <div className="flex h-9 items-center justify-between gap-3">
              <div className="grid h-8 w-[176px] grid-cols-2 rounded-full border border-foreground/18 bg-white p-0.5 shadow-[inset_0_0_0_1px_rgba(20,20,20,0.03)]">
                <button
                  type="button"
                  onClick={() => switchKind('event')}
                  aria-pressed={isEvent}
                  className={cn(
                    'rounded-full border text-[12px] font-bold transition-colors',
                    isEvent
                      ? 'border-primary/25 bg-[#fffefa] text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-muted/45 hover:text-foreground',
                  )}
                >
                  일정
                </button>
                <button
                  type="button"
                  onClick={() => switchKind('task')}
                  aria-pressed={!isEvent}
                  className={cn(
                    'rounded-full border text-[12px] font-bold transition-colors',
                    !isEvent
                      ? 'border-primary/25 bg-[#fffefa] text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-muted/45 hover:text-foreground',
                  )}
                >
                  할 일
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/72 hover:bg-accent hover:text-foreground"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3 pb-2">
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-foreground/8"
                style={{
                  backgroundColor: taskColor ? TASK_LIST_COLORS[taskColor].stripe : isEvent ? '#3b82f6' : '#e11d48',
                }}
                aria-hidden
              />
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit();
                }}
                autoFocus={mode.kind === 'create'}
                placeholder={isEvent ? '일정을 입력하세요.' : '할 일을 입력하세요.'}
                className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 text-[20px] font-medium leading-none text-foreground outline-none placeholder:text-muted-foreground/82"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-0.5">
            {isEvent ? (
              <div className="space-y-1">
                <Row icon={<CalendarClock className="h-4 w-4" />} label="시작">
                  <div className="grid max-w-[392px] grid-cols-[minmax(150px,220px)_136px] gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className={cn(fieldInputClass, 'w-full')}
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className={cn(fieldInputClass, 'w-full min-w-[136px]')}
                    />
                  </div>
                </Row>

                <Row icon={<Clock3 className="h-4 w-4" />} label="길이" value={formatDuration(duration)}>
                  <DurationPicker
                    duration={duration}
                    customOpen={customDurationOpen}
                    onDurationChange={setDuration}
                    onCustomOpenChange={setCustomDurationOpen}
                  />
                </Row>
              </div>
            ) : (
              <div className="space-y-1">
                <Row icon={<CalendarDays className="h-4 w-4" />} label="할 날짜" value={formatDateValue(plannedFor)}>
                  <input
                    type="date"
                    value={plannedFor}
                    onChange={(event) => setPlannedFor(event.target.value)}
                    className={cn(fieldInputClass, 'w-full')}
                  />
                </Row>

                <Row icon={<Flag className="h-4 w-4" />} label="우선순위" value={PRIORITY_LABELS[priority]}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([0, 1, 2, 3] as Priority[]).map((value) => (
                      <Pill
                        key={value}
                        active={priority === value}
                        onClick={() => setPriority(value)}
                        className={cn(
                          'px-1',
                          priority === value && value > 0 && 'text-foreground/82',
                        )}
                      >
                        {value > 0 && (
                          <Flag
                            className="mr-1 h-3 w-3"
                            style={{ color: PRIORITY_COLORS[value], fill: PRIORITY_COLORS[value] }}
                          />
                        )}
                        {PRIORITY_LABELS[value]}
                      </Pill>
                    ))}
                  </div>
                </Row>
              </div>
            )}

            <div className="mt-1 pt-1">
              <Row icon={<Palette className="h-4 w-4" />} label="색상" value={taskColor ? TASK_COLOR_OPTIONS.find((option) => option.value === taskColor)?.label : '기본'}>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaskColor(undefined)}
                    className={cn(
                      'h-7 rounded-full px-3 text-[12.5px] font-semibold',
                      !taskColor ? 'bg-primary/10 text-primary' : 'bg-muted/55 text-foreground/70 hover:bg-muted hover:text-foreground',
                    )}
                  >
                    기본
                  </button>
                  {TASK_COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTaskColor(option.value)}
                      aria-label={`${option.label} 색상`}
                      className={cn(
                        'h-7 w-7 rounded-full border transition-transform hover:scale-105',
                        taskColor === option.value ? 'border-foreground ring-2 ring-foreground/16' : 'border-transparent',
                      )}
                      style={{ backgroundColor: TASK_LIST_COLORS[option.value].stripe }}
                    />
                  ))}
                </div>
              </Row>

              <Row icon={<RotateCw className="h-4 w-4" />} label="반복" value={recurrence === 'none' ? '안 함' : '반복 설정됨'}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['none', '안 함'],
                        ['daily', '매일'],
                        ['weekly', '매주'],
                        ['monthly', '매달'],
                        ['yearly', '매년'],
                      ] as const
                    ).map(([value, label]) => (
                      <Pill key={value} active={recurrence === value} onClick={() => setRecurrence(value)}>
                        {label}
                      </Pill>
                    ))}
                  </div>
                  {recurrence === 'weekly' && (
                    <div className="flex gap-1">
                      {WEEKDAY_ORDER.map((weekday) => {
                        const active = byday.includes(weekday);
                        return (
                          <button
                            key={weekday}
                            type="button"
                            onClick={() => {
                              setByday((prev) => prev.includes(weekday)
                                ? prev.filter((item) => item !== weekday)
                                : [...prev, weekday]);
                            }}
                            className={cn(
                              'h-7 w-7 rounded-md border text-[11px] font-bold transition-colors',
                              active ? 'border-primary/55 bg-primary/10 text-primary' : 'border-foreground/14 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {WEEKDAY_LABELS[weekday]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {recurrence !== 'none' && (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-[11.5px] font-bold text-muted-foreground">종료</span>
                      <input
                        type="date"
                        value={recurrenceUntil}
                        onChange={(event) => setRecurrenceUntil(event.target.value)}
                        className={fieldInputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setRecurrenceUntil('')}
                        className="text-[11.5px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        없음
                      </button>
                    </div>
                  )}
                </div>
              </Row>

              <Row icon={<Bell className="h-4 w-4" />} label="알림" value={formatReminderSummary(reminderMinutes)}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {PLANNER_REMINDER_OPTIONS.map((option) => {
                      const active = option.minutes === null
                        ? !reminderMinutes?.length
                        : reminderMinutes?.[0] === option.minutes;
                      return (
                        <button
                          key={option.minutes ?? 'none'}
                          type="button"
                          onClick={() => handleReminderSelect(option.minutes)}
                          className={cn(
                            'h-7 rounded-full border px-2.5 text-[12px] font-bold transition-colors',
                            active
                              ? 'border-primary/55 bg-primary/10 text-primary'
                              : 'border-transparent bg-muted/55 text-foreground/70 hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCustomReminderOpen((current) => !current)}
                      className={cn(
                        'h-7 rounded-full border px-2.5 text-[12px] font-bold transition-colors',
                        customReminderOpen
                          ? 'border-primary/45 bg-primary/10 text-primary'
                          : 'border-transparent bg-muted/55 text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      직접
                    </button>
                  </div>
                  {customReminderOpen && (
                    <div className="flex max-w-[280px] items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={43200}
                        step={1}
                        value={customReminderInput}
                        onChange={(event) => setCustomReminderInput(event.target.value)}
                        className={cn(fieldInputClass, 'w-24')}
                      />
                      <span className="text-[12px] font-semibold text-muted-foreground">분 전</span>
                      <button
                        type="button"
                        onClick={handleCustomReminderApply}
                        className="h-8 rounded-md bg-foreground px-3 text-[12px] font-bold text-background hover:bg-foreground/90"
                      >
                        적용
                      </button>
                    </div>
                  )}
                  {notificationPermission() === 'denied' && (
                    <p className="text-[11px] font-medium text-rose-500">
                      브라우저에서 알림 권한이 차단되어 있어요.
                    </p>
                  )}
                </div>
              </Row>

              <Row icon={<AlignLeft className="h-4 w-4" />} label="설명" value={note ? '작성됨' : '없음'}>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="메모, 장소, 준비물 등을 적어두세요"
                  className={cn(fieldInputClass, 'w-full')}
                />
              </Row>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-foreground/10 bg-[#fffefa] px-5 py-2 sm:justify-between">
            <div>
              {mode.kind === 'schedule' && (
                isSeriesInstance ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleDelete('this')}>이번 항목만 건너뛰기</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete('all')} className="text-rose-500 focus:text-rose-500">
                        전체 반복 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete('all')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                )
              )}
            </div>

            {isSeriesInstance ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-foreground px-4 text-[13px] font-bold text-background hover:bg-foreground/90"
                  >
                    저장 범위
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => submitWithScope('this')}>이번 항목만</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => submitWithScope('future')}>이번과 이후</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => submitWithScope('all')}>전체 반복</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex h-9 min-w-[72px] items-center justify-center rounded-[10px] bg-foreground px-4 text-[13px] font-bold text-background hover:bg-foreground/90"
              >
                {mode.kind === 'schedule' ? '저장' : '추가'}
              </button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DurationPicker = ({
  duration,
  customOpen,
  onDurationChange,
  onCustomOpenChange,
}: {
  duration: number;
  customOpen: boolean;
  onDurationChange: (duration: number) => void;
  onCustomOpenChange: (open: boolean) => void;
}) => (
  <div className="space-y-2">
    <div className="grid grid-cols-4 gap-1.5">
      {DURATION_PRESETS.map((value) => (
        <Pill
          key={value}
          active={duration === value && !customOpen}
          onClick={() => {
            onDurationChange(value);
            onCustomOpenChange(false);
          }}
          className="px-1"
        >
          {value === 90 ? '90분' : formatDuration(value)}
        </Pill>
      ))}
      <Pill active={customOpen} onClick={() => onCustomOpenChange(true)} className="px-1">
        직접
      </Pill>
    </div>
    {customOpen && (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <input
          type="number"
          min={5}
          max={720}
          step={5}
          value={duration}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onDurationChange(Math.max(5, Math.min(720, next)));
          }}
          className={fieldInputClass}
        />
        <span className="text-[11.5px] font-bold text-muted-foreground">분</span>
      </div>
    )}
  </div>
);

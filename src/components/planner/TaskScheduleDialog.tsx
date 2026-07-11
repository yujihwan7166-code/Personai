import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronDown, Flag, RotateCw, Trash2 } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AnalogClockTimePicker } from './AnalogClockTimePicker';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { formatDurationMinutes } from '@/lib/formatDuration';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import {
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

const RECUR_SHORT: Record<RecurrencePreset, string> = {
  none: '반복 안 함',
  daily: '매일',
  weekly: '매주',
  monthly: '매달',
  yearly: '매년',
};

const RECUR_OPTIONS: ReadonlyArray<[RecurrencePreset, string]> = [
  ['none', '안 함'],
  ['daily', '매일'],
  ['weekly', '매주'],
  ['monthly', '매달'],
  ['yearly', '매년'],
];

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

/** 작은 섹션 라벨 (eyebrow). */
const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/40">{children}</p>
);

/** 팝오버를 여는 메타 칩 (반복·알림). 값이 있으면 강조. */
const metaChipClass = (active: boolean) =>
  cn(
    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors',
    active
      ? 'border-primary/40 bg-primary/[0.09] text-primary'
      : 'border-foreground/14 text-foreground/60 hover:border-foreground/28 hover:bg-foreground/[0.03] hover:text-foreground/85',
  );

type PillProps = {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'className'>;

const Pill = forwardRef<HTMLButtonElement, PillProps>(({ active, children, onClick, className, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    {...rest}
    className={cn(
      'inline-flex h-8 items-center justify-center gap-1 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors',
      active
        ? 'bg-primary/[0.12] text-primary ring-1 ring-inset ring-primary/30'
        : 'bg-foreground/[0.05] text-foreground/60 hover:bg-foreground/[0.09] hover:text-foreground/85',
      className,
    )}
  >
    {children}
  </button>
));
Pill.displayName = 'Pill';

const dateInputClass =
  'h-9 rounded-lg border border-foreground/14 bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/12';

export const TaskScheduleDialog = ({ open, mode, onClose }: TaskScheduleDialogProps) => {
  const [title, setTitle] = useState('');
  const [entryKind, setEntryKind] = useState<EntryKind>('task');
  const [plannedFor, setPlannedFor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_MIN);
  const [priority, setPriority] = useState<Priority>(0);
  const [taskColor, setTaskColor] = useState<TaskListColor | undefined>();
  const [recurrence, setRecurrence] = useState<RecurrencePreset>('none');
  const [byday, setByday] = useState<WeekdayCode[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [note, setNote] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number[] | undefined>();
  const [customReminderInput, setCustomReminderInput] = useState('15');
  const [colorOpen, setColorOpen] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);

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
      setPriority(mode.initialPriority ?? masterTask?.priority ?? 0);
      setTaskColor(masterTask?.color);
      setRecurrence(rec.preset);
      setByday(rec.byday);
      setRecurrenceUntil(rec.until);
      setNote(mode.initialNote ?? masterTask?.note ?? '');
      setReminderMinutes(normalizedReminder);
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
    setPriority(0);
    setTaskColor(undefined);
    setRecurrence('none');
    setByday([]);
    setRecurrenceUntil('');
    setNote('');
    setReminderMinutes(undefined);
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
      return;
    }
    const allowed = await ensureReminderPermission();
    if (!allowed) return;
    setReminderMinutes([minutes]);
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

  const accentHex = taskColor ? TASK_LIST_COLORS[taskColor].stripe : isEvent ? '#3b82f6' : '#e11d48';
  const reminderLabel = reminderMinutes?.length
    ? PLANNER_REMINDER_OPTIONS.find((option) => option.minutes === reminderMinutes[0])?.label ?? `${reminderMinutes[0]}분 전`
    : '알림 없음';
  const recurLabel = recurrence === 'weekly' && byday.length > 0
    ? `매주 ${byday.map((d) => WEEKDAY_LABELS[d]).join('')}`
    : RECUR_SHORT[recurrence];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-h-[86vh] max-w-[440px] overflow-hidden rounded-2xl border border-foreground/12 bg-[#fffefb] p-0 shadow-[0_28px_80px_-24px_rgba(25,22,18,0.35)]"
        onKeyDown={handleKeyDownGlobal}
        hideClose
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{mode.kind === 'schedule' ? '항목 편집' : '새 항목'}</DialogTitle>
          <DialogDescription>일정 또는 할 일을 설정합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[86vh] flex-col">
          {/* ── 헤더: 종류 전환 + 닫기 ── */}
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="inline-flex rounded-full bg-foreground/[0.05] p-0.5">
              {([['event', '일정'], ['task', '할 일']] as const).map(([kind, label]) => {
                const on = isEvent === (kind === 'event');
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => switchKind(kind)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-colors',
                      on ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          {/* ── 제목 + 색상 점 ── */}
          <div className="flex items-center gap-2.5 px-5 pt-3.5">
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="색상 선택"
                  className="h-5 w-5 shrink-0 rounded-full ring-1 ring-foreground/10 ring-offset-1 ring-offset-[#fffefb] transition-transform hover:scale-110"
                  style={{ backgroundColor: accentHex }}
                />
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" sideOffset={8} className="w-auto rounded-2xl p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45">색상</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setTaskColor(undefined); setColorOpen(false); }}
                    aria-label="기본 색상"
                    title="기본"
                    className="h-7 w-7 rounded-full border border-foreground/25 transition-transform hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 43%, #c9c9c9 43%, #c9c9c9 57%, #ffffff 57%)',
                      boxShadow: !taskColor ? '0 0 0 2px #fffefb, 0 0 0 4px rgba(90,90,90,0.6)' : undefined,
                    }}
                  />
                  {TASK_COLOR_OPTIONS.map((option) => {
                    const stripe = TASK_LIST_COLORS[option.value].stripe;
                    const selected = taskColor === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setTaskColor(option.value); setColorOpen(false); }}
                        aria-label={`${option.label} 색상`}
                        title={option.label}
                        className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: stripe,
                          boxShadow: selected ? `0 0 0 2px #fffefb, 0 0 0 4px ${stripe}` : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleSubmit(); }}
              autoFocus={mode.kind === 'create'}
              placeholder={isEvent ? '일정 제목' : '할 일 제목'}
              className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-[21px] font-semibold leading-none text-foreground outline-none placeholder:text-muted-foreground/55"
            />
          </div>

          {/* ── 본문 ── */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4">
            {/* 언제 */}
            <div>
              <Eyebrow>언제</Eyebrow>
              {isEvent ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={cn(dateInputClass, 'w-[148px]')}
                  />
                  <AnalogClockTimePicker
                    value={startTime}
                    onChange={setStartTime}
                    triggerAriaLabel="시작 시간 선택"
                    triggerClassName="h-9 min-w-[122px]"
                  />
                  <span aria-hidden className="px-0.5 text-foreground/25">·</span>
                  <DurationPicker duration={duration} onDurationChange={setDuration} />
                </div>
              ) : (
                <input
                  type="date"
                  value={plannedFor}
                  onChange={(event) => setPlannedFor(event.target.value)}
                  className={cn(dateInputClass, 'w-[168px]')}
                />
              )}
            </div>

            {/* 우선순위 (할 일 전용) */}
            {!isEvent && (
              <div>
                <Eyebrow>우선순위</Eyebrow>
                <div className="grid grid-cols-4 gap-1.5">
                  {([0, 1, 2, 3] as Priority[]).map((value) => (
                    <Pill
                      key={value}
                      active={priority === value}
                      onClick={() => setPriority(value)}
                      className={cn('px-1', priority === value && value > 0 && 'text-foreground/82')}
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
              </div>
            )}

            {/* 옵션: 반복 · 알림 */}
            <div>
              <Eyebrow>옵션</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {/* 반복 */}
                <Popover open={recurOpen} onOpenChange={setRecurOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={metaChipClass(recurrence !== 'none')}>
                      <RotateCw className="h-3.5 w-3.5" />
                      {recurLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" side="top" sideOffset={8} className="w-72 rounded-2xl p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45">반복</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RECUR_OPTIONS.map(([value, label]) => (
                        <Pill key={value} active={recurrence === value} onClick={() => setRecurrence(value)}>
                          {label}
                        </Pill>
                      ))}
                    </div>
                    {recurrence === 'weekly' && (
                      <div className="mt-2.5 flex gap-1">
                        {WEEKDAY_ORDER.map((weekday) => {
                          const active = byday.includes(weekday);
                          return (
                            <button
                              key={weekday}
                              type="button"
                              onClick={() => setByday((prev) => (prev.includes(weekday)
                                ? prev.filter((item) => item !== weekday)
                                : [...prev, weekday]))}
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
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[11.5px] font-bold text-muted-foreground">종료</span>
                        <input
                          type="date"
                          value={recurrenceUntil}
                          onChange={(event) => setRecurrenceUntil(event.target.value)}
                          className={cn(dateInputClass, 'h-8 flex-1')}
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
                  </PopoverContent>
                </Popover>

                {/* 알림 */}
                <Popover open={remindOpen} onOpenChange={setRemindOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={metaChipClass(Boolean(reminderMinutes?.length))}>
                      <Bell className="h-3.5 w-3.5" />
                      {reminderLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" side="top" sideOffset={8} className="w-64 rounded-2xl p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45">알림</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PLANNER_REMINDER_OPTIONS.map((option) => {
                        const active = option.minutes === null
                          ? !reminderMinutes?.length
                          : reminderMinutes?.[0] === option.minutes;
                        return (
                          <Pill key={option.minutes ?? 'none'} active={active} onClick={() => void handleReminderSelect(option.minutes)}>
                            {option.label}
                          </Pill>
                        );
                      })}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={43200}
                          step={1}
                          value={customReminderInput}
                          onChange={(event) => setCustomReminderInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleCustomReminderApply();
                            }
                          }}
                          aria-label="알림 시간 직접 입력 (분 전)"
                          className="h-9 w-full rounded-lg border border-foreground/14 bg-white pl-3 pr-11 text-[13px] font-bold tabular-nums text-foreground outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                          분 전
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCustomReminderApply()}
                        className="h-9 shrink-0 rounded-lg bg-foreground px-3 text-[12px] font-bold text-background hover:bg-foreground/90"
                      >
                        적용
                      </button>
                    </div>
                    {notificationPermission() === 'denied' && (
                      <p className="mt-2 text-[11px] font-medium text-rose-500">
                        브라우저에서 알림 권한이 차단되어 있어요.
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 메모 */}
            <div>
              <Eyebrow>메모</Eyebrow>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="메모, 장소, 준비물 등을 적어두세요"
                rows={2}
                className="w-full resize-none rounded-lg border border-foreground/14 bg-white px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/12"
              />
            </div>
          </div>

          {/* ── 푸터 ── */}
          <DialogFooter className="shrink-0 border-t border-foreground/8 bg-[#fffefb] px-5 py-3 sm:justify-between">
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
                className="inline-flex h-9 min-w-[80px] items-center justify-center rounded-[10px] bg-foreground px-4 text-[13px] font-bold text-background hover:bg-foreground/90"
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

/**
 * 길이 선택 — 빠른 칩 3개 + 분 단위 직접 입력 input (한 줄).
 */
const DurationPicker = ({
  duration,
  onDurationChange,
}: {
  duration: number;
  onDurationChange: (duration: number) => void;
}) => {
  // input 직접 입력 흐름 자연스럽게 (backspace 로 빈 문자열 잠깐 허용) — string 으로 보관.
  const [durationInput, setDurationInput] = useState(String(duration));
  // 외부 duration 변경 (preset chip 클릭) 시 input value 도 같이 갱신.
  useEffect(() => {
    setDurationInput(String(duration));
  }, [duration]);

  const handleInputChange = (raw: string) => {
    setDurationInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      onDurationChange(Math.min(1440, Math.floor(n)));
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {DURATION_PRESETS.map((value) => (
        <Pill
          key={value}
          active={duration === value}
          onClick={() => onDurationChange(value)}
          className="px-2.5"
        >
          {formatDurationMinutes(value)}
        </Pill>
      ))}
      <label className="relative inline-flex items-center">
        <span className="sr-only">길이 직접 입력 (분)</span>
        <input
          type="number"
          inputMode="numeric"
          min={5}
          max={1440}
          step={5}
          value={durationInput}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="0"
          aria-label="길이 직접 입력 (분)"
          className="h-8 w-[64px] rounded-lg border border-foreground/14 bg-white pl-2 pr-6 text-[12px] font-bold tabular-nums text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute right-2 text-[10.5px] font-semibold text-muted-foreground">
          분
        </span>
      </label>
    </div>
  );
};

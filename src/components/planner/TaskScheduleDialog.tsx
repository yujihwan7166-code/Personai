/**
 * 할 일 / 일정 시간 배정·생성 모달.
 *
 * 모드 2종:
 * - schedule: 기존 task 의 시간 배정/변경 (taskId 전달)
 * - create:   신규 추가 (presetStartIso 전달, 사용자가 title 입력)
 *
 * 단순화 — 리스트/목표/체크리스트/노트 제거. 핵심만:
 * 제목 / 종류(할일·일정) / 날짜·시간 / 길이 / 우선순위 / 색상 / 반복.
 *
 * 디자인은 라이트 톤 (chip 옅은 outline, 라벨 medium foreground/70).
 */
import { useEffect, useRef, useState } from 'react';
import { Trash2, Flag, RotateCw, ChevronDown } from 'lucide-react';
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
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { PlannerTask, Priority, RecurrenceRule, TaskListColor, WeekdayCode } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS, TASK_LIST_COLORS, WEEKDAY_ORDER, WEEKDAY_LABELS } from '@/types/planner';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
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
  | { kind: 'create'; presetStartIso: string; presetIsEvent?: boolean };

interface TaskScheduleDialogProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

// 자주 쓰는 4개만. 그 외 시간은 "직접" input 으로.
const DURATIONS = [30, 60, 90, 120] as const;

const TASK_COLOR_OPTIONS: Array<{ value: TaskListColor; label: string }> = [
  { value: 'blue',   label: '파랑' },
  { value: 'green',  label: '초록' },
  { value: 'amber',  label: '노랑' },
  { value: 'rose',   label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'teal',   label: '청록' },
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

// 라이트 톤 라벨.
const LabelText = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[12.5px] font-semibold text-foreground/80 leading-none">
    {children}
  </label>
);

export const TaskScheduleDialog = ({ open, mode, onClose }: TaskScheduleDialogProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [isEvent, setIsEvent] = useState(false);
  const [priority, setPriority] = useState<Priority>(0);
  const [recurrence, setRecurrence] = useState<RecurrencePreset>('none');
  const [byday, setByday] = useState<WeekdayCode[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [taskColor, setTaskColor] = useState<TaskListColor | undefined>();

  // 모드 변경 시 폼 초기화 — open 이 false→true 로 전환되거나 다른 mode 객체가 들어왔을 때만.
  // 부모 리렌더로 mode 참조만 새로 들어오는 경우(같은 내용)에는 사용자 입력을 보존해야 함.
  // 따라서 open=true 인 동안의 후속 mode 변경은 taskId/kind/presetStartIso 가 실제로 달라질 때만 반응.
  const lastResetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mode || !open) {
      lastResetKeyRef.current = null;
      return;
    }
    const key = mode.kind === 'schedule'
      ? `s:${mode.taskId}`
      : `c:${mode.presetStartIso}:${mode.presetIsEvent ? '1' : '0'}`;
    if (lastResetKeyRef.current === key) return;
    lastResetKeyRef.current = key;
    if (mode.kind === 'schedule') {
      setTitle(mode.initialTitle);
      // task 의 실제 startAt 유무로 isEvent 자동 결정 (사용자가 toggle 로 변경 가능).
      const direct = taskStore.findMaster(mode.taskId);
      const series = resolveSeries(mode.taskId);
      const masterTask = series?.kind === 'task' ? series.master : direct;
      const hasTime = Boolean(mode.initialStart ?? masterTask?.startAt);
      setIsEvent(hasTime);
      // 날짜/시간 default — initialStart 가 없고 plannedFor 만 있으면 그 날 09:00.
      const fallbackStart = masterTask?.plannedFor
        ? `${masterTask.plannedFor}T09:00:00`
        : new Date().toISOString();
      const start = mode.initialStart ?? masterTask?.startAt ?? fallbackStart;
      const end = mode.initialEnd ?? masterTask?.endAt ?? addMinutes(start, 60);
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setDuration(minutesBetween(start, end) || 60);
      setPriority(mode.initialPriority ?? masterTask?.priority ?? 0);
      if (series) {
        const { preset, byday: bd, until } = ruleToPreset(series.master.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setRecurrenceUntil(until ? until.slice(0, 10) : '');
        setTaskColor(series.kind === 'task' ? series.master.color : undefined);
      } else {
        const { preset, byday: bd, until } = ruleToPreset(direct?.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setRecurrenceUntil(until ? until.slice(0, 10) : '');
        setTaskColor(direct?.color);
      }
    } else {
      setTitle('');
      setDate(toDateInput(mode.presetStartIso));
      setTime(toTimeInput(mode.presetStartIso));
      setDuration(60);
      setIsEvent(mode.presetIsEvent ?? false);
      setPriority(0);
      setRecurrence('none');
      setByday([]);
      setRecurrenceUntil('');
      setTaskColor(undefined);
    }
  }, [mode, open]);

  if (!mode) return null;

  const series = mode.kind === 'schedule' ? resolveSeries(mode.taskId) : null;
  const isSeriesInstance = Boolean(series);
  // 시간(시작·길이) input 노출은 isEvent 만으로 결정 — 모드 무관.
  // 할 일 = 시간 무관, 일정 = 시간 블록.
  const showsTimeInputs = isEvent;

  const submitWithScope = (scope: 'this' | 'future' | 'all' = 'all') => {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    const untilIso = recurrenceUntil
      ? new Date(`${recurrenceUntil}T23:59:59`).toISOString()
      : undefined;
    const newRecurrence = presetToRule(recurrence, byday, untilIso);

    // ─── 할 일 (isEvent=false) — 시간 input 없음, plannedFor 만. create + schedule 둘 다. ───
    if (!isEvent) {
      if (!date) return;
      const patch: Partial<PlannerTask> = {
        title: trimmed,
        startAt: undefined,
        endAt: undefined,
        plannedFor: date,
        priority: priority === 0 ? undefined : priority,
        color: taskColor,
        recurrence: newRecurrence,
      };
      if (mode.kind === 'schedule') {
        if (series && series.kind === 'task') {
          if (scope === 'this') {
            editThisOnly(taskStore, series.master, series.occurrenceIso, patch);
            notify.success('이 항목만 할 일로 변경됐어요');
          } else if (scope === 'future') {
            editThisAndFuture(taskStore, series.master, series.occurrenceIso, patch);
            notify.success('이 항목과 이후 시리즈가 할 일로 변경됐어요');
          } else {
            editAll(taskStore, series.master, patch);
            notify.success('전체 시리즈가 할 일로 변경됐어요');
          }
        } else {
          taskStore.update(mode.taskId, patch);
          notify.success('할 일로 변경됐어요');
        }
      } else {
        taskStore.add({
          title: trimmed,
          plannedFor: date,
          priority: priority === 0 ? undefined : priority,
          color: taskColor,
          recurrence: newRecurrence,
        });
        notify.success(newRecurrence ? '반복 할 일 추가됐어요' : '할 일 추가됐어요');
      }
      onClose();
      return;
    }

    // ─── 일정 (isEvent=true) — 시간 input 있음 ───
    if (!date || !time) return;
    const startIso = buildIso(date, time);
    const endIso = addMinutes(startIso, duration);

    if (mode.kind === 'schedule') {
      const patch: Partial<PlannerTask> = {
        title: trimmed,
        startAt: startIso,
        endAt: endIso,
        plannedFor: undefined,
        priority: priority === 0 ? undefined : priority,
        color: taskColor,
        recurrence: newRecurrence,
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
        taskStore.update(mode.taskId, patch);
        notify.success(newRecurrence ? '시리즈 갱신됐어요' : '시간 배정됐어요');
      }
    } else {
      // create + 일정 — eventStore 가 아니라 taskStore 에 시간 잡힌 task 로 추가.
      // (eventStore 와 분리 — 모든 새 항목은 task. event 는 외부 통합용.)
      taskStore.add({
        title: trimmed,
        startAt: startIso,
        endAt: endIso,
        priority: priority === 0 ? undefined : priority,
        color: taskColor,
        recurrence: newRecurrence,
      });
      notify.success(newRecurrence ? '반복 일정 추가됐어요' : '일정 추가됐어요');
    }
    onClose();
  };

  const handleSubmit = () => submitWithScope(isSeriesInstance ? 'this' : 'all');

  const handleDelete = (scope: 'this' | 'all' = 'all') => {
    if (mode.kind !== 'schedule') return;

    if (series && series.kind === 'task' && scope === 'this') {
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

    const target = series ? series.master : taskStore.findMaster(mode.taskId);
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'priority' | 'pinned' | 'recurrence'> = {
      title: title.trim() || mode.initialTitle,
      done: false,
      startAt: target?.startAt ?? mode.initialStart,
      endAt: target?.endAt ?? mode.initialEnd,
      priority: priority === 0 ? undefined : priority,
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

  const handleKeyDownGlobal = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // chip base style — 라이트 outline.
  const chip = (active: boolean) =>
    cn(
      'px-3.5 py-2 text-[13px] rounded-md transition-colors border',
      active
        ? 'bg-foreground text-background border-foreground font-semibold'
        : 'bg-card border-foreground/25 text-foreground/80 hover:border-foreground/35 hover:text-foreground',
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDownGlobal}
        hideClose
      >
        <DialogHeader>
          {/* visible 헤더 라벨은 제거 — 종류 toggle 자체가 식별자 역할.
              radix a11y 위해 DialogTitle sr-only 로만 유지. */}
          <DialogTitle className="sr-only">
            {mode.kind === 'schedule'
              ? `${isEvent ? '일정' : '할 일'} 편집`
              : `새 ${isEvent ? '일정' : '할 일'}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEvent
              ? '일정의 시간·색·반복을 편집합니다.'
              : '할 일의 우선순위·색·반복을 편집합니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mt-2">
          {/* 종류 toggle — 맨 위. 탭 underline 스타일 (슬림). 데이뷰 레이아웃과 동일하게 일정 → 할 일 순서. */}
          <div className="sm:col-span-2 -mt-1 grid grid-cols-2 border-b border-foreground/10">
            <button
              type="button"
              onClick={() => setIsEvent(true)}
              aria-pressed={isEvent}
              className={cn(
                'relative inline-flex items-center justify-center gap-1.5 h-9 text-[13.5px] transition-colors',
                isEvent ? 'text-foreground font-semibold' : 'text-foreground/55 hover:text-foreground/85',
              )}
            >
              <span>일정</span>
              <span
                aria-hidden
                className={cn(
                  'absolute -bottom-px left-3 right-3 h-[2px] rounded-full transition-opacity',
                  isEvent ? 'bg-foreground opacity-100' : 'opacity-0',
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => setIsEvent(false)}
              aria-pressed={!isEvent}
              className={cn(
                'relative inline-flex items-center justify-center gap-1.5 h-9 text-[13.5px] transition-colors',
                !isEvent ? 'text-foreground font-semibold' : 'text-foreground/55 hover:text-foreground/85',
              )}
            >
              <span>할 일</span>
              <span
                aria-hidden
                className={cn(
                  'absolute -bottom-px left-3 right-3 h-[2px] rounded-full transition-opacity',
                  !isEvent ? 'bg-foreground opacity-100' : 'opacity-0',
                )}
              />
            </button>
          </div>

          {/* 제목 — toggle 아래 */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <LabelText>제목</LabelText>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              autoFocus={mode.kind === 'create'}
              placeholder={isEvent ? '일정 제목' : '할 일 제목'}
              className="w-full px-3 py-2 text-[14px] rounded-md border border-foreground/10 bg-card focus:border-foreground/40 focus:outline-none transition-colors text-foreground"
            />
          </div>

          {/* 날짜 — 항상 노출. 할 일은 이 날짜에 plannedFor 마킹. 일정은 startAt 의 날짜. */}
          {/* 시간(시작·길이) — 일정 또는 schedule 모드(시간 변경)에서만. 할 일 create 면 hide. */}
          {showsTimeInputs ? (
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div className="flex flex-col gap-1.5">
                <LabelText>날짜</LabelText>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 text-[14px] rounded-md border border-foreground/25 bg-card focus:border-foreground/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <LabelText>시작</LabelText>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  step={60}
                  className="px-3 py-2 text-[14px] rounded-md border border-foreground/25 bg-card focus:border-foreground/40 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <LabelText>날짜</LabelText>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-2 text-[13px] rounded-md border border-foreground/10 bg-card focus:border-foreground/40 focus:outline-none"
              />
            </div>
          )}

          {/* 길이 — 시간 input 노출될 때만. */}
          {showsTimeInputs && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <LabelText>길이</LabelText>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={chip(duration === d)}
                  >
                    {d < 60 ? `${d}분` : `${Math.floor(d / 60)}시간${d % 60 ? ` ${d % 60}분` : ''}`}
                  </button>
                ))}
              </div>
              <label className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground/55">
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
                  className="h-7 w-20 rounded-md border border-foreground/10 bg-card px-2 text-[12px] tabular-nums text-foreground focus:border-foreground/40 focus:outline-none"
                  aria-label="길이 직접 입력"
                />
                분
              </label>
            </div>
          )}

          {/* 우선순위 — 할 일만, 좌측 col */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5">
              <LabelText>우선순위</LabelText>
              <div className="flex gap-1.5">
                {([0, 1, 2, 3] as Priority[]).map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] rounded-md transition-colors border',
                        active
                          ? 'bg-foreground text-background font-medium border-foreground'
                          : 'bg-card border-foreground/25 hover:border-foreground/35 text-foreground/80',
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

          {/* 색상 — 둘 다. 할 일이면 우선순위 옆 (col-span-1), 일정이면 full row */}
          <div className={cn('flex flex-col gap-1.5', isEvent && 'sm:col-span-2')}>
            <LabelText>색상</LabelText>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTaskColor(undefined)}
                className={chip(!taskColor)}
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
                      'inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] rounded-md transition-colors border',
                      active
                        ? 'bg-accent border-foreground text-foreground font-medium'
                        : 'bg-card border-foreground/25 hover:border-foreground/35 text-foreground/80',
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 반복 — full row */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <LabelText>
              <span className="inline-flex items-center gap-1.5">
                <RotateCw className="h-3 w-3" />
                반복
              </span>
            </LabelText>
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
                  className={chip(recurrence === key)}
                >
                  {label}
                </button>
              ))}
            </div>
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
                        'h-7 w-7 text-[11px] font-medium rounded-md transition-colors border',
                        active
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card border-foreground/10 text-foreground/55 hover:border-foreground/30 hover:text-foreground',
                      )}
                      title={`${WEEKDAY_LABELS[wd]}요일`}
                    >
                      {WEEKDAY_LABELS[wd]}
                    </button>
                  );
                })}
              </div>
            )}
            {recurrence !== 'none' && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10.5px] text-foreground/55">~까지</span>
                <input
                  type="date"
                  value={recurrenceUntil}
                  onChange={(e) => setRecurrenceUntil(e.target.value)}
                  className="px-2 py-1 text-[12px] rounded-md border border-foreground/10 bg-card focus:border-foreground/40 focus:outline-none"
                />
                {recurrenceUntil && (
                  <button
                    type="button"
                    onClick={() => setRecurrenceUntil('')}
                    className="text-[10.5px] text-foreground/55 hover:text-foreground"
                  >
                    무한
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row sm:justify-between mt-3 gap-2">
          {mode.kind === 'schedule' ? (
            <div className="flex gap-1.5 items-center">
              {isSeriesInstance ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3.5 py-2 text-[12.5px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
                  className="flex items-center gap-1 px-3.5 py-2 text-[12.5px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
              className="px-3.5 py-2 text-[12.5px] rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
            >
              취소
            </button>
            {isSeriesInstance ? (
              <div className="flex rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => submitWithScope('this')}
                  title="이 항목만 (Ctrl/Cmd + Enter)"
                  className="px-4 py-2 text-[13px] bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
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
                className="px-4 py-2 text-[13px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
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

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
import { Trash2, Flag, FileText, RotateCw, ChevronDown, ListChecks } from 'lucide-react';
import { SubtaskList } from './SubtaskList';
import type { Subtask } from '@/types/planner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { PlannerTask, Priority, RecurrenceRule, WeekdayCode } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS, WEEKDAY_ORDER, WEEKDAY_LABELS } from '@/types/planner';
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
  | { kind: 'create'; presetStartIso: string };

interface TaskScheduleDialogProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

const DURATIONS = [30, 60, 90, 120] as const;

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

const presetToRule = (preset: RecurrencePreset, byday: WeekdayCode[]): RecurrenceRule | undefined => {
  if (preset === 'none') return undefined;
  if (preset === 'weekly') {
    return { freq: 'weekly', interval: 1, byday: byday.length > 0 ? byday : undefined };
  }
  return { freq: preset, interval: 1 };
};

const ruleToPreset = (rec: RecurrenceRule | undefined): { preset: RecurrencePreset; byday: WeekdayCode[] } => {
  if (!rec) return { preset: 'none', byday: [] };
  return {
    preset: rec.freq as RecurrencePreset,
    byday: rec.byday ?? [],
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
  /** 서브태스크 — schedule 모드에서 master 의 subtasks 를 직접 편집 (자동 저장).
   * create 모드에선 생성 시 함께 저장. */
  const [subtasksDraft, setSubtasksDraft] = useState<Subtask[]>([]);

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
        const { preset, byday: bd } = ruleToPreset(series.master.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setSubtasksDraft(series.kind === 'task' ? (series.master.subtasks ?? []) : []);
      } else {
        // 비-인스턴스 — task store 에서 직접 마스터 조회 (단발/시리즈 마스터 양쪽).
        const direct = taskStore.findMaster(mode.taskId);
        const { preset, byday: bd } = ruleToPreset(direct?.recurrence);
        setRecurrence(preset);
        setByday(bd);
        setSubtasksDraft(direct?.subtasks ?? []);
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
      setSubtasksDraft([]);
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
    const newRecurrence = presetToRule(recurrence, byday);

    if (mode.kind === 'schedule') {
      const patch: Partial<PlannerTask> = {
        title: trimmed,
        startAt: startIso,
        endAt: endIso,
        priority: priority === 0 ? undefined : priority,
        note: noteTrim.length > 0 ? noteTrim : undefined,
        recurrence: newRecurrence,
        subtasks: subtasksDraft.length > 0 ? subtasksDraft : undefined,
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
        });
        notify.success(newRecurrence ? '반복 일정 추가됐어요' : '일정 추가됐어요');
      } else {
        taskStore.add({
          title: trimmed,
          startAt: startIso,
          endAt: endIso,
          priority: priority === 0 ? undefined : priority,
          note: noteTrim.length > 0 ? noteTrim : undefined,
          recurrence: newRecurrence,
          subtasks: subtasksDraft.length > 0 ? subtasksDraft : undefined,
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
      notify.info('인박스로 옮겼어요', { duration: 1500 });
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
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'goalId' | 'priority' | 'note' | 'pinned' | 'recurrence'> = {
      title: title.trim() || mode.initialTitle,
      done: false,
      startAt: target?.startAt ?? mode.initialStart,
      endAt: target?.endAt ?? mode.initialEnd,
      priority: priority === 0 ? undefined : priority,
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
      <DialogContent className="max-w-md" onKeyDown={handleKeyDownGlobal}>
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">
            {mode.kind === 'schedule' ? '시간 배정' : '새 항목'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* 제목 — schedule/create 모두 편집 가능 */}
          <div className="flex flex-col gap-1">
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

          {/* 종류 (create 모드만) */}
          {mode.kind === 'create' && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsEvent(false)}
                className={cn(
                  'px-3 py-1.5 text-[12px] rounded-md transition-colors',
                  !isEvent
                    ? 'bg-foreground text-background'
                    : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                )}
              >
                할 일
              </button>
              <button
                type="button"
                onClick={() => setIsEvent(true)}
                className={cn(
                  'px-3 py-1.5 text-[12px] rounded-md transition-colors',
                  isEvent
                    ? 'bg-foreground text-background'
                    : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                )}
              >
                일정
              </button>
            </div>
          )}

          {/* 날짜 + 시간 */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* 길이 chip */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              길이
            </label>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-[12px] tabular-nums rounded-md transition-colors',
                    duration === d
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-[hsl(var(--hairline))] hover:bg-accent',
                  )}
                >
                  {d < 60 ? `${d}분` : `${Math.floor(d / 60)}시간${d % 60 ? ` ${d % 60}분` : ''}`}
                </button>
              ))}
            </div>
          </div>

          {/* 우선순위 chip — 할 일 모드에서만 (일정은 priority 없음) */}
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

          {/* 반복 — Apple Cal/Google Cal 패턴. 단발 → 시리즈 / 시리즈 → 단발 모두 가능. */}
          <div className="flex flex-col gap-1.5">
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
          </div>

          {/* 서브태스크 (체크리스트) — 할 일 모드만 */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5">
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

          {/* 노트 (collapsible) — 할 일 모드만 */}
          {!isEvent && (
            <div className="flex flex-col gap-1.5">
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
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleUnschedule}
                className="px-3 py-1.5 text-[12px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                인박스로
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

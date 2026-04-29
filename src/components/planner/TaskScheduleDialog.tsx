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
import { Trash2, Flag, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { PlannerTask, Priority } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/planner';

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

export const TaskScheduleDialog = ({ open, mode, onClose }: TaskScheduleDialogProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [isEvent, setIsEvent] = useState(false);
  const [priority, setPriority] = useState<Priority>(0);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

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
    } else {
      setTitle('');
      setDate(toDateInput(mode.presetStartIso));
      setTime(toTimeInput(mode.presetStartIso));
      setDuration(60);
      setIsEvent(false);
      setPriority(0);
      setNote('');
      setNoteOpen(false);
    }
  }, [mode, open]);

  if (!mode) return null;

  const handleSubmit = () => {
    if (!date || !time) return;
    const startIso = buildIso(date, time);
    const endIso = addMinutes(startIso, duration);
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    const noteTrim = note.trim();

    if (mode.kind === 'schedule') {
      taskStore.update(mode.taskId, {
        title: trimmed,
        startAt: startIso,
        endAt: endIso,
        priority: priority === 0 ? undefined : priority,
        note: noteTrim.length > 0 ? noteTrim : undefined,
      });
      notify.success('시간 배정됐어요');
    } else {
      if (isEvent) {
        eventStore.add({ title: trimmed, startAt: startIso, endAt: endIso, source: 'user' });
        notify.success('일정 추가됐어요');
      } else {
        taskStore.add({
          title: trimmed,
          startAt: startIso,
          endAt: endIso,
          priority: priority === 0 ? undefined : priority,
          note: noteTrim.length > 0 ? noteTrim : undefined,
        });
        notify.success('할 일 추가됐어요');
      }
    }
    onClose();
  };

  const handleUnschedule = () => {
    if (mode.kind === 'schedule') {
      taskStore.unschedule(mode.taskId);
      notify.info('인박스로 옮겼어요', { duration: 1500 });
      onClose();
    }
  };

  const handleDelete = () => {
    if (mode.kind === 'schedule') {
      // 복원용 스냅샷 — 모달 안 편집된 값(priority/note) 까지 복원.
      const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'goalId' | 'priority' | 'note' | 'pinned'> = {
        title: title.trim() || mode.initialTitle,
        done: false,
        startAt: mode.initialStart,
        endAt: mode.initialEnd,
        priority: priority === 0 ? undefined : priority,
        note: note.trim().length > 0 ? note.trim() : undefined,
        pinned: mode.initialPinned,
      };
      taskStore.remove(mode.taskId);
      notify.success('삭제됐어요', {
        duration: 5000,
        action: {
          label: '되돌리기',
          onClick: () => taskStore.add(snapshot),
        },
      });
      onClose();
    }
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
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                삭제
              </button>
            </div>
          ) : <div />}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              title="Ctrl/Cmd + Enter"
              className="px-4 py-1.5 text-[12px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              {mode.kind === 'schedule' ? '배정' : '추가'}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 신규/편집 습관 모달.
 *
 * Slim segmented toggle (하기/끊기) + 제목/이모지/색 + 반복 + 옵션.
 * mode: 'create' | 'edit' (편집 시 prefil + 삭제 버튼).
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { confirmDialog } from '@/lib/confirmDialog';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import {
  TASK_LIST_COLORS, type TaskListColor, type WeekdayCode, WEEKDAY_LABELS,
} from '@/types/planner';
import type { Habit, HabitFreq, HabitGoalKind } from '@/types/habit';
import { toDateKey } from '@/lib/planner/habitStats';

type Mode =
  | { kind: 'create' }
  | { kind: 'edit'; habit: Habit };

interface NewHabitDialogProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

const WEEKDAYS: WeekdayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const FREQ_OPTIONS: Array<{ id: HabitFreq; label: string }> = [
  { id: 'daily', label: '매일' },
  { id: 'weekly', label: '매주' },
  { id: 'monthly', label: '매달' },
];
const COLOR_OPTIONS: TaskListColor[] = ['blue', 'green', 'amber', 'rose', 'violet', 'teal', 'orange', 'cyan'];
const EMOJI_PRESETS = ['💪', '💧', '📚', '🧘', '✍️', '🥗', '🏃', '😴', '🪥', '☀️', '📖', '🎯'];

const STARTER_PACKS: Array<{ title: string; emoji: string; color: TaskListColor; freq: HabitFreq }> = [
  { title: '운동', emoji: '💪', color: 'rose', freq: 'daily' },
  { title: '물 마시기', emoji: '💧', color: 'blue', freq: 'daily' },
  { title: '독서 30분', emoji: '📚', color: 'amber', freq: 'daily' },
  { title: '명상 10분', emoji: '🧘', color: 'violet', freq: 'daily' },
  { title: '일기 쓰기', emoji: '✍️', color: 'green', freq: 'daily' },
  { title: '식단 관리', emoji: '🥗', color: 'teal', freq: 'daily' },
];

export const NewHabitDialog = ({ open, mode, onClose }: NewHabitDialogProps) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [color, setColor] = useState<TaskListColor>('blue');
  const [goalKind, setGoalKind] = useState<HabitGoalKind>('do');
  const [freq, setFreq] = useState<HabitFreq>('daily');
  const [weekdays, setWeekdays] = useState<WeekdayCode[]>([]);
  const [timesEnabled, setTimesEnabled] = useState(false);
  const [timesPerDay, setTimesPerDay] = useState<number>(2);
  const [unit, setUnit] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [notes, setNotes] = useState('');

  // mode 바뀔 때 prefill.
  useEffect(() => {
    if (!open || !mode) return;
    if (mode.kind === 'create') {
      setTitle('');
      setEmoji('💪');
      setColor('blue');
      setGoalKind('do');
      setFreq('daily');
      setWeekdays([]);
      setTimesEnabled(false);
      setTimesPerDay(2);
      setUnit('');
      setReminderEnabled(false);
      setReminderTime('07:00');
      setNotes('');
    } else {
      const h = mode.habit;
      setTitle(h.title);
      setEmoji(h.emoji);
      setColor(h.color);
      setGoalKind(h.goalKind);
      setFreq(h.schedule.freq === 'custom' ? 'daily' : h.schedule.freq);
      setWeekdays(h.schedule.weekdays ?? []);
      setTimesEnabled(!!h.schedule.timesPerDay && h.schedule.timesPerDay > 1);
      setTimesPerDay(h.schedule.timesPerDay ?? 2);
      setUnit(h.unit ?? '');
      setReminderEnabled((h.reminders?.length ?? 0) > 0);
      setReminderTime(h.reminders?.[0] ?? '07:00');
      setNotes(h.notes ?? '');
    }
  }, [open, mode]);

  const submitFromPack = (pack: typeof STARTER_PACKS[number]) => {
    habitStore.add({
      title: pack.title,
      emoji: pack.emoji,
      color: pack.color,
      schedule: { freq: pack.freq },
      startDate: toDateKey(new Date()),
    });
    notify.success(`"${pack.title}" 습관 추가됨`, { duration: 1500 });
    onClose();
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const schedule: Habit['schedule'] = {
      freq,
      weekdays: freq === 'weekly' && weekdays.length > 0 ? weekdays : undefined,
      timesPerDay: timesEnabled && timesPerDay > 1 ? timesPerDay : undefined,
    };
    const reminders = reminderEnabled ? [reminderTime] : undefined;

    if (mode?.kind === 'edit') {
      habitStore.update(mode.habit.id, {
        title: trimmed,
        emoji,
        color,
        goalKind,
        schedule,
        unit: unit.trim() || undefined,
        reminders,
        notes: notes.trim() || undefined,
      });
      notify.success('습관 저장됨', { duration: 1200 });
    } else {
      habitStore.add({
        title: trimmed,
        emoji,
        color,
        goalKind,
        schedule,
        unit: unit.trim() || undefined,
        reminders,
        notes: notes.trim() || undefined,
        startDate: toDateKey(new Date()),
      });
      notify.success('습관 추가됨', { duration: 1200 });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (mode?.kind !== 'edit') return;
    const ok = await confirmDialog({
      title: '습관 삭제',
      description: `"${mode.habit.title}" 의 모든 체크인까지 영구 삭제됩니다. 보관함에 두려면 ⋯ 메뉴의 "보관"을 사용하세요.`,
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    habitCheckinStore.removeAllForHabit(mode.habit.id);
    habitStore.remove(mode.habit.id);
    notify.info('습관 삭제됨', { duration: 1200 });
    onClose();
  };

  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" hideClose>
        <DialogTitle className="sr-only">
          {mode.kind === 'edit' ? '습관 편집' : '새 습관'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          습관의 제목·반복 주기·색상·리마인더를 설정합니다.
        </DialogDescription>

        <div className="grid grid-cols-1 gap-y-4 mt-1">
          {/* 종류 toggle */}
          <div className="grid grid-cols-2 border-b border-foreground/10">
            <button
              type="button"
              onClick={() => setGoalKind('do')}
              aria-pressed={goalKind === 'do'}
              className={cn(
                'relative inline-flex items-center justify-center gap-1.5 h-9 text-[13.5px] transition-colors',
                goalKind === 'do' ? 'text-foreground font-semibold' : 'text-foreground/55 hover:text-foreground/85',
              )}
            >
              <span>하기 (build)</span>
              <span aria-hidden className={cn(
                'absolute -bottom-px left-3 right-3 h-[2px] rounded-full transition-opacity',
                goalKind === 'do' ? 'bg-foreground opacity-100' : 'opacity-0',
              )} />
            </button>
            <button
              type="button"
              onClick={() => setGoalKind('avoid')}
              aria-pressed={goalKind === 'avoid'}
              className={cn(
                'relative inline-flex items-center justify-center gap-1.5 h-9 text-[13.5px] transition-colors',
                goalKind === 'avoid' ? 'text-foreground font-semibold' : 'text-foreground/55 hover:text-foreground/85',
              )}
            >
              <span>끊기 (quit)</span>
              <span aria-hidden className={cn(
                'absolute -bottom-px left-3 right-3 h-[2px] rounded-full transition-opacity',
                goalKind === 'avoid' ? 'bg-foreground opacity-100' : 'opacity-0',
              )} />
            </button>
          </div>

          {/* 제목 + emoji + color */}
          <div className="flex gap-2">
            {/* emoji popover (간단 grid) */}
            <details className="relative">
              <summary className="list-none h-10 w-10 inline-flex items-center justify-center rounded-md border border-foreground/25 bg-card cursor-pointer text-[18px] hover:border-foreground/35">
                {emoji}
              </summary>
              <div className="absolute z-50 mt-1 p-2 grid grid-cols-6 gap-1 rounded-md border border-foreground/25 bg-card shadow-lg">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setEmoji(e); (document.activeElement as HTMLElement)?.blur?.(); }}
                    className={cn(
                      'h-8 w-8 inline-flex items-center justify-center rounded text-[16px] hover:bg-accent',
                      e === emoji && 'bg-accent ring-1 ring-foreground/30',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </details>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={mode.kind === 'create'}
              placeholder="습관 제목"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="flex-1 px-3 py-2 text-[14px] rounded-md border border-foreground/25 bg-card focus:border-foreground/40 focus:outline-none"
            />
          </div>

          {/* 색상 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-foreground/80 leading-none">색상</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => {
                const stripe = TASK_LIST_COLORS[c].stripe;
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={cn(
                      'h-7 w-7 inline-flex items-center justify-center rounded-full border transition-all',
                      active ? 'border-foreground ring-2 ring-foreground/15' : 'border-foreground/25 hover:border-foreground/35',
                    )}
                    style={{ backgroundColor: stripe }}
                  />
                );
              })}
            </div>
          </div>

          {/* 반복 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-foreground/80 leading-none">반복</label>
            <div className="flex flex-wrap gap-1.5">
              {FREQ_OPTIONS.map((f) => {
                const active = freq === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFreq(f.id)}
                    className={cn(
                      'px-3.5 py-2 text-[13px] rounded-md transition-colors border',
                      active
                        ? 'bg-foreground text-background border-foreground font-semibold'
                        : 'bg-card border-foreground/25 text-foreground/80 hover:border-foreground/35 hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {freq === 'weekly' && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => {
                  const active = weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setWeekdays((cur) =>
                          cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d],
                        )
                      }
                      className={cn(
                        'h-8 w-8 text-[12.5px] font-medium rounded-md transition-colors border',
                        active
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card border-foreground/25 hover:border-foreground/35 text-foreground/80',
                      )}
                    >
                      {WEEKDAY_LABELS[d]}
                    </button>
                  );
                })}
                <span className="self-center text-[11px] text-foreground/55 ml-1">
                  미선택 시 모든 요일
                </span>
              </div>
            )}
          </div>

          {/* 하루 N번 + 단위 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-foreground/80">
              <input
                type="checkbox"
                checked={timesEnabled}
                onChange={(e) => setTimesEnabled(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              하루 N번 반복
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={99}
                value={timesPerDay}
                onChange={(e) => setTimesPerDay(Math.max(2, Number(e.target.value) || 2))}
                disabled={!timesEnabled}
                className="h-8 w-16 rounded-md border border-foreground/25 bg-card px-2 text-[12.5px] tabular-nums disabled:opacity-50"
              />
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="단위 (잔/분/회)"
                className="flex-1 h-8 rounded-md border border-foreground/25 bg-card px-2 text-[12.5px]"
              />
            </div>
          </div>

          {/* 리마인더 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-foreground/80">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              리마인더
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminderEnabled}
              className="h-8 rounded-md border border-foreground/25 bg-card px-2 text-[12.5px] disabled:opacity-50"
            />
          </div>

          {/* 메모 */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="메모 (선택) — 왜 이 습관을 만드는지"
            rows={2}
            className="w-full px-3 py-2 text-[13px] rounded-md border border-foreground/25 bg-card focus:border-foreground/40 focus:outline-none resize-none placeholder:text-foreground/45"
          />

          {/* 스타터 팩 — create 모드 + 제목 비어있을 때만 */}
          {mode.kind === 'create' && !title.trim() && (
            <div className="pt-1">
              <div className="text-[11px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-1.5">
                또는 한 번에 시작
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PACKS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => submitFromPack(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border border-foreground/25 bg-card hover:border-foreground/35 hover:bg-accent transition-all"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* footer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-foreground/20">
            <div>
              {mode.kind === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5 inline-block mr-1" />
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!title.trim()}
                className="px-4 py-2 text-[13px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 inline-block mr-1" />
                {mode.kind === 'edit' ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 신규/편집 습관 모달.
 *
 * Slim segmented toggle (하기/끊기) + 제목/이모지/색 + 반복 + 옵션.
 * mode: 'create' | 'edit' (편집 시 prefil + 삭제 버튼).
 */
import { useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
type HabitPanel = HabitGoalKind | 'examples';
type HabitExample = {
  title: string;
  emoji: string;
  color: TaskListColor;
  goalKind: HabitGoalKind;
  freq: HabitFreq;
  weekdays?: WeekdayCode[];
  timesPerDay?: number;
  unit?: string;
  reminderTime?: string;
  notes: string;
  caption: string;
  cadence: string;
};

const HABIT_EXAMPLES: HabitExample[] = [
  {
    title: '아침 물 2잔',
    emoji: '💧',
    color: 'cyan',
    goalKind: 'do',
    freq: 'daily',
    timesPerDay: 2,
    unit: '잔',
    reminderTime: '08:30',
    caption: '기상 후 몸 깨우기',
    cadence: '매일 · 2잔',
    notes: '아침 커피 전에 물부터 마신다. 침대 옆이나 책상 위에 컵을 미리 둔다.',
  },
  {
    title: '독서 20분',
    emoji: '📚',
    color: 'amber',
    goalKind: 'do',
    freq: 'daily',
    reminderTime: '22:00',
    caption: '끝내기보다 펼치기',
    cadence: '매일 · 밤',
    notes: '읽은 분량보다 다시 떠오른 문장 하나를 남긴다.',
  },
  {
    title: '가벼운 러닝',
    emoji: '🏃',
    color: 'green',
    goalKind: 'do',
    freq: 'weekly',
    weekdays: ['MO', 'WE', 'SA'],
    caption: '무리하지 않는 주 3회',
    cadence: '월·수·토',
    notes: '속도보다 나간 횟수를 본다. 20분만 뛰어도 성공으로 친다.',
  },
  {
    title: '하루 마감 정리',
    emoji: '🧹',
    color: 'blue',
    goalKind: 'do',
    freq: 'daily',
    reminderTime: '21:30',
    caption: '내일 아침을 가볍게',
    cadence: '매일 · 10분',
    notes: '책상, 열린 탭, 내일 첫 할 일 하나만 정리한다.',
  },
  {
    title: '잠들기 전 숏폼 끊기',
    emoji: '📵',
    color: 'violet',
    goalKind: 'avoid',
    freq: 'daily',
    reminderTime: '23:00',
    caption: '수면 직전 자극 줄이기',
    cadence: '매일 · 밤',
    notes: '침대에 누운 뒤에는 짧은 영상 앱을 열지 않는다. 보고 싶으면 내일 볼 목록에만 적는다.',
  },
  {
    title: '늦은 카페인 끊기',
    emoji: '☕',
    color: 'orange',
    goalKind: 'avoid',
    freq: 'daily',
    reminderTime: '14:30',
    caption: '오후 집중과 수면 균형',
    cadence: '매일 · 오후',
    notes: '오후 3시 이후 커피 대신 물이나 무카페인 차로 바꾼다.',
  },
  {
    title: '충동구매 하루 보류',
    emoji: '💸',
    color: 'teal',
    goalKind: 'avoid',
    freq: 'daily',
    caption: '사는 대신 하루 적어두기',
    cadence: '매일 · 필요할 때',
    notes: '바로 결제하지 않고 위시리스트에 적은 뒤 다음 날 다시 본다.',
  },
  {
    title: '평일 음주 줄이기',
    emoji: '🍺',
    color: 'rose',
    goalKind: 'avoid',
    freq: 'weekly',
    weekdays: ['MO', 'TU', 'WE', 'TH'],
    caption: '회복을 남겨두는 습관',
    cadence: '월-목',
    notes: '평일에는 술 약속을 만들지 않는다. 이미 잡힌 약속은 1차에서 끝낸다.',
  },
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
  const [activePanel, setActivePanel] = useState<HabitPanel>('do');

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
      setActivePanel('do');
    } else {
      const h = mode.habit;
      setTitle(h.title);
      setEmoji(h.emoji);
      setColor(h.color);
      setGoalKind(h.goalKind);
      setActivePanel(h.goalKind);
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

  const switchPanel = (panel: HabitPanel) => {
    setActivePanel(panel);
    if (panel === 'do' || panel === 'avoid') setGoalKind(panel);
  };

  const applyExample = (example: HabitExample) => {
    setTitle(example.title);
    setEmoji(example.emoji);
    setColor(example.color);
    setGoalKind(example.goalKind);
    setActivePanel(example.goalKind);
    setFreq(example.freq);
    setWeekdays(example.weekdays ?? []);
    setTimesEnabled((example.timesPerDay ?? 1) > 1);
    setTimesPerDay(example.timesPerDay ?? 2);
    setUnit(example.unit ?? '');
    setReminderEnabled(Boolean(example.reminderTime));
    setReminderTime(example.reminderTime ?? '07:00');
    setNotes(example.notes);
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
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto p-0" hideClose>
        <DialogTitle className="sr-only">
          {mode.kind === 'edit' ? '습관 편집' : '새 습관'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          습관의 제목·반복 주기·색상·리마인더를 설정합니다.
        </DialogDescription>

        <div className="px-7 pb-6 pt-5">
          {/* 종류 toggle */}
          <div className="grid grid-cols-3 rounded-full border-[1.5px] border-foreground/55 bg-background p-1 shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.05)]">
            {([
              { id: 'do', label: '하기 (build)' },
              { id: 'avoid', label: '끊기 (quit)' },
              { id: 'examples', label: '예시' },
            ] satisfies Array<{ id: HabitPanel; label: string }>).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchPanel(tab.id)}
                aria-pressed={activePanel === tab.id}
                className={cn(
                  'relative inline-flex h-9 items-center justify-center rounded-full text-[13.5px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
                  activePanel === tab.id
                    ? 'bg-[#fffefa] text-foreground shadow-sm ring-1 ring-foreground/35'
                    : 'text-foreground/50 hover:bg-background/55 hover:text-foreground/75',
                )}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activePanel === 'examples' ? (
            <div className="mt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-foreground">예시 습관</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    누르면 제목, 반복, 알림, 메모가 바로 채워집니다.
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-foreground/45">
                  {HABIT_EXAMPLES.length}개
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {HABIT_EXAMPLES.map((example) => {
                  const stripe = TASK_LIST_COLORS[example.color].stripe;
                  return (
                    <button
                      key={example.title}
                      type="button"
                      onClick={() => applyExample(example)}
                      className="group flex min-h-[78px] items-start gap-3 rounded-xl border border-foreground/12 bg-white px-3 py-3 text-left transition-all hover:border-foreground/24 hover:shadow-[0_10px_28px_-22px_hsl(var(--foreground)/0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/18"
                    >
                      <span
                        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px]"
                        style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, white)` }}
                      >
                        {example.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-bold text-foreground">
                            {example.title}
                          </span>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: stripe }}
                            aria-hidden
                          />
                        </span>
                        <span className="mt-1 block text-[12px] leading-snug text-foreground/62">
                          {example.caption}
                        </span>
                        <span className="mt-1.5 inline-flex text-[11px] font-semibold text-muted-foreground">
                          {example.cadence}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
          <>
          <div className="mt-5 grid grid-cols-1 gap-4">
            {/* 제목 + emoji + color */}
            <div className="flex gap-2.5">
            {/* emoji picker — Radix Popover (이전 details 가 좁은 폭으로 옆 row 와 겹치는 문제 해결) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="이모지 선택"
                  className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-foreground/12 bg-card text-[21px] transition-colors hover:border-foreground/30"
                >
                  {emoji}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-auto p-2"
              >
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_PRESETS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        'h-8 w-8 inline-flex items-center justify-center rounded text-[16px] hover:bg-accent transition-colors',
                        e === emoji && 'bg-accent ring-1 ring-foreground/30',
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={mode.kind === 'create'}
              placeholder="습관 제목"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="h-12 flex-1 rounded-xl border border-foreground/12 bg-card px-4 text-[15px] font-medium focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
              {/* 색상 */}
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-bold leading-none text-foreground/80">색상</label>
                <div className="flex flex-wrap gap-2">
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
                          'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
                          active
                            ? 'border-foreground shadow-sm ring-2 ring-foreground/15 ring-offset-2 ring-offset-background'
                            : 'border-foreground/20 hover:scale-105 hover:border-foreground/35',
                        )}
                        style={{ backgroundColor: stripe }}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 반복 */}
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-bold leading-none text-foreground/80">반복</label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-foreground/10 bg-muted/35 p-1">
                  {FREQ_OPTIONS.map((f) => {
                    const active = freq === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFreq(f.id)}
                        className={cn(
                          'h-9 rounded-lg text-[13px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
                          active
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-foreground/60 hover:bg-background/70 hover:text-foreground',
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
          <div className="mt-4 divide-y divide-foreground/10 rounded-xl border border-foreground/10 bg-card/70">
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_320px]">
            <label className="flex items-center gap-2 text-[13px] font-medium text-foreground/78">
              <input
                type="checkbox"
                checked={timesEnabled}
                onChange={(e) => setTimesEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-foreground"
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
                className="h-9 w-20 rounded-lg border border-foreground/15 bg-background px-3 text-[13px] tabular-nums disabled:opacity-45"
              />
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="단위 (잔/분/회)"
                className="h-9 flex-1 rounded-lg border border-foreground/15 bg-background px-3 text-[13px] disabled:opacity-45"
              />
            </div>
          </div>

          {/* 리마인더 */}
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_320px]">
            <label className="flex items-center gap-2 text-[13px] font-medium text-foreground/78">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-foreground"
              />
              리마인더
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminderEnabled}
              className="h-9 rounded-lg border border-foreground/15 bg-background px-3 text-[13px] disabled:opacity-45"
            />
            </div>
          </div>

          {/* 메모 */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="메모 (선택) — 왜 이 습관을 만드는지"
            rows={2}
            className="mt-3 min-h-[72px] w-full resize-none rounded-xl border border-foreground/15 bg-card px-4 py-3 text-[13px] focus:border-foreground/35 focus:outline-none placeholder:text-foreground/45"
          />
          </>
          )}

          {/* footer */}
          <div className="mt-5 flex items-center justify-between border-t border-foreground/12 pt-4">
            <div>
              {activePanel === 'examples' ? (
                <span className="text-[12px] text-muted-foreground">
                  예시를 선택하면 내용을 고칠 수 있어요.
                </span>
              ) : mode.kind === 'edit' && (
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
              {activePanel !== 'examples' && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!title.trim()}
                  className="px-4 py-2 text-[13px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5 inline-block mr-1" />
                  {mode.kind === 'edit' ? '저장' : '추가'}
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

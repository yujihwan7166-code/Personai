/**
 * Calendar — 외곽 그리드 / 컬러 strip / 모노크롬
 * 시스템 emoji X · 일정은 짧은 컬러 strip + 텍스트.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addEvent, updateEvent, removeEvent,
  buildCalendarForDay,
  todayKey, formatKst,
  type CalendarRow, type ManualEvent, type DayKey,
} from '@/lib/planner';
import { useTasks, useHabits, useEvents } from '@/lib/planner';

const KST_OFFSET = 9 * 3600 * 1000;

function dayKeyToDate(d: DayKey): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function startOfMonth(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
}
function shiftMonth(d: Date, delta: number): Date {
  const kst = new Date(d.getTime() + KST_OFFSET);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + delta, kst.getUTCDate()));
}
function shiftWeek(d: Date, delta: number): Date {
  return new Date(d.getTime() + delta * 7 * 24 * 3600 * 1000);
}
function isSameMonth(a: Date, b: Date): boolean {
  const ak = new Date(a.getTime() + KST_OFFSET);
  const bk = new Date(b.getTime() + KST_OFFSET);
  return ak.getUTCFullYear() === bk.getUTCFullYear() && ak.getUTCMonth() === bk.getUTCMonth();
}
function monthGridDays(focused: Date): DayKey[] {
  const first = startOfMonth(focused);
  const firstWeekday = first.getUTCDay();
  const start = new Date(first.getTime() - firstWeekday * 24 * 3600 * 1000);
  const out: DayKey[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
function weekDays(focused: Date): DayKey[] {
  const kst = new Date(focused.getTime() + KST_OFFSET);
  const wd = kst.getUTCDay();
  const sunday = new Date(kst.getTime() - wd * 24 * 3600 * 1000);
  const out: DayKey[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getTime() + i * 24 * 3600 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const Calendar = () => {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  useTasks(); useHabits(); useEvents();

  const today = todayKey();
  const focusedKst = new Date(focused.getTime() + KST_OFFSET);
  const yearLabel = focusedKst.getUTCFullYear();
  const monthLabel = focusedKst.getUTCMonth() + 1;

  const days = view === 'month' ? monthGridDays(focused) : weekDays(focused);

  return (
    <div className="min-h-screen bg-pln-base">
      <header className="border-b border-pln-line bg-pln-base">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-plnk-muted hover:text-plnk-DEFAULT" aria-label="뒤로">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted">캘린더</span>
          <div className="flex-1" />
          <div className="flex gap-px bg-pln-line border border-pln-line">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1 text-[11px] font-medium transition-colors',
                  view === v ? 'bg-plnk-DEFAULT text-pln-card' : 'bg-pln-card text-plnk-muted hover:text-plnk-DEFAULT',
                )}
              >
                {v === 'month' ? '월' : '주'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10">
        {/* 거대한 월/년 표기 */}
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[64px] sm:text-[88px] font-semibold text-plnk-DEFAULT leading-none tabular-nums tracking-[-0.04em]">
              {String(monthLabel).padStart(2, '0')}
            </span>
            <span className="font-display text-[20px] text-plnk-muted tabular-nums">{yearLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFocused(view === 'month' ? shiftMonth(focused, -1) : shiftWeek(focused, -1))}
              className="text-plnk-muted hover:text-plnk-DEFAULT" aria-label="이전"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setFocused(new Date())}
              className="text-[11.5px] text-plnk-muted hover:text-plnk-DEFAULT border-b border-plnk-muted hover:border-plnk-DEFAULT pb-0.5"
            >
              오늘
            </button>
            <button
              onClick={() => setFocused(view === 'month' ? shiftMonth(focused, 1) : shiftWeek(focused, 1))}
              className="text-plnk-muted hover:text-plnk-DEFAULT" aria-label="다음"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {view === 'month' ? (
          <MonthGrid days={days} focused={focused} today={today} onSelectDay={setSelectedDay} />
        ) : (
          <WeekGrid days={days} today={today} onSelectDay={setSelectedDay} />
        )}
      </main>

      {selectedDay && <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
};

export default Calendar;

// ──────────────────────────────────────────
function MonthGrid({
  days, focused, today, onSelectDay,
}: { days: DayKey[]; focused: Date; today: DayKey; onSelectDay: (d: DayKey) => void }) {
  return (
    <div className="border border-pln-rule">
      <div className="grid grid-cols-7 border-b border-pln-rule">
        {WEEK.map((l, i) => (
          <div
            key={i}
            className={cn(
              'py-2 text-center text-[10px] font-mono uppercase tracking-[0.2em] border-r border-pln-line last:border-r-0',
              i === 0 ? 'text-plac-warn' : i === 6 ? 'text-plnk-DEFAULT' : 'text-plnk-muted',
            )}
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => (
          <DayCell
            key={d + '-' + i}
            day={d}
            isToday={d === today}
            inCurrentMonth={isSameMonth(dayKeyToDate(d), focused)}
            weekday={i % 7}
            isLastInRow={i % 7 === 6}
            isLastRow={i >= 35}
            onClick={() => onSelectDay(d)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day, isToday, inCurrentMonth, weekday, isLastInRow, isLastRow, onClick,
}: {
  day: DayKey;
  isToday: boolean;
  inCurrentMonth: boolean;
  weekday: number;
  isLastInRow: boolean;
  isLastRow: boolean;
  onClick: () => void;
}) {
  const rows = useMemo(() => buildCalendarForDay(day), [day]);
  const dayNum = parseInt(day.slice(8, 10), 10);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative min-h-[110px] p-2 text-left transition-colors hover:bg-pln-card',
        !isLastInRow && 'border-r border-pln-line',
        !isLastRow && 'border-b border-pln-line',
        !inCurrentMonth && 'bg-pln-base',
      )}
    >
      <div className={cn(
        'text-[12px] font-mono tabular-nums mb-2 inline-flex items-center justify-center',
        isToday && 'w-6 h-6 bg-plnk-DEFAULT text-pln-card font-bold',
        !isToday && inCurrentMonth && (
          weekday === 0 ? 'text-plac-warn' :
          weekday === 6 ? 'text-plnk-DEFAULT' :
          'text-plnk-DEFAULT'
        ),
        !isToday && !inCurrentMonth && 'text-plnk-faint',
      )}>
        {dayNum}
      </div>
      <div className="space-y-1">
        {rows.slice(0, 3).map((r, i) => <CellStrip key={i} row={r} />)}
        {rows.length > 3 && (
          <div className="text-[9.5px] font-mono text-plnk-muted">+{rows.length - 3}</div>
        )}
      </div>
    </button>
  );
}

function CellStrip({ row }: { row: CalendarRow }) {
  if (row.kind === 'virtual_task') {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn('block w-1 h-3 shrink-0', row.isDue ? 'bg-plac-warn' : 'bg-plnk-DEFAULT')} />
        <span className={cn('text-[10.5px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.title}
        </span>
      </div>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block w-1 h-3 shrink-0 bg-plac-DEFAULT" />
        <span className={cn('text-[10.5px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.emoji && <span className="mr-0.5">{row.emoji}</span>}{row.title}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="block w-1 h-3 shrink-0" style={{ backgroundColor: row.color || '#1F3A8A' }} />
      <span className="text-[10.5px] truncate text-plnk-dim">{row.title}</span>
    </div>
  );
}

// ──────────────────────────────────────────
function WeekGrid({ days, today, onSelectDay }: { days: DayKey[]; today: DayKey; onSelectDay: (d: DayKey) => void }) {
  return (
    <div className="grid grid-cols-7 gap-px bg-pln-rule border border-pln-rule">
      {days.map((d, i) => (
        <WeekColumn key={d} day={d} weekday={i} isToday={d === today} onClick={() => onSelectDay(d)} />
      ))}
    </div>
  );
}

function WeekColumn({ day, weekday, isToday, onClick }: { day: DayKey; weekday: number; isToday: boolean; onClick: () => void }) {
  const rows = useMemo(() => buildCalendarForDay(day), [day]);
  const dayNum = parseInt(day.slice(8, 10), 10);

  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[320px] bg-pln-card p-3 text-left transition-colors hover:bg-pln-base/40',
        isToday && 'bg-pln-base',
      )}
    >
      <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-pln-line">
        <span className={cn(
          'text-[10px] font-mono uppercase tracking-[0.2em]',
          weekday === 0 ? 'text-plac-warn' : weekday === 6 ? 'text-plnk-DEFAULT' : 'text-plnk-muted',
        )}>
          {WEEK[weekday]}
        </span>
        <span className={cn(
          'font-display text-[18px] font-semibold tabular-nums',
          isToday ? 'text-plnk-DEFAULT' : 'text-plnk-DEFAULT',
        )}>
          {dayNum}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-[10.5px] text-plnk-faint">—</p>
        ) : (
          rows.map((r, i) => <WeekStrip key={i} row={r} />)
        )}
      </div>
    </button>
  );
}

function WeekStrip({ row }: { row: CalendarRow }) {
  const time = row.kind === 'virtual_task'
    ? formatKst(row.start, { withTime: true }).slice(11, 16)
    : row.kind === 'virtual_habit' && row.start
      ? formatKst(row.start, { withTime: true }).slice(11, 16)
      : row.kind === 'manual' && !row.allDay
        ? formatKst(row.start, { withTime: true }).slice(11, 16)
        : '';

  if (row.kind === 'virtual_task') {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className={cn('block w-0.5 h-3 shrink-0', row.isDue ? 'bg-plac-warn' : 'bg-plnk-DEFAULT')} />
        {time && <span className="font-mono tabular-nums text-[9.5px] text-plnk-muted shrink-0">{time}</span>}
        <span className={cn('text-[11px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.title}
        </span>
      </div>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="block w-0.5 h-3 shrink-0 bg-plac-DEFAULT" />
        {time && <span className="font-mono tabular-nums text-[9.5px] text-plnk-muted shrink-0">{time}</span>}
        <span className={cn('text-[11px] truncate', row.done ? 'text-plnk-faint line-through' : 'text-plnk-dim')}>
          {row.emoji && <span className="mr-0.5">{row.emoji}</span>}{row.title}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="block w-0.5 h-3 shrink-0" style={{ backgroundColor: row.color || '#1F3A8A' }} />
      {time && <span className="font-mono tabular-nums text-[9.5px] text-plnk-muted shrink-0">{time}</span>}
      <span className="text-[11px] truncate text-plnk-dim">{row.title}</span>
    </div>
  );
}

// ──────────────────────────────────────────
function DayModal({ day, onClose }: { day: DayKey; onClose: () => void }) {
  const navigate = useNavigate();
  const events = useEvents();
  useTasks(); useHabits();
  const rows = useMemo(() => buildCalendarForDay(day), [day, events]);

  const [editing, setEditing] = useState<ManualEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const dt = dayKeyToDate(day);
  const wd = WEEK[dt.getUTCDay()];

  return (
    <ModalShell onClose={onClose} eyebrow={wd + '요일'} title={day}>
      <div>
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-plnk-faint italic py-4 text-center border-y border-pln-line">
            이 날 일정이 없어요
          </p>
        ) : (
          <div className="border-y border-pln-line">
            {rows.map((r, i) => (
              <DayRow
                key={i}
                row={r}
                onEditEvent={(e) => setEditing(e)}
                onJumpTask={() => { navigate('/tasks'); onClose(); }}
                onJumpHabit={() => { navigate('/habits'); onClose(); }}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => setCreating(true)}
          className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT pb-0.5 hover:opacity-70"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} /> 일정 추가
        </button>
      </div>

      {creating && <EventEditor day={day} onClose={() => setCreating(false)} />}
      {editing && <EventEditor day={day} event={editing} onClose={() => setEditing(null)} />}
    </ModalShell>
  );
}

function DayRow({
  row, onEditEvent, onJumpTask, onJumpHabit,
}: {
  row: CalendarRow;
  onEditEvent: (e: ManualEvent) => void;
  onJumpTask: () => void;
  onJumpHabit: () => void;
}) {
  if (row.kind === 'virtual_task') {
    return (
      <button
        onClick={onJumpTask}
        className="w-full text-left flex items-center gap-3 py-3 border-b border-pln-line hover:bg-pln-base/40"
      >
        <span className={cn('block w-1 self-stretch shrink-0', row.isDue ? 'bg-plac-warn' : 'bg-plnk-DEFAULT')} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted shrink-0">
          {row.isDue ? '마감' : '예정'}
        </span>
        <span className={cn('flex-1 text-[13px]', row.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
          {row.title}
        </span>
        <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted">
          {formatKst(row.start, { withTime: true }).slice(11, 16)}
        </span>
      </button>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <button
        onClick={onJumpHabit}
        className="w-full text-left flex items-center gap-3 py-3 border-b border-pln-line hover:bg-pln-base/40"
      >
        <span className="block w-1 self-stretch shrink-0 bg-plac-DEFAULT" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted shrink-0">습관</span>
        <span className={cn('flex-1 text-[13px]', row.done ? 'text-plnk-faint line-through' : 'text-plnk-DEFAULT')}>
          {row.emoji && <span className="mr-1">{row.emoji}</span>}{row.title}
        </span>
        {row.start && (
          <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted">
            {formatKst(row.start, { withTime: true }).slice(11, 16)}
          </span>
        )}
      </button>
    );
  }
  return (
    <button
      onClick={() => onEditEvent(row)}
      className="w-full text-left flex items-center gap-3 py-3 border-b border-pln-line hover:bg-pln-base/40"
    >
      <span className="block w-1 self-stretch shrink-0" style={{ backgroundColor: row.color || '#1F3A8A' }} />
      <span className="flex-1 text-[13px] text-plnk-DEFAULT truncate">{row.title}</span>
      {row.allDay ? (
        <span className="text-[10px] font-mono uppercase tracking-wider text-plnk-muted">종일</span>
      ) : (
        <span className="text-[10.5px] font-mono tabular-nums text-plnk-muted">
          {formatKst(row.start, { withTime: true }).slice(11, 16)}
          {row.end && ` ~ ${formatKst(row.end, { withTime: true }).slice(11, 16)}`}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
function EventEditor({
  day, event, onClose,
}: { day: DayKey; event?: ManualEvent; onClose: () => void }) {
  const isNew = !event;
  const [title, setTitle] = useState(event?.title ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(() => {
    if (event && !event.allDay) return formatKst(event.start, { withTime: true }).slice(11, 16);
    return '09:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (event?.end) return formatKst(event.end, { withTime: true }).slice(11, 16);
    return '10:00';
  });
  const [color, setColor] = useState(event?.color ?? '#1F3A8A');

  const colorChoices = ['#1F3A8A', '#9A2E1A', '#A06F1F', '#3F6B3A', '#5B3F8A', '#1F1A14'];

  const save = () => {
    if (!title.trim()) return;
    const parseTime = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      const [y, mo, d] = day.split('-').map(Number);
      return Date.UTC(y, mo - 1, d, h - 9, m);
    };
    const start = allDay ? parseTime('00:00') : parseTime(startTime);
    const end = allDay ? undefined : parseTime(endTime);
    if (isNew) addEvent({ title: title.trim(), start, end, allDay, color });
    else if (event) updateEvent(event.id, { title: title.trim(), start, end, allDay, color });
    onClose();
  };

  const handleDelete = () => {
    if (!event) return;
    if (!window.confirm(`"${event.title}" 지울까요?`)) return;
    removeEvent(event.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} eyebrow={isNew ? '새 일정' : '편집'}>
      <Field label="제목">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) save(); }}
          placeholder="일정"
          className="w-full bg-transparent border-b border-pln-rule pb-2 text-[18px] font-display text-plnk-DEFAULT placeholder:text-plnk-faint outline-none focus:border-plac-DEFAULT"
        />
      </Field>

      <label className="flex items-center gap-2 text-[12.5px] text-plnk-DEFAULT cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="accent-plac-DEFAULT"
        />
        종일
      </label>

      {!allDay && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">시작</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums outline-none focus:border-plac-DEFAULT"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">종료</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-transparent border-b border-pln-rule pb-1 text-[14px] tabular-nums outline-none focus:border-plac-DEFAULT"
            />
          </div>
        </div>
      )}

      <Field label="색">
        <div className="flex gap-2">
          {colorChoices.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 transition-transform',
                color === c && 'ring-2 ring-offset-2 ring-plnk-DEFAULT scale-110',
              )}
              style={{ backgroundColor: c }}
              aria-label="색"
            />
          ))}
        </div>
      </Field>

      <ModalFooter>
        {!isNew ? (
          <button onClick={handleDelete} className="text-[12px] text-plac-warn hover:opacity-70 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" strokeWidth={1.5} /> 지우기
          </button>
        ) : <span />}
        <FooterPrimary onClick={save} disabled={!title.trim()}>{isNew ? '추가' : '저장'}</FooterPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// 공용
// ──────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted block mb-2">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({
  onClose, eyebrow, title, children,
}: { onClose: () => void; eyebrow: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-plnk-DEFAULT/30" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] bg-pln-card border border-pln-rule overflow-hidden flex flex-col animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-7 pt-6 pb-4 border-b border-pln-line flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-plnk-muted mb-1">{eyebrow}</p>
            {title && <h3 className="font-display text-[20px] font-semibold text-plnk-DEFAULT tracking-tight leading-snug tabular-nums">{title}</h3>}
          </div>
          <button onClick={onClose} className="text-plnk-muted hover:text-plnk-DEFAULT">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 px-7 py-4 border-t border-pln-line bg-pln-base flex items-center justify-between gap-4 -mx-7 -mb-6 mt-8">
      {children}
    </div>
  );
}

function FooterPrimary({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[13px] font-medium text-plac-DEFAULT border-b border-plac-DEFAULT pb-0.5 hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children} →
    </button>
  );
}

/**
 * 📅 Calendar — 캘린더 페이지 (Phase 1.4)
 *
 * 월/주 뷰 + manual + task 가상 + habit 가상 합성.
 * 색상 3종: manual(컬러) / task(앰버) / habit(연두).
 * 빈 셀 클릭 → 선택 날짜 모달 (manual 추가·편집·삭제 + task/habit 보기).
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addEvent, updateEvent, removeEvent,
  buildCalendarForDay,
  todayKey, dayKeyOf,
  formatKst,
  type CalendarRow, type ManualEvent, type DayKey,
} from '@/lib/planner';
import { useTasks } from '@/lib/planner';
import { useHabits } from '@/lib/planner';
import { useEvents } from '@/lib/planner';

const KST_OFFSET = 9 * 3600 * 1000;

// ──────────────────────────────────────────
// 날짜 헬퍼 (페이지 로컬)
// ──────────────────────────────────────────
function focusDayToKey(focused: Date): DayKey {
  const kst = new Date(focused.getTime() + KST_OFFSET);
  return kst.toISOString().slice(0, 10);
}

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

// 월뷰 6주 그리드 — 일요일 시작
function monthGridDays(focused: Date): DayKey[] {
  const first = startOfMonth(focused);
  const firstWeekday = first.getUTCDay(); // 0=일
  const start = new Date(first.getTime() - firstWeekday * 24 * 3600 * 1000);
  const out: DayKey[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// 주뷰 7일
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

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ──────────────────────────────────────────
const Calendar = () => {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  // store 구독 — selector 가 변경될 때 자동 리렌더
  useTasks();
  useHabits();
  useEvents();

  const today = todayKey();
  const focusedKst = new Date(focused.getTime() + KST_OFFSET);
  const monthLabel = `${focusedKst.getUTCFullYear()}년 ${focusedKst.getUTCMonth() + 1}월`;

  const days = view === 'month' ? monthGridDays(focused) : weekDays(focused);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-[920px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFocused(view === 'month' ? shiftMonth(focused, -1) : shiftWeek(focused, -1))}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="이전"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[15px] font-bold text-slate-800 min-w-[110px] text-center">{monthLabel}</h1>
            <button
              onClick={() => setFocused(view === 'month' ? shiftMonth(focused, 1) : shiftWeek(focused, 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="다음"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFocused(new Date())}
              className="ml-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100"
            >
              오늘
            </button>
          </div>

          <div className="flex-1" />

          {/* 뷰 토글 */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-100">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-all',
                  view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500',
                )}
              >
                {v === 'month' ? '월' : '주'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-[920px] mx-auto px-5 py-4">
        {view === 'month' ? (
          <MonthGrid
            days={days}
            focused={focused}
            today={today}
            onSelectDay={setSelectedDay}
          />
        ) : (
          <WeekGrid days={days} today={today} onSelectDay={setSelectedDay} />
        )}
      </main>

      {selectedDay && (
        <DayModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
};

export default Calendar;

// ──────────────────────────────────────────
// 월뷰 그리드
// ──────────────────────────────────────────
function MonthGrid({
  days, focused, today, onSelectDay,
}: {
  days: DayKey[];
  focused: Date;
  today: DayKey;
  onSelectDay: (d: DayKey) => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-slate-50/60 border-b border-slate-200">
        {WEEK_LABELS.map((l, i) => (
          <div
            key={i}
            className={cn(
              'py-2 text-center text-[10.5px] font-bold',
              i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-500',
            )}
          >
            {l}
          </div>
        ))}
      </div>
      {/* 6주 */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => (
          <DayCell
            key={d + '-' + i}
            day={d}
            isToday={d === today}
            inCurrentMonth={isSameMonth(dayKeyToDate(d), focused)}
            weekday={i % 7}
            onClick={() => onSelectDay(d)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day, isToday, inCurrentMonth, weekday, onClick,
}: {
  day: DayKey;
  isToday: boolean;
  inCurrentMonth: boolean;
  weekday: number;
  onClick: () => void;
}) {
  const rows = useMemo(() => buildCalendarForDay(day), [day]);
  const dayNum = parseInt(day.slice(8, 10), 10);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative min-h-[96px] p-1.5 text-left border-r border-b border-slate-100 last:border-r-0 transition-colors',
        'hover:bg-indigo-50/30',
        !inCurrentMonth && 'bg-slate-50/40',
      )}
    >
      <div className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold tabular-nums mb-1',
        isToday && 'bg-indigo-500 text-white',
        !isToday && inCurrentMonth && (weekday === 0 ? 'text-rose-500' : weekday === 6 ? 'text-sky-500' : 'text-slate-700'),
        !isToday && !inCurrentMonth && 'text-slate-300',
      )}>
        {dayNum}
      </div>
      <div className="space-y-0.5">
        {rows.slice(0, 3).map((r, i) => <CellRow key={i} row={r} />)}
        {rows.length > 3 && (
          <div className="text-[9px] text-slate-400 px-1">+{rows.length - 3}건</div>
        )}
      </div>
    </button>
  );
}

function CellRow({ row }: { row: CalendarRow }) {
  if (row.kind === 'virtual_task') {
    return (
      <div
        className={cn(
          'truncate text-[9.5px] px-1 py-0.5 rounded font-medium',
          row.isDue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
          row.done && 'line-through opacity-60',
        )}
      >
        {row.isDue ? '📌 ' : ''}{row.title}
      </div>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <div className={cn(
        'truncate text-[9.5px] px-1 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700',
        row.done && 'opacity-60',
      )}>
        {row.emoji || '🌱'} {row.title}
      </div>
    );
  }
  // ManualEvent
  return (
    <div
      className="truncate text-[9.5px] px-1 py-0.5 rounded font-medium text-white"
      style={{ backgroundColor: row.color || 'hsl(220 70% 55%)' }}
    >
      {row.title}
    </div>
  );
}

// ──────────────────────────────────────────
// 주뷰 — 7 컬럼 가로
// ──────────────────────────────────────────
function WeekGrid({ days, today, onSelectDay }: { days: DayKey[]; today: DayKey; onSelectDay: (d: DayKey) => void }) {
  return (
    <div className="grid grid-cols-7 gap-2">
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
        'min-h-[280px] rounded-xl bg-white border p-2 text-left transition-all',
        isToday ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200',
      )}
    >
      <div className={cn(
        'flex items-baseline justify-between mb-2 pb-1.5 border-b',
        isToday ? 'border-indigo-200' : 'border-slate-100',
      )}>
        <span className={cn(
          'text-[10.5px] font-bold',
          weekday === 0 ? 'text-rose-500' : weekday === 6 ? 'text-sky-500' : 'text-slate-500',
        )}>
          {WEEK_LABELS[weekday]}
        </span>
        <span className={cn(
          'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold tabular-nums',
          isToday && 'bg-indigo-500 text-white',
        )}>
          {dayNum}
        </span>
      </div>
      <div className="space-y-1">
        {rows.length === 0 ? (
          <p className="text-[10px] text-slate-300 py-2">비어 있음</p>
        ) : (
          rows.map((r, i) => <WeekRow key={i} row={r} />)
        )}
      </div>
    </button>
  );
}

function WeekRow({ row }: { row: CalendarRow }) {
  const time = row.kind === 'virtual_task'
    ? formatKst(row.start, { withTime: true }).slice(11)
    : row.kind === 'virtual_habit' && row.start
      ? formatKst(row.start, { withTime: true }).slice(11)
      : row.kind === 'manual' && !row.allDay
        ? formatKst(row.start, { withTime: true }).slice(11)
        : '';

  if (row.kind === 'virtual_task') {
    return (
      <div className={cn(
        'text-[10px] px-1.5 py-1 rounded truncate font-medium border-l-2',
        row.isDue ? 'bg-rose-50/60 text-rose-700 border-rose-400' : 'bg-amber-50/60 text-amber-700 border-amber-400',
        row.done && 'line-through opacity-60',
      )}>
        {time && <span className="text-[9px] mr-1 opacity-70">{time}</span>}
        {row.title}
      </div>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <div className={cn(
        'text-[10px] px-1.5 py-1 rounded truncate font-medium border-l-2 border-emerald-400 bg-emerald-50/60 text-emerald-700',
        row.done && 'opacity-60',
      )}>
        {time && <span className="text-[9px] mr-1 opacity-70">{time}</span>}
        {row.emoji || '🌱'} {row.title}
      </div>
    );
  }
  return (
    <div className="text-[10px] px-1.5 py-1 rounded truncate font-medium text-white" style={{ backgroundColor: row.color || 'hsl(220 70% 55%)' }}>
      {time && <span className="text-[9px] mr-1 opacity-80">{time}</span>}
      {row.title}
    </div>
  );
}

// ──────────────────────────────────────────
// DayModal — 선택 날짜 풀 항목 + manual 추가
// ──────────────────────────────────────────
function DayModal({ day, onClose }: { day: DayKey; onClose: () => void }) {
  const navigate = useNavigate();
  const events = useEvents();
  // tasks/habits 도 구독해서 갱신 보장
  useTasks();
  useHabits();
  const rows = useMemo(() => buildCalendarForDay(day), [day, events]);

  const [editing, setEditing] = useState<ManualEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const dateLabel = (() => {
    const dt = dayKeyToDate(day);
    const wd = dt.getUTCDay();
    return `${day} (${WEEK_LABELS[wd]})`;
  })();

  return (
    <ModalShell onClose={onClose} title={dateLabel}>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic py-4 text-center">이 날 일정이 없어요</p>
        ) : (
          rows.map((r, i) => (
            <DayModalRow
              key={i}
              row={r}
              onEditEvent={(e) => setEditing(e)}
              onJumpTask={() => { navigate('/tasks'); onClose(); }}
              onJumpHabit={() => { navigate('/habits'); onClose(); }}
            />
          ))
        )}

        <button
          onClick={() => setCreating(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          일정 추가
        </button>
      </div>

      {creating && (
        <EventEditor
          day={day}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <EventEditor
          day={day}
          event={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </ModalShell>
  );
}

function DayModalRow({
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
        className={cn(
          'w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border-l-4 hover:bg-slate-50 transition-colors',
          row.isDue ? 'border-rose-400 bg-rose-50/40' : 'border-amber-400 bg-amber-50/40',
        )}
      >
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', row.isDue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
          {row.isDue ? '마감' : '예정'}
        </span>
        <span className={cn('flex-1 text-[12px] font-medium', row.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
          {row.title}
        </span>
        <span className="text-[10px] text-slate-400 tabular-nums">
          {formatKst(row.start, { withTime: true }).slice(11)}
        </span>
      </button>
    );
  }
  if (row.kind === 'virtual_habit') {
    return (
      <button
        onClick={onJumpHabit}
        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border-l-4 border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/60 transition-colors"
      >
        <span className="text-[14px]">{row.emoji || '🌱'}</span>
        <span className={cn('flex-1 text-[12px] font-medium', row.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
          {row.title}
        </span>
        {row.start && (
          <span className="text-[10px] text-slate-400 tabular-nums">
            {formatKst(row.start, { withTime: true }).slice(11)}
          </span>
        )}
      </button>
    );
  }
  // ManualEvent
  return (
    <button
      onClick={() => onEditEvent(row)}
      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
      style={{ borderLeft: `4px solid ${row.color || 'hsl(220 70% 55%)'}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-slate-800 truncate">{row.title}</div>
      </div>
      {row.allDay ? (
        <span className="text-[10px] text-slate-400">종일</span>
      ) : (
        <span className="text-[10px] text-slate-400 tabular-nums">
          {formatKst(row.start, { withTime: true }).slice(11)}
          {row.end && ` ~ ${formatKst(row.end, { withTime: true }).slice(11)}`}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// EventEditor — manual 추가/편집
// ──────────────────────────────────────────
function EventEditor({
  day, event, onClose,
}: {
  day: DayKey;
  event?: ManualEvent;
  onClose: () => void;
}) {
  const isNew = !event;
  const [title, setTitle] = useState(event?.title ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(() => {
    if (event && !event.allDay) {
      return formatKst(event.start, { withTime: true }).slice(11, 16);
    }
    return '09:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (event?.end) return formatKst(event.end, { withTime: true }).slice(11, 16);
    return '10:00';
  });
  const [color, setColor] = useState(event?.color ?? 'hsl(220 70% 55%)');

  const colorChoices = [
    'hsl(220 70% 55%)',  // 파랑
    'hsl(0 75% 55%)',    // 빨강
    'hsl(38 92% 50%)',   // 앰버
    'hsl(155 65% 45%)',  // 그린
    'hsl(262 70% 55%)',  // 보라
    'hsl(335 75% 60%)',  // 핑크
  ];

  const save = () => {
    if (!title.trim()) return;
    const parseTime = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      const [y, mo, d] = day.split('-').map(Number);
      // KST → UTC ms
      return Date.UTC(y, mo - 1, d, h - 9, m);
    };
    const start = allDay ? parseTime('00:00') : parseTime(startTime);
    const end = allDay ? undefined : parseTime(endTime);

    if (isNew) {
      addEvent({ title: title.trim(), start, end, allDay, color });
    } else if (event) {
      updateEvent(event.id, { title: title.trim(), start, end, allDay, color });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!event) return;
    if (!window.confirm(`"${event.title}" 일정을 삭제할까요?`)) return;
    removeEvent(event.id);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} title={isNew ? '새 일정' : '일정 편집'}>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">제목</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) save(); }}
            placeholder="일정 제목"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
          />
        </div>

        <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="accent-indigo-500"
          />
          종일
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">시작</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] tabular-nums outline-none focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">종료</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] tabular-nums outline-none focus:border-indigo-300"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">색상</label>
          <div className="flex gap-1.5">
            {colorChoices.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-all',
                  color === c ? 'border-slate-800 scale-110' : 'border-white',
                )}
                style={{ backgroundColor: c }}
                aria-label="색상"
              />
            ))}
          </div>
        </div>
      </div>

      <ModalFooter>
        {!isNew && (
          <button
            onClick={handleDelete}
            className="text-[12px] text-rose-500 hover:text-rose-700 font-medium inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        )}
        {isNew && <span />}
        <button
          onClick={save}
          disabled={!title.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
        >
          {isNew ? '추가' : '저장'}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ──────────────────────────────────────────
// 공용 모달 셸
// ──────────────────────────────────────────
function ModalShell({
  onClose, title, children,
}: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[520px] max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-slate-800 flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/70 backdrop-blur-sm flex items-center justify-between gap-3 -mx-5 -mb-4 mt-5">
      {children}
    </div>
  );
}

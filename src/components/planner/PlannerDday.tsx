/**
 * 사이드바 D-day 위젯 — 시험/발표/생일/마감 같은 특별한 날 카운트다운.
 *
 * - list: 가까운 순. D-N (미래) / D-DAY (당일) / D+N (지남, 흐림)
 * - 인라인 추가: 라벨 + 날짜 input → Enter 또는 + 버튼
 * - 호버 시 삭제 버튼
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Flag, Plus, X } from 'lucide-react';
import { ddayStore } from '@/services/planner/ddayStore';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { PLANNER_DDAY_CHANGED, type PlannerDday } from '@/types/planner';

const localDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, delta: number) => (
  new Date(date.getFullYear(), date.getMonth() + delta, 1)
);

const calendarCells = (month: Date) => {
  const start = monthStart(month);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + index);
    return cell;
  });
};

const CALENDAR_POPOVER_WIDTH = 236;
const CALENDAR_POPOVER_HEIGHT = 307;
const CALENDAR_POPOVER_GAP = 8;

const computeDday = (dateIso: string, todayKey: string): { label: string; days: number; tone: 'future' | 'today' | 'past' } => {
  // 로컬 자정 기준 날짜 차이.
  const t = new Date(`${todayKey}T00:00:00`);
  const d = new Date(`${dateIso}T00:00:00`);
  const days = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (days === 0) return { label: 'D-DAY', days, tone: 'today' };
  if (days > 0) return { label: `D-${days}`, days, tone: 'future' };
  return { label: `D+${-days}`, days, tone: 'past' };
};

const formatDdayDate = (dateIso: string) => {
  const d = parseDateKey(dateIso);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
};

export const PlannerDday = () => {
  const [items, setItems] = useState<PlannerDday[]>(() => ddayStore.list());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setItems(ddayStore.list());
    window.addEventListener(PLANNER_DDAY_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_DDAY_CHANGED, refresh);
  }, []);

  const todayKey = localDateKey(new Date());

  // 미래/오늘 우선 노출, 지난 건 뒤로.
  const sorted = useMemo(() => {
    const withDday = items.map((it) => ({ it, dd: computeDday(it.dateIso, todayKey) }));
    return withDday.sort((a, b) => {
      // 지나간 건 뒤로
      const aPast = a.dd.tone === 'past' ? 1 : 0;
      const bPast = b.dd.tone === 'past' ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return a.dd.days - b.dd.days;
    });
  }, [items, todayKey]);
  const visibleItems = sorted.slice(0, 2);
  const hiddenCount = Math.max(0, sorted.length - visibleItems.length);

  return (
    <section className="px-1">
      <div className="flex items-center gap-1.5 px-1.5 mb-1">
        <Flag className="h-3 w-3 text-foreground/55" />
        <span className="text-[12px] font-semibold text-foreground/85 tracking-tight">
          디데이
        </span>
        {items.length > 0 && (
          <span className="text-[10.5px] tabular-nums text-foreground/55">{items.length}</span>
        )}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="새 디데이"
          className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {sorted.length === 0 && !creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full px-1.5 py-1.5 text-left text-[11.5px] text-foreground/55 hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          + 시험·발표 등 카운트다운 추가
        </button>
      ) : (
        <ul className="space-y-1">
          {visibleItems.map(({ it, dd }) => (
            <li
              key={it.id}
              className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-accent/55 transition-colors"
            >
              <span
                className={cn(
                  'shrink-0 inline-flex h-5 min-w-[42px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                  dd.tone === 'today' && 'bg-rose-500 text-white',
                  dd.tone === 'future' && 'bg-primary/10 text-primary',
                  dd.tone === 'past' && 'bg-foreground/[0.05] text-foreground/45',
                )}
              >
                {dd.label}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12px] font-medium leading-none',
                  dd.tone === 'past' ? 'text-foreground/45' : 'text-foreground/90',
                )}
              >
                {it.label}
              </span>
              <span className={cn(
                'hidden shrink-0 text-[10px] leading-none text-foreground/42 sm:inline',
                dd.tone === 'past' && 'text-foreground/30',
              )}>
                {formatDdayDate(it.dateIso)}
              </span>
              <button
                type="button"
                onClick={() => ddayStore.remove(it.id)}
                aria-label={`${it.label} 삭제`}
                className="hidden group-hover:flex h-4 w-4 items-center justify-center rounded text-foreground/55 hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="px-1.5 pt-0.5 text-[10.5px] tabular-nums text-foreground/45">
              +{hiddenCount}개 더
            </li>
          )}
        </ul>
      )}

      {creating && <NewDdayInput onDone={() => setCreating(false)} />}
    </section>
  );
};

const NewDdayInput = ({ onDone }: { onDone: () => void }) => {
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState('');
  const todayKey = localDateKey(new Date());
  const [date, setDate] = useState(todayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState<{ top: number; left: number } | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parseDateKey(todayKey)));
  const visibleCells = calendarCells(visibleMonth);

  useEffect(() => {
    if (!calendarOpen) {
      setCalendarPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = dateButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const maxLeft = window.innerWidth - CALENDAR_POPOVER_WIDTH - CALENDAR_POPOVER_GAP;
      const left = Math.max(
        CALENDAR_POPOVER_GAP,
        Math.min(rect.right - CALENDAR_POPOVER_WIDTH, maxLeft),
      );
      const preferredTop = rect.top - CALENDAR_POPOVER_HEIGHT - CALENDAR_POPOVER_GAP;
      const fallbackTop = Math.min(
        rect.bottom + CALENDAR_POPOVER_GAP,
        window.innerHeight - CALENDAR_POPOVER_HEIGHT - CALENDAR_POPOVER_GAP,
      );
      const top = Math.max(CALENDAR_POPOVER_GAP, preferredTop < CALENDAR_POPOVER_GAP ? fallbackTop : preferredTop);

      setCalendarPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [calendarOpen]);

  /** explicit=true: Enter / + 버튼처럼 사용자가 명시 저장. label 필수.
   *  explicit=false: blur 자동 저장. label 비었으면 silent cancel (자동 저장이라 noise X). */
  const submit = (explicit: boolean) => {
    const trimmed = label.trim();
    if (!trimmed) {
      if (explicit) notify.warning('라벨을 입력해주세요', { duration: 1500 });
      else onDone(); // 자동 저장에서 라벨 없으면 그냥 취소
      return;
    }
    if (!date) {
      if (explicit) notify.warning('날짜를 선택해주세요', { duration: 1500 });
      else onDone();
      return;
    }
    ddayStore.add({ label: trimmed, dateIso: date });
    onDone();
  };

  return (
    <div
      className="relative mt-1 flex items-center gap-1 px-1.5 py-1 rounded-md border border-transparent bg-card/80 shadow-[inset_0_0_0_1px_hsl(30_12%_88%/0.55)]"
      // wrapper outside 클릭(focus 가 wrapper 외부로) 시 자동 저장 시도.
      // wrapper 내부 input ↔ date 이동 시는 저장 X (relatedTarget contained).
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        submit(false);
      }}
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(true);
          else if (e.key === 'Escape') onDone();
        }}
        placeholder="라벨"
        className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/45 text-foreground"
      />
      <button
        type="button"
        ref={dateButtonRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setVisibleMonth(monthStart(parseDateKey(date)));
          setCalendarOpen((v) => !v);
        }}
        aria-label="날짜 선택"
        className={cn(
          'h-6 inline-flex items-center gap-1 rounded-md px-1.5 text-[10.5px] tabular-nums text-foreground/80 transition-colors',
          'hover:bg-accent hover:text-foreground',
          calendarOpen && 'bg-accent text-foreground',
        )}
      >
        <span>{date}</span>
        <CalendarDays className="h-3 w-3 text-foreground/55" strokeWidth={2} />
      </button>
      <button
        type="button"
        // mousedown 으로 막아 input blur 가 button click 전 submit 되는 race 방지.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => submit(true)}
        aria-label="저장"
        title="저장 (Enter)"
        className="h-5 w-5 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors shrink-0"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
      </button>

      {calendarOpen && calendarPosition && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[90] rounded-xl border border-border/80 bg-popover p-2.5 text-popover-foreground shadow-[0_14px_40px_hsl(30_15%_8%/0.14)]"
          style={{
            top: calendarPosition.top,
            left: calendarPosition.left,
            width: CALENDAR_POPOVER_WIDTH,
          }}
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
              aria-label="이전 달"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/55 hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="flex-1 text-center text-[12.5px] font-semibold tracking-tight text-foreground">
              {visibleMonth.getFullYear()}년 {String(visibleMonth.getMonth() + 1).padStart(2, '0')}월
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
              aria-label="다음 달"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/55 hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 px-0.5 pb-1 text-center text-[10.5px] font-medium text-foreground/45">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <span
                key={day}
                className={cn(index === 0 && 'text-rose-500/70', index === 6 && 'text-blue-500/70')}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {visibleCells.map((cell) => {
              const key = localDateKey(cell);
              const inMonth = cell.getMonth() === visibleMonth.getMonth();
              const selected = key === date;
              const today = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDate(key);
                    setVisibleMonth(monthStart(cell));
                    setCalendarOpen(false);
                  }}
                  className={cn(
                    'h-7 rounded-md text-[11.5px] tabular-nums transition-colors',
                    inMonth ? 'text-foreground/85 hover:bg-accent' : 'text-foreground/30 hover:bg-accent/50',
                    today && !selected && 'bg-violet-50 text-violet-700',
                    selected && 'bg-violet-500 text-white shadow-sm hover:bg-violet-500 hover:text-white',
                  )}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDate(todayKey);
                setVisibleMonth(monthStart(new Date()));
                setCalendarOpen(false);
              }}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-violet-600 hover:bg-violet-50"
            >
              오늘
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCalendarOpen(false)}
              className="rounded-md px-2 py-1 text-[11px] text-foreground/55 hover:bg-accent hover:text-foreground"
            >
              닫기
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

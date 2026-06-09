/**
 * 사이드바 D-day 위젯 — 시험/발표/생일/마감 같은 특별한 날 카운트다운.
 *
 * - list: 가까운 순. D-N (미래) / D-DAY (당일) / D+N (지남, 흐림)
 * - 인라인 추가: 라벨 + 날짜 input → Enter 또는 + 버튼
 * - 호버 시 삭제 버튼
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Flag, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ddayStore } from '@/services/planner/ddayStore';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { PLANNER_DDAY_CHANGED, type PlannerDday } from '@/types/planner';
import { RAIL_EVENT } from './plannerRailEvents';

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
const SIDEBAR_DDAY_PAGE_SIZE = 3;

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
  const sectionRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<PlannerDday[]>(() => ddayStore.list());
  const [managerOpen, setManagerOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setItems(ddayStore.list());
    window.addEventListener(PLANNER_DDAY_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_DDAY_CHANGED, refresh);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const openCreate = () => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      setManagerOpen(true);
    };
    window.addEventListener(RAIL_EVENT.openDdayCreate, openCreate);
    return () => window.removeEventListener(RAIL_EVENT.openDdayCreate, openCreate);
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
  const pageCount = Math.max(1, Math.ceil(sorted.length / SIDEBAR_DDAY_PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleItems = sorted.slice(
    safePageIndex * SIDEBAR_DDAY_PAGE_SIZE,
    safePageIndex * SIDEBAR_DDAY_PAGE_SIZE + SIDEBAR_DDAY_PAGE_SIZE,
  );

  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1));
  }, [pageCount, pageIndex]);

  return (
    <section ref={sectionRef} className="px-1">
      <div className="flex items-center gap-1.5 px-1.5 mb-1">
        <Flag className="h-3 w-3 text-foreground/55" />
        <span className="text-[12.5px] font-semibold text-foreground/85 tracking-tight">
          디데이
        </span>
        {items.length > 0 && (
          <span className="text-[10.5px] tabular-nums text-foreground/55">{items.length}</span>
        )}
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          aria-label="새 디데이"
          className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {sorted.length === 0 ? (
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
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
                  'shrink-0 inline-flex h-5 min-w-[42px] items-center justify-center rounded-md px-1.5 text-[9.5px] font-bold tabular-nums tracking-tight border',
                  dd.tone === 'today' && 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-sm shadow-rose-500/10',
                  dd.tone === 'future' && 'bg-primary/[0.04] text-primary border-primary/10',
                  dd.tone === 'past' && 'bg-foreground/[0.03] text-foreground/40 border-foreground/[0.06]',
                )}
              >
                {dd.label}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12.5px] font-medium leading-none',
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
          {pageCount > 1 && (
            <li className="mt-1 flex items-center justify-center gap-1 px-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                disabled={safePageIndex === 0}
                aria-label="이전 디데이"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-9 text-center text-[10.5px] font-semibold tabular-nums text-foreground/45">
                {safePageIndex + 1}/{pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
                disabled={safePageIndex >= pageCount - 1}
                aria-label="다음 디데이"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </li>
          )}
        </ul>
      )}

      {managerOpen && (
        <DdayManagerPopover
          items={sorted}
          todayKey={todayKey}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </section>
  );
};

const DDAY_MANAGER_WIDTH = 356;
const DDAY_MANAGER_LEFT = 68;
const DDAY_MANAGER_TOP = 78;

const DdayManagerPopover = ({
  items,
  todayKey,
  onClose,
}: {
  items: Array<{ it: PlannerDday; dd: ReturnType<typeof computeDday> }>;
  todayKey: string;
  onClose: () => void;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayKey);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  const resetForm = () => {
    setLabel('');
    setDate(todayKey);
    setEditingId(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      notify.warning('디데이 이름을 입력해주세요', { duration: 1500 });
      return;
    }
    if (!date) {
      notify.warning('날짜를 선택해주세요', { duration: 1500 });
      return;
    }

    if (editingId) {
      ddayStore.update(editingId, { label: trimmed, dateIso: date });
      notify.success('D-day를 수정했어요', { duration: 1200 });
    } else {
      ddayStore.add({ label: trimmed, dateIso: date });
      notify.success('D-day를 추가했어요', { duration: 1200 });
    }
    resetForm();
  };

  const startEdit = (item: PlannerDday) => {
    setEditingId(item.id);
    setLabel(item.label);
    setDate(item.dateIso);
  };

  const upcomingCount = items.filter(({ dd }) => dd.tone !== 'past').length;
  const pastCount = items.length - upcomingCount;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[79] bg-black/30 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      {/* 가로형 중앙 모달 바디 */}
      <div
        ref={panelRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[640px] max-w-[92vw] h-[460px] overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-[0_32px_80px_rgba(0,0,0,0.16)] flex flex-col font-sans"
        data-dday-manager="true"
      >
        {/* 모달 헤더 */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[20px] select-none" role="img" aria-label="calendar">📅</span>
            <h2 className="text-[18px] font-black tracking-tight text-foreground font-sans">D-day</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* 좌우 2분할 콘텐츠 영역 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측: 디데이 리스트 */}
          <div className="w-[300px] border-r border-border/40 flex flex-col bg-muted/[0.08]">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <span className="text-2xl mb-1.5 select-none opacity-50">⏳</span>
                  <p className="text-[12px] font-bold text-muted-foreground/85">저장된 디데이가 없습니다.</p>
                </div>
              ) : (
                items.map(({ it, dd }) => (
                  <div
                    key={it.id}
                    onClick={() => startEdit(it)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer border border-transparent',
                      editingId === it.id 
                        ? 'bg-violet-500/[0.05] border-violet-500/20 ring-1 ring-violet-500/10' 
                        : 'bg-card hover:bg-accent/40 hover:border-border/40',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-[22px] min-w-[46px] shrink-0 items-center justify-center rounded-lg px-1.5 text-[9px] font-black tabular-nums tracking-tight border',
                        dd.tone === 'today' && 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-sm shadow-rose-500/10',
                        dd.tone === 'future' && 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:border-violet-800/40 dark:text-violet-400',
                        dd.tone === 'past' && 'bg-muted/60 text-muted-foreground border-border/40',
                      )}
                    >
                      {dd.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-[13px] font-bold text-foreground', dd.tone === 'past' && 'text-muted-foreground/80')}>
                        {it.label}
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-medium text-muted-foreground">{formatDdayDate(it.dateIso)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ddayStore.remove(it.id);
                        if (editingId === it.id) resetForm();
                      }}
                      aria-label={`${it.label} 삭제`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 우측: 추가 / 편집 폼 */}
          <div className="flex-1 flex flex-col justify-between p-6">
            <form onSubmit={submit} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-extrabold tracking-tight text-foreground">
                    {editingId ? '디데이 수정' : '새 디데이 추가'}
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-[11.5px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      새로 만들기
                    </button>
                  )}
                </div>
                
                <div className="space-y-3.5">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-muted-foreground/75 uppercase">디데이 이름</span>
                    <input
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      placeholder="예: 기말고사, 발표, 원서 마감"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-[13.5px] font-medium text-foreground outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 placeholder:text-muted-foreground/45 shadow-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-muted-foreground/75 uppercase">목표 날짜</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 shadow-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/30 mt-4">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-10 rounded-2xl px-4 text-[13px] font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-violet-600 hover:bg-violet-700 px-5 text-[13px] font-extrabold text-white shadow-md shadow-violet-600/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {editingId ? <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
                  {editingId ? '수정 완료' : '디데이 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body,
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

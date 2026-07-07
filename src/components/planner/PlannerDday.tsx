/**
 * 사이드바 D-day 위젯 — 시험/발표/생일/마감 같은 특별한 날 카운트다운.
 *
 * - list: 가까운 순. D-N (미래) / D-DAY (당일) / D+N (지남, 흐림)
 * - 인라인 추가: 라벨 + 날짜 input → Enter 또는 + 버튼
 * - 호버 시 삭제 버튼
 */
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Flag, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ddayStore } from '@/services/planner/ddayStore';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { PLANNER_DDAY_CHANGED, type PlannerDday } from '@/types/planner';
import { RAIL_EVENT } from './plannerRailEvents';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';

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
        <Flag className="h-3.5 w-3.5 text-foreground/70" />
        <span className="text-[13px] font-semibold text-foreground tracking-tight">
          디데이
        </span>
        {items.length > 0 && (
          <span className="text-[12px] tabular-nums text-muted-foreground font-semibold">{items.length}</span>
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

const DdayManagerPopover = ({
  items,
  todayKey,
  onClose,
}: {
  items: Array<{ it: PlannerDday; dd: ReturnType<typeof computeDday> }>;
  todayKey: string;
  onClose: () => void;
}) => {
  useScrollLock(true);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(onClose);
  const titleId = useId();
  const descId = useId();
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayKey);
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[79] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px] transition-opacity"
      data-dday-backdrop="true"
      role="presentation"
      {...backdropHandlers}
    >
      {/* 가로형 중앙 모달 바디 */}
      <div
        ref={trapRef}
        className="relative z-[80] flex h-[460px] w-[640px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border/80 bg-popover font-sans text-popover-foreground shadow-[0_32px_80px_rgba(0,0,0,0.16)]"
        data-dday-manager="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* 모달 헤더 */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[20px] select-none" role="img" aria-label="calendar">📅</span>
            <h2 id={titleId} className="text-[18px] font-black tracking-tight text-foreground font-sans">D-day</h2>
            <p id={descId} className="sr-only">
              시험, 발표, 마감 같은 중요한 날짜를 추가하고 수정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="D-day 관리 닫기"
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
                  <p className="text-[12px] font-medium text-muted-foreground">저장된 디데이가 없어요.</p>
                </div>
              ) : (
                items.map(({ it, dd }) => (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={editingId === it.id}
                    aria-label={`${it.label} 수정`}
                    onClick={() => startEdit(it)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      startEdit(it);
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25',
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
                      data-autofocus="true"
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
    </div>,
    document.body,
  );
};


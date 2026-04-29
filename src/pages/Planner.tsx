/**
 * 통합 플래너 — /planner 라우트.
 *
 * UX 패턴 (다른 캘린더 앱 표준):
 * - 시간 이동: ←/→ 버튼 + 키보드 좌/우
 * - 오늘로: 'T' 키 + 버튼
 * - 현재 기간 라벨: 헤더에 명확히 표시
 *
 * 단축키:
 * - n: 인박스 빠른 추가 포커스 (Day/Week 뷰)
 * - d/w/m/y: 뷰 전환
 * - ← / →: 이전 / 다음
 * - t: 오늘로
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Inbox } from '@/components/planner/Inbox';
import { TodayTimeline } from '@/components/planner/TodayTimeline';
import { WeekStrip } from '@/components/planner/WeekStrip';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { WeekView } from '@/components/planner/WeekView';
import { MonthView } from '@/components/planner/MonthView';
import { YearView } from '@/components/planner/YearView';
import { ViewToggle, type PlannerView } from '@/components/planner/ViewToggle';
import { TaskScheduleDialog } from '@/components/planner/TaskScheduleDialog';
import { PlannerCommandPalette, type CommandAction } from '@/components/planner/PlannerCommandPalette';
import { taskStore } from '@/services/planner/taskStore';
import { cn } from '@/lib/utils';

const taskStoreSnapshot = () => taskStore.list();

import type { Priority } from '@/types/planner';

type DialogMode =
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

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const Planner = () => {
  const navigate = useNavigate();
  const inboxInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<PlannerView>('day');
  const [anchorIso, setAnchorIso] = useState(() => new Date().toISOString());
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const todayTasks = useTodayTasks();

  // Things3 Today Badge — 페이지 타이틀에 미완료 카운트 노출.
  useEffect(() => {
    const original = document.title;
    const count = todayTasks.length;
    document.title = count > 0 ? `(${count}) 통합 플래너` : '통합 플래너';
    return () => {
      document.title = original;
    };
  }, [todayTasks.length]);

  const handleDayClick = useCallback((dayIso: string) => {
    setAnchorIso(dayIso);
    setView('day');
  }, []);

  const handleMonthClick = useCallback((monthIso: string) => {
    setAnchorIso(monthIso);
    setView('month');
  }, []);

  const handleInboxClick = useCallback((task: { id: string; title: string }) => {
    const full = taskStore.list().find((t) => t.id === task.id);
    setDialogMode({
      kind: 'schedule',
      taskId: task.id,
      initialTitle: task.title,
      initialPriority: full?.priority,
      initialNote: full?.note,
      initialPinned: full?.pinned,
    });
  }, []);

  const handleSlotClick = useCallback((slotIso: string) => {
    setDialogMode({ kind: 'create', presetStartIso: slotIso });
  }, []);

  const handleItemClick = useCallback(
    (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => {
      if (item.kind === 'task') {
        const full = taskStore.list().find((t) => t.id === item.id);
        setDialogMode({
          kind: 'schedule',
          taskId: item.id,
          initialTitle: item.title,
          initialStart: item.startAt,
          initialEnd: item.endAt,
          initialPriority: full?.priority,
          initialNote: full?.note,
          initialPinned: full?.pinned,
        });
      }
    },
    [],
  );

  // 시간 이동 핸들러 — view 에 따라 ±1 day/week/month/year.
  const shiftAnchor = useCallback((direction: -1 | 1) => {
    setAnchorIso((prev) => {
      const d = new Date(prev);
      if (view === 'day') d.setDate(d.getDate() + direction);
      else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
      else if (view === 'month') d.setMonth(d.getMonth() + direction);
      else if (view === 'year') d.setFullYear(d.getFullYear() + direction);
      return d.toISOString();
    });
  }, [view]);

  const goPrev = useCallback(() => shiftAnchor(-1), [shiftAnchor]);
  const goNext = useCallback(() => shiftAnchor(1), [shiftAnchor]);
  const goToday = useCallback(() => setAnchorIso(new Date().toISOString()), []);

  // 명령 팔레트 액션 라우터.
  const handleCommandAction = useCallback((action: CommandAction) => {
    switch (action.kind) {
      case 'view':
        setView(action.view);
        break;
      case 'today':
        setAnchorIso(new Date().toISOString());
        setView('day');
        break;
      case 'shift': {
        const d = new Date();
        d.setDate(d.getDate() + action.days);
        setAnchorIso(d.toISOString());
        setView('day');
        break;
      }
      case 'newTask':
        setView('day');
        // 다음 frame 에 input 포커스 (palette 닫힘 후).
        setTimeout(() => inboxInputRef.current?.focus(), 50);
        break;
      case 'newAtNow': {
        const now = new Date();
        // 30분 단위로 반올림.
        const minutes = Math.floor(now.getMinutes() / 30) * 30;
        now.setMinutes(minutes, 0, 0);
        setDialogMode({ kind: 'create', presetStartIso: now.toISOString() });
        break;
      }
      case 'jumpToTask': {
        if (action.startAt) {
          setAnchorIso(action.startAt);
          setView('day');
        } else {
          // 인박스 → 시간 배정 모달.
          const task = taskStoreSnapshot().find((t) => t.id === action.id);
          if (task) {
            setDialogMode({ kind: 'schedule', taskId: task.id, initialTitle: task.title });
          }
        }
        break;
      }
      case 'jumpToEvent':
        setAnchorIso(action.startAt);
        setView('day');
        break;
    }
  }, []);

  // anchor 가 오늘과 같은 기간인지 (Today 버튼 dim 판정).
  const anchorIsToday = useMemo(() => {
    const a = new Date(anchorIso);
    const today = new Date();
    if (view === 'day') return isSameDay(a, today);
    if (view === 'week') {
      const start = new Date(a);
      start.setDate(a.getDate() - a.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return today >= start && today < end;
    }
    if (view === 'month') return a.getFullYear() === today.getFullYear() && a.getMonth() === today.getMonth();
    return a.getFullYear() === today.getFullYear();
  }, [anchorIso, view]);

  // 현재 기간 라벨 (헤더 강조 텍스트).
  const periodLabel = useMemo(() => {
    const d = new Date(anchorIso);
    if (view === 'day') {
      return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
    }
    if (view === 'week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startFmt = start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      const endFmt = end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      return `${startFmt} ~ ${endFmt}`;
    }
    if (view === 'month') return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    return `${d.getFullYear()}년`;
  }, [anchorIso, view]);

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      if (dialogMode) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (view === 'day' || view === 'week') {
            e.preventDefault();
            inboxInputRef.current?.focus();
          }
          break;
        case 'd': e.preventDefault(); setView('day'); break;
        case 'w': e.preventDefault(); setView('week'); break;
        case 'm': e.preventDefault(); setView('month'); break;
        case 'y': e.preventDefault(); setView('year'); break;
        case 't': e.preventDefault(); goToday(); break;
        case 'arrowleft':  e.preventDefault(); goPrev(); break;
        case 'arrowright': e.preventDefault(); goNext(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, dialogMode, goPrev, goNext, goToday]);

  const isFullscreen = view === 'month' || view === 'year';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-7 max-w-[1400px] w-full mx-auto">
        <header className="mb-5 sm:mb-6 flex flex-wrap items-end justify-between gap-3 pb-3 sm:pb-4 border-b-2 border-[hsl(var(--hairline))]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.16em]"
              aria-label="메인으로"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>메인</span>
            </button>
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight leading-none">통합 플래너</h1>
            <ViewToggle value={view} onChange={setView} />
            {/* 시간 네비게이션 */}
            <div className="inline-flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={goPrev}
                aria-label="이전"
                title="이전 (←)"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(var(--hairline))] bg-card hover:bg-accent text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                disabled={anchorIsToday}
                aria-label="오늘로"
                title="오늘로 (T)"
                className={cn(
                  'h-7 px-2.5 text-[11.5px] font-semibold rounded-md border border-[hsl(var(--hairline))] transition-colors',
                  anchorIsToday
                    ? 'bg-card text-muted-foreground/60 cursor-default'
                    : 'bg-card text-foreground hover:bg-accent',
                )}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="다음"
                title="다음 (→)"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(var(--hairline))] bg-card hover:bg-accent text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {/* 현재 기간 라벨 */}
            <span className="text-[14px] text-foreground font-medium tabular-nums">
              {periodLabel}
            </span>
          </div>
        </header>

        {isFullscreen ? (
          <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 sm:p-4 h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)]">
            {view === 'month' && (
              <MonthView
                anchorIso={anchorIso}
                onDayClick={handleDayClick}
                onItemClick={handleItemClick}
              />
            )}
            {view === 'year' && (
              <YearView
                anchorIso={anchorIso}
                onMonthClick={handleMonthClick}
                onDayClick={handleDayClick}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr_280px] gap-3 sm:gap-4 h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)]">
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 sm:p-4 min-h-0 max-h-[40vh] md:max-h-none">
              <Inbox
                inputRef={inboxInputRef}
                onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
              />
            </div>
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 sm:p-4 min-h-0">
              {view === 'day' && (
                <TodayTimeline
                  dateIso={anchorIso}
                  onItemClick={handleItemClick}
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  anchorIso={anchorIso}
                  onDayClick={handleDayClick}
                  onItemClick={handleItemClick}
                />
              )}
            </div>
            <div className="hidden lg:block rounded-xl border border-[hsl(var(--hairline))] bg-card p-4 min-h-0">
              <WeekStrip anchorIso={anchorIso} onDayClick={handleDayClick} />
            </div>
          </div>
        )}
      </main>
      <TaskScheduleDialog
        open={dialogMode !== null}
        mode={dialogMode}
        onClose={() => setDialogMode(null)}
      />
      <PlannerCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onAction={handleCommandAction}
      />
    </div>
  );
};

export default Planner;

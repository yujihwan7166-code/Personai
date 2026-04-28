/**
 * 통합 플래너 — /planner 라우트.
 *
 * Phase 4: 시간 격자 인터랙션 + 시간 배정 모달.
 *
 * 단축키:
 * - n: 인박스 빠른 추가 포커스 (Day/Week 뷰)
 * - d/w/m/y: 뷰 전환
 * - Esc: 입력 blur
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Inbox } from '@/components/planner/Inbox';
import { TodayTimeline } from '@/components/planner/TodayTimeline';
import { WeekStrip } from '@/components/planner/WeekStrip';
import { WeekView } from '@/components/planner/WeekView';
import { MonthView } from '@/components/planner/MonthView';
import { YearView } from '@/components/planner/YearView';
import { ViewToggle, type PlannerView } from '@/components/planner/ViewToggle';
import { TaskScheduleDialog } from '@/components/planner/TaskScheduleDialog';

type DialogMode =
  | { kind: 'schedule'; taskId: string; initialTitle: string; initialStart?: string; initialEnd?: string }
  | { kind: 'create'; presetStartIso: string };

const Planner = () => {
  const navigate = useNavigate();
  const inboxInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<PlannerView>('day');
  const [anchorIso, setAnchorIso] = useState(() => new Date().toISOString());
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  const handleDayClick = useCallback((dayIso: string) => {
    setAnchorIso(dayIso);
    setView('day');
  }, []);

  const handleMonthClick = useCallback((monthIso: string) => {
    setAnchorIso(monthIso);
    setView('month');
  }, []);

  const handleInboxClick = useCallback((task: { id: string; title: string }) => {
    setDialogMode({ kind: 'schedule', taskId: task.id, initialTitle: task.title });
  }, []);

  const handleSlotClick = useCallback((slotIso: string) => {
    setDialogMode({ kind: 'create', presetStartIso: slotIso });
  }, []);

  const handleItemClick = useCallback(
    (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => {
      // v1: task 만 편집. event 는 클릭 무시 (Phase 5 에서 별도 모달).
      if (item.kind === 'task') {
        setDialogMode({
          kind: 'schedule',
          taskId: item.id,
          initialTitle: item.title,
          initialStart: item.startAt,
          initialEnd: item.endAt,
        });
      }
    },
    [],
  );

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      // 모달 열려 있으면 단축키 비활성.
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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, dialogMode]);

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
          </div>
          <p className="hidden md:block text-[11px] text-muted-foreground font-mono uppercase tracking-[0.16em] font-medium">
            {view === 'day' || view === 'week' ? 'n · 빠른추가  ·  ' : ''}d/w/m/y · 뷰
          </p>
        </header>

        {isFullscreen ? (
          <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 sm:p-4 h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)]">
            {view === 'month' && (
              <MonthView anchorIso={anchorIso} onDayClick={handleDayClick} />
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
              <Inbox inputRef={inboxInputRef} onTaskClick={handleInboxClick} />
            </div>
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 sm:p-4 min-h-0">
              {view === 'day' && (
                <TodayTimeline
                  dateIso={anchorIso}
                  onItemClick={handleItemClick}
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === 'week' && <WeekView anchorIso={anchorIso} />}
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
    </div>
  );
};

export default Planner;

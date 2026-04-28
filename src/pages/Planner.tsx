/**
 * 통합 플래너 — /planner 라우트.
 *
 * Phase 3: Day/Week/Month/Year 4 뷰 토글 + 풀화면 모드 (Month/Year).
 *
 * 단축키:
 * - n: 인박스 빠른 추가 포커스 (Day/Week 뷰에서만)
 * - d/w/m/y: 뷰 전환
 * - Esc: 입력 blur (PlannerInput 내부 처리)
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

const Planner = () => {
  const navigate = useNavigate();
  const inboxInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<PlannerView>('day');
  const [anchorIso, setAnchorIso] = useState(() => new Date().toISOString());

  const handleDayClick = useCallback((dayIso: string) => {
    setAnchorIso(dayIso);
    setView('day');
  }, []);

  const handleMonthClick = useCallback((monthIso: string) => {
    setAnchorIso(monthIso);
    setView('month');
  }, []);

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

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
  }, [view]);

  const isFullscreen = view === 'month' || view === 'year';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 py-7 max-w-[1400px] w-full mx-auto">
        <header className="mb-6 flex items-end justify-between gap-3 pb-4 border-b-2 border-[hsl(var(--hairline))]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.16em]"
              aria-label="메인으로"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>메인</span>
            </button>
            <h1 className="text-[26px] font-semibold tracking-tight leading-none">통합 플래너</h1>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <p className="text-[11px] text-muted-foreground/70 font-mono uppercase tracking-[0.16em]">
            {view === 'day' || view === 'week' ? 'n · 빠른추가  ·  ' : ''}d/w/m/y · 뷰
          </p>
        </header>

        {isFullscreen ? (
          // 풀화면 모드 (Month / Year)
          <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-4 h-[calc(100vh-180px)]">
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
          // 3 컬럼 (Day / Week)
          <div className="grid grid-cols-[300px_1fr_280px] gap-4 h-[calc(100vh-180px)]">
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-4 min-h-0">
              <Inbox inputRef={inboxInputRef} />
            </div>
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-4 min-h-0">
              {view === 'day' && <TodayTimeline dateIso={anchorIso} />}
              {view === 'week' && <WeekView anchorIso={anchorIso} />}
            </div>
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-4 min-h-0">
              <WeekStrip anchorIso={anchorIso} onDayClick={handleDayClick} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Planner;

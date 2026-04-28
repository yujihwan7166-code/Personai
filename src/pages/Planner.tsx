/**
 * 통합 플래너 — /planner 라우트.
 *
 * Phase 1: 3 컬럼 골격 (Inbox / TodayTimeline / WeekStrip).
 * 데이터 store 연결 OK. 디자인 디테일·인터랙션은 Phase 2-4.
 *
 * 단축키:
 * - n: 인박스 빠른 추가 포커스
 * - t: 오늘로 (현재는 no-op, Phase 4 에서 시간표 스크롤)
 * - Esc: 입력 blur (PlannerInput 내부 처리)
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Inbox } from '@/components/planner/Inbox';
import { TodayTimeline } from '@/components/planner/TodayTimeline';
import { WeekStrip } from '@/components/planner/WeekStrip';

const Planner = () => {
  const navigate = useNavigate();
  const inboxInputRef = useRef<HTMLInputElement>(null);

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 입력 중이면 단축키 비활성.
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      if (e.key === 'n') {
        e.preventDefault();
        inboxInputRef.current?.focus();
      }
      // 't' 는 Phase 4 에서 시간표 스크롤 to now.
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
        <header className="mb-4 flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.16em]"
              aria-label="메인으로"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>메인</span>
            </button>
            <h1 className="text-2xl font-semibold tracking-tight">통합 플래너</h1>
          </div>
          <p className="text-[11px] text-muted-foreground/70 font-mono uppercase tracking-[0.16em]">
            n · 빠른추가
          </p>
        </header>
        <div className="grid grid-cols-[280px_1fr_280px] gap-4 h-[calc(100vh-180px)]">
          <div className="rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 min-h-0">
            <Inbox inputRef={inboxInputRef} />
          </div>
          <div className="rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 min-h-0">
            <TodayTimeline />
          </div>
          <div className="rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 min-h-0">
            <WeekStrip />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Planner;

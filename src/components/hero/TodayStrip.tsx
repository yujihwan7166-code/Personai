/**
 * 오늘 스트립 — 히어로 하단 "내 상태" 한 줄 (2026-07-05 홈화면 계획 ②).
 *
 * [다음 일정 14:00 팀 미팅 · 30분 후] · [할일 3] · [데일리 브리핑 →]
 * 고스트 텍스트 밀도 — 기능 레일보다 한 단계 더 조용하게. 클릭 시 플래너 /
 * 브리핑으로. 일정·할일이 모두 없으면 "오늘 일정 없음"으로 비어있음도
 * 정직하게 (홈은 신뢰로 이긴다).
 */
import { CalendarDays, CheckCircle2, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUpcomingEvent } from '@/hooks/planner/useUpcomingEvent';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';

function minutesUntil(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const min = Math.round(diff / 60_000);
  if (min < 60) return `${min}분 후`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 후`;
  return null; // 내일 이후 일정은 카운트다운 생략
}

export function TodayStrip() {
  const navigate = useNavigate();
  const nextEvent = useUpcomingEvent();
  const todayTasks = useTodayTasks();

  const eventTime = nextEvent
    ? new Date(nextEvent.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;
  const countdown = nextEvent ? minutesUntil(nextEvent.startAt) : null;

  const itemCls =
    'group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150 hover:bg-black/[0.045]';

  return (
    <div
      className="mt-5 hidden items-center justify-center gap-1 md:flex animate-in fade-in duration-500"
      role="navigation"
      aria-label="오늘 요약"
      style={{ color: 'var(--hero-fg-muted)' }}
    >
      {/* 다음 일정 */}
      <button type="button" onClick={() => navigate('/planner')} className={itemCls} title="플래너 열기">
        <CalendarDays size={12.5} strokeWidth={2} className="opacity-70" />
        {nextEvent ? (
          <span className="max-w-[220px] truncate">
            <span className="tabular-nums" style={{ color: 'var(--hero-fg)' }}>{eventTime}</span>
            {' '}{nextEvent.title}
            {countdown && <span className="opacity-70"> · {countdown}</span>}
          </span>
        ) : (
          <span>오늘 일정 없음</span>
        )}
      </button>

      <span aria-hidden className="h-3 w-px" style={{ backgroundColor: 'var(--hero-hairline)' }} />

      {/* 오늘 할일 */}
      <button type="button" onClick={() => navigate('/planner')} className={itemCls} title="할일 보기">
        <CheckCircle2 size={12.5} strokeWidth={2} className="opacity-70" />
        <span>
          할일{' '}
          <span className="tabular-nums font-semibold" style={{ color: 'var(--hero-fg)' }}>
            {todayTasks.length}
          </span>
        </span>
      </button>

      <span aria-hidden className="h-3 w-px" style={{ backgroundColor: 'var(--hero-hairline)' }} />

      {/* 데일리 브리핑 */}
      <button
        type="button"
        onClick={() => {
          void import('@/components/DailyBriefingMount').then(({ triggerDailyBriefing }) => {
            triggerDailyBriefing();
          });
        }}
        className={itemCls}
        title="AI 가 요약해주는 오늘"
      >
        <Coffee size={12.5} strokeWidth={2} className="opacity-70" />
        <span>브리핑</span>
        <span aria-hidden className="opacity-60 transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
}

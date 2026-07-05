/**
 * 오늘 스트립 — 히어로 하단 "내 상태" 한 줄 (2026-07-05 홈화면 계획 ②).
 *
 * [다음 일정] · [할일 n] · (날씨 팁) · [브리핑 →]
 * 고스트 텍스트 밀도 — 기능 레일보다 한 단계 더 조용하게.
 *
 * 일정·할일은 클릭 시 페이지 이동 대신 hover 플로팅 프리뷰로 그 자리에서
 * 훑어보고(2026-07-05), 팝오버 하단 "플래너 열기 →" 에서만 이동. 날씨 팁은
 * 우상단 TodayCluster 와 중복 회피 위해 행동 제안만 (비·눈·미세먼지·극한 기온).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CalendarDays, CheckCircle2, Coffee, ArrowRight,
  Umbrella, Wind, Snowflake, Thermometer, type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUpcomingEvent } from '@/hooks/planner/useUpcomingEvent';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { eventStore } from '@/services/planner/eventStore';
import { PLANNER_EVENT_CHANGED, type PlannerEvent } from '@/types/planner';
import { fetchWeatherNow, type WeatherNow } from '@/services/weatherService';

function minutesUntil(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const min = Math.round(diff / 60_000);
  if (min < 60) return `${min}분 후`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 후`;
  return null;
}

/** 날씨 → 행동 팁. 특별한 상황일 때만, 평범하면 null. */
function weatherTip(w: WeatherNow): { label: string; icon: LucideIcon } | null {
  if (w.dust && w.dust.label.includes('나쁨')) return { label: '미세먼지 나쁨 · 마스크 챙기세요', icon: Wind };
  if (w.icon === 'rain' || w.icon === 'storm') return { label: '비 소식 · 우산 챙기세요', icon: Umbrella };
  if (w.icon === 'snow') return { label: '눈 · 미끄럼 주의', icon: Snowflake };
  if (w.temp <= 3) return { label: '쌀쌀해요 · 외투 챙기세요', icon: Thermometer };
  if (w.temp >= 30) return { label: '무더위 · 수분 보충하세요', icon: Thermometer };
  return null;
}

const itemCls =
  'group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-black/[0.045]';

/** hover 프리뷰 래퍼 — 트리거 위에 글래스 팝오버 (150ms 지연, 벗어나면 닫힘). */
function HoverPreview({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const enterRef = useRef<number | null>(null);
  const leaveRef = useRef<number | null>(null);
  const openSoon = () => {
    if (leaveRef.current) window.clearTimeout(leaveRef.current);
    enterRef.current = window.setTimeout(() => setOpen(true), 150);
  };
  const closeSoon = () => {
    if (enterRef.current) window.clearTimeout(enterRef.current);
    leaveRef.current = window.setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => {
    if (enterRef.current) window.clearTimeout(enterRef.current);
    if (leaveRef.current) window.clearTimeout(leaveRef.current);
  }, []);
  return (
    <div className="relative" onMouseEnter={openSoon} onMouseLeave={closeSoon}>
      {trigger}
      {open && (
        // 바깥 div — 중앙정렬(transform)만 담당. 애니메이션은 안쪽이라
        // animate-in 키프레임이 translateX(-50%) 를 덮어쓰지 않음 (제자리 fade).
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
          <div
            role="tooltip"
            className="w-64 rounded-xl border p-2 animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 94%, transparent)',
              borderColor: 'var(--hero-hairline, rgba(0,0,0,0.08))',
              backdropFilter: 'blur(18px) saturate(160%)',
              WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              boxShadow: '0 16px 40px -14px rgba(0,0,0,0.28)',
              color: 'var(--hero-fg)',
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function TodayStrip() {
  const navigate = useNavigate();
  const nextEvent = useUpcomingEvent();
  const todayTasks = useTodayTasks();

  // 오늘 일정 목록 — 팝오버 프리뷰용 (PLANNER_EVENT_CHANGED 구독).
  const [todayEvents, setTodayEvents] = useState<PlannerEvent[]>([]);
  useEffect(() => {
    const refresh = () => setTodayEvents(eventStore.listByDate(new Date().toISOString()));
    refresh();
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
  }, []);

  // 날씨 행동 팁 (weatherService 30분 캐시 재사용).
  const [tip, setTip] = useState<{ label: string; icon: LucideIcon } | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchWeatherNow().then((w) => { if (alive && w) setTip(weatherTip(w)); });
    return () => { alive = false; };
  }, []);

  const eventTime = nextEvent
    ? new Date(nextEvent.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;
  const countdown = nextEvent ? minutesUntil(nextEvent.startAt) : null;
  const divider = <span aria-hidden className="h-3 w-px shrink-0" style={{ backgroundColor: 'var(--hero-hairline)' }} />;

  // 팝오버 공통 푸터 — 플래너 열기 (유일한 페이지 이동 지점).
  const plannerFooter = (
    <button
      type="button"
      onClick={() => navigate('/planner')}
      className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11.5px] font-semibold transition-colors hover:bg-black/[0.04]"
      style={{ color: 'var(--hero-accent)' }}
    >
      플래너 열기 <ArrowRight size={12} strokeWidth={2.4} />
    </button>
  );

  return (
    <div
      className="mt-6 hidden items-center justify-center gap-1 md:flex animate-in fade-in duration-500"
      role="navigation"
      aria-label="오늘 요약"
      style={{ color: 'var(--hero-fg-muted)' }}
    >
      {/* 다음 일정 — hover 시 오늘 일정 목록 프리뷰. */}
      <HoverPreview
        trigger={
          <button type="button" className={itemCls}>
            <CalendarDays size={13} strokeWidth={2} className="opacity-70" />
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
        }
      >
        <div className="px-1 pb-1 pt-0.5 text-[10.5px] font-semibold tracking-wide text-[color:var(--hero-fg-muted)]">오늘 일정</div>
        {todayEvents.length > 0 ? (
          <div className="space-y-0.5">
            {todayEvents.slice(0, 5).map((e) => {
              const t = new Date(e.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const passed = new Date(e.startAt).getTime() < Date.now();
              return (
                <div key={e.id} className="flex items-baseline gap-2 rounded-md px-1 py-1 text-[12px]" style={{ opacity: passed ? 0.5 : 1 }}>
                  <span className="shrink-0 tabular-nums font-medium" style={{ color: 'var(--hero-accent)' }}>{t}</span>
                  <span className="min-w-0 truncate" style={{ color: 'var(--hero-fg)' }}>{e.title}</span>
                </div>
              );
            })}
            {todayEvents.length > 5 && (
              <div className="px-1 text-[10.5px]" style={{ color: 'var(--hero-fg-muted)' }}>외 {todayEvents.length - 5}개</div>
            )}
          </div>
        ) : (
          <div className="px-1 py-2 text-center text-[11.5px]" style={{ color: 'var(--hero-fg-muted)' }}>오늘 일정이 없어요</div>
        )}
        {plannerFooter}
      </HoverPreview>

      {divider}

      {/* 오늘 할일 — hover 시 미완료 할일 목록 프리뷰. */}
      <HoverPreview
        trigger={
          <button type="button" className={itemCls}>
            <CheckCircle2 size={13} strokeWidth={2} className="opacity-70" />
            <span>
              할일{' '}
              <span className="tabular-nums font-semibold" style={{ color: 'var(--hero-fg)' }}>{todayTasks.length}</span>
            </span>
          </button>
        }
      >
        <div className="px-1 pb-1 pt-0.5 text-[10.5px] font-semibold tracking-wide text-[color:var(--hero-fg-muted)]">오늘 할일</div>
        {todayTasks.length > 0 ? (
          <div className="space-y-0.5">
            {todayTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-[12px]">
                <span className="h-3.5 w-3.5 shrink-0 rounded-[5px] border" style={{ borderColor: 'var(--hero-hairline)' }} />
                <span className="min-w-0 truncate" style={{ color: 'var(--hero-fg)' }}>{t.title}</span>
              </div>
            ))}
            {todayTasks.length > 5 && (
              <div className="px-1 text-[10.5px]" style={{ color: 'var(--hero-fg-muted)' }}>외 {todayTasks.length - 5}개</div>
            )}
          </div>
        ) : (
          <div className="px-1 py-2 text-center text-[11.5px]" style={{ color: 'var(--hero-fg-muted)' }}>할일이 없어요</div>
        )}
        {plannerFooter}
      </HoverPreview>

      {/* 날씨 행동 팁 — 특별한 날에만 (정보 표시, 비클릭). */}
      {tip && (
        <>
          {divider}
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ color: 'var(--hero-fg)' }}
          >
            <tip.icon size={13} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} className="opacity-80" />
            {tip.label}
          </span>
        </>
      )}

      {divider}

      {/* 데일리 브리핑 — 클릭 시 실제 브리핑 (프리뷰 대상 아님). */}
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
        <Coffee size={13} strokeWidth={2} className="opacity-70" />
        <span>브리핑</span>
        <span aria-hidden className="opacity-60 transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
}

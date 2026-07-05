/**
 * 오늘 스트립 — 히어로 하단 "내 상태" 한 줄 (2026-07-05 홈화면 계획 ②).
 *
 * [다음 일정] · [할일 n] · [일기] · [브리핑 →] · (날씨 팁, 조건부)
 * 고스트 텍스트 밀도 — 기능 레일보다 한 단계 더 조용하게. 클릭 시 플래너·
 * 일기·브리핑으로. 비어있음도 정직하게 (홈은 신뢰로 이긴다).
 *
 * 날씨 팁은 우상단 TodayCluster(정적 기온·미세먼지)와 중복을 피해 "행동
 * 제안"만: 비·눈·미세먼지·극한 기온일 때만 뜨고 평범하면 생략.
 */
import { useEffect, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Coffee, NotebookPen,
  Umbrella, Wind, Snowflake, Thermometer, type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUpcomingEvent } from '@/hooks/planner/useUpcomingEvent';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { journalStore } from '@/services/journalStore';
import { JOURNAL_CHANGED } from '@/types/journal';
import { fetchWeatherNow, type WeatherNow } from '@/services/weatherService';

function minutesUntil(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const min = Math.round(diff / 60_000);
  if (min < 60) return `${min}분 후`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 후`;
  return null; // 내일 이후 일정은 카운트다운 생략
}

/** 날씨 → 행동 팁. 특별한 상황일 때만, 평범하면 null (항목 생략). */
function weatherTip(w: WeatherNow): { label: string; icon: LucideIcon } | null {
  if (w.dust && w.dust.label.includes('나쁨')) return { label: '미세먼지 나쁨 · 마스크 챙기세요', icon: Wind };
  if (w.icon === 'rain' || w.icon === 'storm') return { label: '비 소식 · 우산 챙기세요', icon: Umbrella };
  if (w.icon === 'snow') return { label: '눈 · 미끄럼 주의', icon: Snowflake };
  if (w.temp <= 3) return { label: '쌀쌀해요 · 외투 챙기세요', icon: Thermometer };
  if (w.temp >= 30) return { label: '무더위 · 수분 보충하세요', icon: Thermometer };
  return null;
}

export function TodayStrip() {
  const navigate = useNavigate();
  const nextEvent = useUpcomingEvent();
  const todayTasks = useTodayTasks();

  // 오늘 일기 작성 여부 — JOURNAL_CHANGED 구독.
  const [wroteToday, setWroteToday] = useState(false);
  useEffect(() => {
    const refresh = () => setWroteToday(!!journalStore.getLatestToday());
    refresh();
    window.addEventListener(JOURNAL_CHANGED, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED, refresh);
  }, []);

  // 날씨 — 행동 팁만 (weatherService 30분 캐시 재사용).
  const [tip, setTip] = useState<{ label: string; icon: LucideIcon } | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchWeatherNow().then((w) => {
      if (alive && w) setTip(weatherTip(w));
    });
    return () => { alive = false; };
  }, []);

  const eventTime = nextEvent
    ? new Date(nextEvent.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;
  const countdown = nextEvent ? minutesUntil(nextEvent.startAt) : null;

  const itemCls =
    'group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150 hover:bg-black/[0.045]';
  const divider = <span aria-hidden className="h-3 w-px shrink-0" style={{ backgroundColor: 'var(--hero-hairline)' }} />;

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

      {divider}

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

      {divider}

      {/* 오늘 일기 — 썼으면 성취 표시, 안 썼으면 쓰기 유도. */}
      <button type="button" onClick={() => navigate('/journal')} className={itemCls} title="일기">
        <NotebookPen size={12.5} strokeWidth={2} className="opacity-70" />
        {wroteToday ? (
          <span>
            오늘 일기{' '}
            <span className="font-semibold" style={{ color: 'var(--hero-accent)' }}>✓</span>
          </span>
        ) : (
          <span>
            일기 쓰기
            <span aria-hidden className="ml-1 opacity-60 transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </span>
        )}
      </button>

      {divider}

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

      {/* 날씨 행동 팁 — 특별한 날에만 (정보 표시, 비클릭). */}
      {tip && (
        <>
          {divider}
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
            style={{ color: 'var(--hero-fg)' }}
          >
            <tip.icon size={12.5} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} className="opacity-80" />
            {tip.label}
          </span>
        </>
      )}
    </div>
  );
}

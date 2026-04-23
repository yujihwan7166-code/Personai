/**
 * 컨텍스트 스트립 — 빠른검색 아래 날씨·시간·달력 3분할.
 *
 * 레이아웃:
 *   ┌───────┬──────────────┐
 *   │ ☀️ 12°│  11월  (월뷰) │
 *   │ 맑음   │  일월화수목금토 │
 *   ├───────┤  1  2  3 ...  │
 *   │ 14:32 │  ...      26  │
 *   │ 수요일 │               │
 *   └───────┴──────────────┘
 *
 * 왼쪽: 날씨(위) / 시간(아래) 2단 스택
 * 오른쪽: 이번 달 미니 월뷰 (펼친 채 상시 노출)
 */
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const SEOUL_TZ = 'Asia/Seoul';
const SEOUL_COORD = { lat: 37.5665, lon: 126.9780 };

export function ContextStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_1.6fr] gap-1.5',
        className,
      )}
    >
      {/* 왼쪽: 날씨(위) + 시간(아래) */}
      <div className="grid grid-rows-2 gap-1.5">
        <WeatherCell />
        <TimeCell />
      </div>
      {/* 오른쪽: 달력 세로 길게 (2행 span) */}
      <CalendarCell />
    </div>
  );
}

// ── 날씨 ───────────────────────────────────────────────
function WeatherCell() {
  const [data, setData] = useState<{ temp: number; code: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let canceled = false;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL_COORD.lat}&longitude=${SEOUL_COORD.lon}&current=temperature_2m,weather_code`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (canceled) return;
        if (j?.current) setData({ temp: j.current.temperature_2m, code: j.current.weather_code });
        else setErr(true);
      })
      .catch(() => { if (!canceled) setErr(true); });
    return () => { canceled = true; };
  }, []);
  const icon = weatherIcon(data?.code ?? -1);
  const label = weatherLabel(data?.code ?? -1);
  return (
    <CellFrame>
      <div className="flex items-center justify-between">
        <span className="text-[11px]" aria-hidden>{icon}</span>
        <span className="text-[9px] font-mono text-muted-foreground/70">서울</span>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[15px] font-semibold tabular-nums leading-tight">
          {err ? '—' : data ? `${Math.round(data.temp)}°` : '…'}
        </span>
        <span className="text-[9px] text-muted-foreground leading-tight truncate">{label}</span>
      </div>
    </CellFrame>
  );
}

function weatherIcon(code: number): string {
  if (code < 0) return '·';
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '☁️';
}
function weatherLabel(code: number): string {
  if (code < 0) return '—';
  if (code === 0) return '맑음';
  if (code <= 3) return '구름';
  if (code <= 48) return '안개';
  if (code <= 67) return '비';
  if (code <= 77) return '눈';
  if (code <= 82) return '소나기';
  if (code <= 99) return '뇌우';
  return '흐림';
}

// ── 시간 + 요일 ────────────────────────────────────────
function TimeCell() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const { time, weekday } = useMemo(() => {
    const time = new Intl.DateTimeFormat('ko-KR', { timeZone: SEOUL_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: SEOUL_TZ, weekday: 'long' }).format(now);
    return { time, weekday };
  }, [now]);
  return (
    <CellFrame>
      <div className="flex items-center justify-between">
        <span className="text-[10px]" aria-hidden>🕐</span>
        <span className="text-[9px] font-mono text-muted-foreground/70">{weekday}</span>
      </div>
      <div className="text-[15px] font-mono font-semibold tabular-nums leading-tight mt-0.5">
        {time}
      </div>
    </CellFrame>
  );
}

// ── 달력 (상시 노출 월뷰) ──────────────────────────────
function CalendarCell() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <CellFrame className="px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-mono font-semibold">
          {y}. {m + 1}
        </span>
        <span className="text-[9px] text-muted-foreground">오늘 {today}일</span>
      </div>
      <div className="grid grid-cols-7 gap-[1px] text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
          <div
            key={w}
            className={cn(
              'text-[8px] font-mono leading-none py-0.5',
              i === 0 ? 'text-rose-500/80' : i === 6 ? 'text-blue-500/80' : 'text-muted-foreground/80',
            )}
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          const col = i % 7;
          const isToday = d === today;
          return (
            <div
              key={i}
              className={cn(
                'text-[9px] tabular-nums h-3.5 flex items-center justify-center rounded-[3px] leading-none',
                isToday && 'bg-primary text-primary-foreground font-semibold',
                d !== null && !isToday && col === 0 && 'text-rose-500/80',
                d !== null && !isToday && col === 6 && 'text-blue-500/80',
                d !== null && !isToday && col > 0 && col < 6 && 'text-foreground/85',
              )}
            >
              {d ?? ''}
            </div>
          );
        })}
      </div>
    </CellFrame>
  );
}

// ── 공통 셀 프레임 ─────────────────────────────────────
function CellFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
        'px-2 py-1.5 min-w-0',
        'transition-colors hover:border-[hsl(var(--border))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

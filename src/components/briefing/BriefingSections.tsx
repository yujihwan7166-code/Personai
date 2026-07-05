/**
 * 브리핑 섹션 카드들 — AI 문단 아래 오늘 구성 요소 (2026-07-05 v5).
 *
 * 고정 순서(BRIEFING_SECTIONS), 설정 on + 데이터 있을 때만 렌더. 글래스 톤.
 * 데이터는 dailyBriefingNarrative 가 넘겨준 BriefingData + WeatherNow.
 */
import type { ReactNode } from 'react';
import {
  CalendarDays, CheckCircle2, Circle, AlertCircle, Flag, Flame,
  Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, type LucideIcon,
} from 'lucide-react';
import type { BriefingData } from '@/lib/buildBriefingData';
import type { WeatherNow } from '@/services/weatherService';

const WEATHER_ICONS: Record<WeatherNow['icon'], LucideIcon> = {
  sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
};

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 섹션 래퍼 — 라벨 + 내용, 얇은 카드. */
function Section({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border px-3.5 py-3"
      style={{
        borderColor: 'var(--hero-hairline, rgba(0,0,0,0.07))',
        backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 55%, transparent)',
      }}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--hero-fg-muted)' }}>{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--hero-fg-muted)', opacity: 0.7 }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function ScheduleSection({ data }: { data: BriefingData }) {
  const events = data.timed;
  if (events.length === 0) return null;
  const nowMs = Date.now();
  return (
    <Section label="오늘 일정" count={events.length}>
      <div className="space-y-1.5">
        {events.slice(0, 5).map((e, i) => {
          const passed = new Date(e.startAt).getTime() < nowMs && !(e.kind === 'task' && !e.done);
          return (
            <div key={`${e.startAt}-${i}`} className="flex items-baseline gap-2.5" style={{ opacity: passed ? 0.45 : 1 }}>
              <span className="w-[42px] shrink-0 text-[12.5px] font-semibold tabular-nums" style={{ color: 'var(--hero-accent)' }}>{hm(e.startAt)}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: 'var(--hero-fg)' }}>{e.title}</span>
              {e.kind === 'task' && (
                <span className="shrink-0 text-[10px]" style={{ color: 'var(--hero-fg-muted)' }}>할일</span>
              )}
            </div>
          );
        })}
        {events.length > 5 && <div className="text-[11px]" style={{ color: 'var(--hero-fg-muted)' }}>외 {events.length - 5}개</div>}
      </div>
    </Section>
  );
}

export function TasksSection({ data }: { data: BriefingData }) {
  const total = data.inbox.length + data.overdue.length;
  if (total === 0) return null;
  return (
    <Section label="할일" count={total}>
      <div className="space-y-1.5">
        {data.overdue.slice(0, 3).map((t) => (
          <div key={`o-${t.id}`} className="flex items-center gap-2">
            <AlertCircle size={14} strokeWidth={2} className="shrink-0" style={{ color: 'hsl(28 80% 52%)' }} />
            <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: 'var(--hero-fg)' }}>{t.title}</span>
            <span className="shrink-0 text-[10px]" style={{ color: 'hsl(28 80% 52%)' }}>어제</span>
          </div>
        ))}
        {data.inbox.slice(0, Math.max(0, 5 - Math.min(data.overdue.length, 3))).map((t) => (
          <div key={`i-${t.id}`} className="flex items-center gap-2">
            <Circle size={14} strokeWidth={2} className="shrink-0" style={{ color: 'var(--hero-fg-muted)' }} />
            <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: 'var(--hero-fg)' }}>{t.title}</span>
          </div>
        ))}
        {total > 5 && <div className="text-[11px]" style={{ color: 'var(--hero-fg-muted)' }}>외 {total - 5}개</div>}
      </div>
    </Section>
  );
}

export function WeatherSection({ weather }: { weather: WeatherNow }) {
  const WIcon = WEATHER_ICONS[weather.icon];
  return (
    <Section label="날씨">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'color-mix(in oklab, var(--hero-accent) 12%, transparent)' }}
        >
          <WIcon size={22} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--hero-fg)' }}>{weather.temp}°</span>
            <span className="text-[13px]" style={{ color: 'var(--hero-fg-muted)' }}>{weather.label}</span>
          </div>
          {weather.dust && (
            <span
              className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{ color: weather.dust.color, backgroundColor: `color-mix(in oklab, ${weather.dust.color} 12%, transparent)` }}
            >
              {weather.dust.label}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[10.5px]" style={{ color: 'var(--hero-fg-muted)', opacity: 0.7 }}>서울</span>
      </div>
    </Section>
  );
}

export function DdaySection({ data }: { data: BriefingData }) {
  if (data.upcomingDday.length === 0) return null;
  return (
    <Section label="다가오는 날" count={data.upcomingDday.length}>
      <div className="space-y-1.5">
        {data.upcomingDday.slice(0, 4).map((d, i) => (
          <div key={`${d.label}-${i}`} className="flex items-center gap-2">
            <Flag size={13} strokeWidth={2} className="shrink-0" style={{ color: 'var(--hero-accent)' }} />
            <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: 'var(--hero-fg)' }}>{d.label}</span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: 'var(--hero-accent)' }}>
              {d.daysLeft === 0 ? 'D-day' : `D-${d.daysLeft}`}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function HabitsSection({ data }: { data: BriefingData }) {
  if (data.habits.length === 0) return null;
  const doneCount = data.habits.filter((h) => h.done).length;
  return (
    <Section label="습관" count={undefined}>
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: 'var(--hero-fg)' }}>{doneCount}/{data.habits.length}</span>
        <span className="text-[11px]" style={{ color: 'var(--hero-fg-muted)' }}>오늘 완료</span>
      </div>
      <div className="space-y-1.5">
        {data.habits.slice(0, 5).map((h) => (
          <div key={h.id} className="flex items-center gap-2">
            {h.done
              ? <CheckCircle2 size={14} strokeWidth={2} className="shrink-0" style={{ color: 'hsl(150 55% 42%)' }} />
              : <Circle size={14} strokeWidth={2} className="shrink-0" style={{ color: 'var(--hero-fg-muted)' }} />}
            <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: 'var(--hero-fg)', opacity: h.done ? 0.55 : 1 }}>{h.title}</span>
            {h.streakAtRisk && <Flame size={12} strokeWidth={2} className="shrink-0" style={{ color: 'hsl(18 82% 55%)' }} />}
          </div>
        ))}
      </div>
    </Section>
  );
}

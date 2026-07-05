/**
 * 오늘 클러스터 — 히어로 우상단 [시각 · 요일 | 날씨 · 기온 | 미세먼지] 글래스 캡슐.
 *
 * 좌상단 ModeCapsule 과 대칭을 이루는 제로클릭 정보층 (2026-07-05 홈화면 계획 ①).
 * 동일 글래스 재질 + hero CSS 변수 — 어떤 브랜드 morph 배경에서도 성립.
 * 날씨는 weatherService (Open-Meteo, 30분 캐시), 실패 시 시계만 조용히 표시.
 */
import { useEffect, useState } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react';
import { fetchWeatherNow, type WeatherNow } from '@/services/weatherService';

const WEATHER_ICONS: Record<WeatherNow['icon'], LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function TodayCluster() {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchWeatherNow().then((w) => {
      if (alive) setWeather(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  const WIcon = weather ? WEATHER_ICONS[weather.icon] : null;

  return (
    <div
      className="flex h-[38px] w-max items-center gap-2 rounded-full border px-3"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 78%, transparent)',
        borderColor: 'var(--hero-hairline, rgba(0,0,0,0.08))',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        boxShadow: '0 4px 16px -10px rgba(0,0,0,0.18)',
        color: 'var(--hero-fg, #1e2235)',
      }}
    >
      {/* 시각 · 요일 */}
      <span className="flex items-baseline gap-1.5">
        <span className="text-[14px] font-semibold leading-none tabular-nums tracking-tight">
          {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span className="text-[10.5px] leading-none" style={{ color: 'var(--hero-fg-muted)' }}>
          {['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}
        </span>
      </span>

      {/* 날씨 — 로드 전/실패 시 조용히 생략 (시계만). */}
      {weather && WIcon && (
        <>
          <span aria-hidden className="h-3.5 w-px" style={{ backgroundColor: 'var(--hero-hairline)' }} />
          <span className="flex items-center gap-1" title={`서울 · ${weather.label}`}>
            <WIcon size={14} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} />
            <span className="text-[12.5px] font-medium leading-none tabular-nums">{weather.temp}°</span>
          </span>
          {weather.dust && (
            <span
              className="rounded-full px-1.5 py-[3px] text-[9.5px] font-semibold leading-none"
              style={{
                color: weather.dust.color,
                backgroundColor: `color-mix(in oklab, ${weather.dust.color} 12%, transparent)`,
              }}
            >
              {weather.dust.label}
            </span>
          )}
        </>
      )}
    </div>
  );
}

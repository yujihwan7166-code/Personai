/**
 * 브리핑 섹션 — 모닝 레터 스타일 (2026-07-05 v6, 탈AI 리뉴얼).
 *
 * 카드·글래스·accent 배경·아이콘을 걷어내고, 편지 속 항목처럼 얇은 구분선 +
 * 소제목 + 담백한 리스트로. 색은 잉크(--hero-fg) 위주, 강조는 최소.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudRain, Snowflake, CloudLightning, type LucideIcon } from 'lucide-react';
import type { BriefingData } from '@/lib/buildBriefingData';
import type { WeatherNow } from '@/services/weatherService';
import { fetchMarketIndices, type IndexQuote, type MarketGroup } from '@/services/marketService';
import { fetchNews, type NewsItem, type NewsTopic } from '@/services/newsService';
import { getDailyRecos, type Reco } from '@/lib/dailyRecos';
import { buildTomorrowPreview, type TomorrowPreview } from '@/lib/tomorrowPreview';

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 브리핑 카드 — 풀스크린 리치 그리드의 기본 셸 (2026-07-06 v7).
 * 따뜻한 크림 서피스 + 얇은 테두리 + 세리프 소제목. onOpen 시 제목이 점프 버튼.
 * 무지개 대시보드 톤을 피하고 편집(editorial) 느낌 유지.
 */
export function BriefingCard({ label, children, onOpen, className }: { label: string; children: ReactNode; onOpen?: () => void; className?: string }) {
  return (
    <section
      className={`rounded-2xl border p-4 ${className ?? ''}`}
      style={{
        borderColor: 'var(--briefing-card-border, hsl(30 24% 82% / 0.6))',
        background: 'var(--briefing-card-bg, hsl(40 44% 99%))',
        boxShadow: '0 1px 2px hsl(28 40% 12% / 0.04)',
      }}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="group mb-2.5 flex w-full items-center gap-1.5 text-[12px] tracking-[0.02em] transition-colors hover:text-[color:var(--hero-fg)]"
          style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}
        >
          {label}
          <span aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </button>
      ) : (
        <div className="mb-2.5 text-[12px] tracking-[0.02em]" style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}>
          {label}
        </div>
      )}
      {children}
    </section>
  );
}

/** 하위 섹션들이 쓰는 별칭 — 카드 셸과 동일. */
const LetterSection = BriefingCard;

export function ScheduleSection({ data, onOpen }: { data: BriefingData; onOpen?: () => void }) {
  if (data.timed.length === 0) return null;
  const nowMs = Date.now();
  return (
    <LetterSection label="오늘 일정" onOpen={onOpen}>
      <ul className="space-y-1.5">
        {data.timed.slice(0, 6).map((e, i) => {
          const passed = new Date(e.startAt).getTime() < nowMs && !(e.kind === 'task' && !e.done);
          return (
            <li key={`${e.startAt}-${i}`} className="flex items-baseline gap-3" style={{ opacity: passed ? 0.4 : 1 }}>
              <span className="w-[46px] shrink-0 text-[14px] tabular-nums" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)' }}>{hm(e.startAt)}</span>
              <span className="min-w-0 flex-1 truncate text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>{e.title}</span>
              {e.kind === 'task' && <span className="shrink-0 text-[11px] italic" style={{ color: 'var(--hero-fg-muted)' }}>할일</span>}
            </li>
          );
        })}
        {data.timed.length > 6 && <li className="text-[12px] italic" style={{ color: 'var(--hero-fg-muted)' }}>그리고 {data.timed.length - 6}개 더</li>}
      </ul>
    </LetterSection>
  );
}

export function TasksSection({ data, onOpen }: { data: BriefingData; onOpen?: () => void }) {
  const total = data.inbox.length + data.overdue.length;
  if (total === 0) return null;
  return (
    <LetterSection label="할일" onOpen={onOpen}>
      <ul className="space-y-1.5">
        {data.overdue.slice(0, 3).map((t) => (
          <li key={`o-${t.id}`} className="flex items-baseline gap-2.5 text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>
            <span className="shrink-0" style={{ color: 'var(--hero-fg-muted)' }}>·</span>
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            <span className="shrink-0 text-[11px] italic" style={{ color: 'hsl(18 60% 48%)' }}>어제</span>
          </li>
        ))}
        {data.inbox.slice(0, Math.max(0, 6 - Math.min(data.overdue.length, 3))).map((t) => (
          <li key={`i-${t.id}`} className="flex items-baseline gap-2.5 text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>
            <span className="shrink-0" style={{ color: 'var(--hero-fg-muted)' }}>·</span>
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
          </li>
        ))}
        {total > 6 && <li className="text-[12px] italic" style={{ color: 'var(--hero-fg-muted)' }}>그리고 {total - 6}개 더</li>}
      </ul>
    </LetterSection>
  );
}

/** 날씨 아이콘 + 날씨별 은은한 그라데이션 (무지개 지양, 톤온톤). */
const WEATHER_ICON: Record<WeatherNow['icon'], LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
};

const WEATHER_GRADIENT: Record<WeatherNow['icon'], string> = {
  sun: 'linear-gradient(135deg, hsl(38 70% 92%), hsl(30 60% 88%))',
  'cloud-sun': 'linear-gradient(135deg, hsl(40 45% 93%), hsl(210 30% 90%))',
  cloud: 'linear-gradient(135deg, hsl(215 24% 92%), hsl(30 18% 91%))',
  fog: 'linear-gradient(135deg, hsl(210 14% 92%), hsl(210 10% 88%))',
  rain: 'linear-gradient(135deg, hsl(212 40% 90%), hsl(220 32% 86%))',
  snow: 'linear-gradient(135deg, hsl(205 45% 95%), hsl(210 30% 91%))',
  storm: 'linear-gradient(135deg, hsl(250 22% 90%), hsl(220 24% 86%))',
};

/** 날씨 스트립 — 상단의 납작한 정보 밀도 높은 스트립. 우측에 오늘 요약 칩. */
export function WeatherHero({ weather, stats }: { weather: WeatherNow; stats?: { label: string; value: string }[] }) {
  const Icon = WEATHER_ICON[weather.icon];
  return (
    <section
      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border px-5 py-3"
      style={{
        borderColor: 'var(--briefing-card-border, hsl(30 24% 82% / 0.7))',
        background: WEATHER_GRADIENT[weather.icon],
        boxShadow: '0 1px 2px hsl(28 40% 12% / 0.05)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={30} strokeWidth={1.5} style={{ color: 'hsl(28 30% 32%)' }} className="shrink-0" />
        <span className="text-[30px] leading-none tabular-nums" style={{ color: 'hsl(28 30% 24%)', fontFamily: 'var(--briefing-serif)', fontWeight: 700 }}>{weather.temp}°</span>
        <span className="text-[14px]" style={{ color: 'hsl(28 22% 34%)' }}>{weather.label}</span>
        {weather.dust && (
          <span className="rounded-full px-2 py-0.5 text-[12px]" style={{ backgroundColor: 'hsl(0 0% 100% / 0.55)', color: weather.dust.color }}>{weather.dust.label}</span>
        )}
        <span className="text-[12px]" style={{ color: 'hsl(28 18% 44%)' }}>서울</span>
      </div>
      {stats && stats.length > 0 && (
        <div className="ml-auto flex items-center gap-x-4 gap-y-1">
          {stats.map((s) => (
            <span key={s.label} className="flex items-baseline gap-1.5 text-[13px]" style={{ color: 'hsl(28 22% 34%)' }}>
              <span style={{ color: 'hsl(28 16% 48%)' }}>{s.label}</span>
              <span className="tabular-nums" style={{ fontFamily: 'var(--briefing-serif)', fontWeight: 700 }}>{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

const MARKET_GROUP_ORDER: MarketGroup[] = ['지수', '환율', '코인', '관심 종목'];

export function StocksSection({ watch = [] }: { watch?: string[] }) {
  const [indices, setIndices] = useState<IndexQuote[] | null>(null);
  const watchKey = watch.join(',');
  useEffect(() => {
    let alive = true;
    void fetchMarketIndices(watchKey ? watchKey.split(',') : []).then((r) => { if (alive) setIndices(r); });
    return () => { alive = false; };
  }, [watchKey]);
  // 로딩 전(null) 이나 데이터 없음([]) 이면 섹션 자체 생략.
  if (!indices || indices.length === 0) return null;
  // 한국 관례 — 상승 빨강, 하락 파랑, 보합 잉크.
  const colorOf = (pct: number) => (pct > 0 ? 'hsl(0 65% 50%)' : pct < 0 ? 'hsl(215 70% 50%)' : 'var(--hero-fg-muted)');
  const groups = MARKET_GROUP_ORDER.map((g) => ({ g, items: indices.filter((q) => q.group === g) })).filter((x) => x.items.length > 0);
  return (
    <LetterSection label="시장">
      <div className="space-y-3">
        {groups.map(({ g, items }) => (
          <div key={g}>
            {groups.length > 1 && (
              <div className="mb-1 text-[11px] tracking-[0.02em]" style={{ color: 'var(--hero-fg-muted)' }}>{g}</div>
            )}
            <ul className="space-y-1.5">
              {items.map((q) => (
                <li key={`${g}-${q.name}`} className="flex items-baseline gap-2.5 text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>
                  <span className="min-w-0 flex-1 truncate">{q.name}</span>
                  <span className="shrink-0 tabular-nums" style={{ fontFamily: 'var(--briefing-serif)' }}>
                    {q.price.toLocaleString('ko-KR', { maximumFractionDigits: q.price < 100 ? 2 : 0 })}
                  </span>
                  <span className="w-[64px] shrink-0 text-right text-[12.5px] tabular-nums" style={{ color: colorOf(q.changePct) }}>
                    {q.changePct > 0 ? '▲' : q.changePct < 0 ? '▼' : '·'} {Math.abs(q.changePct).toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </LetterSection>
  );
}

export function NewsSection({ topic = 'headline', topicLabel }: { topic?: NewsTopic; topicLabel?: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    setItems(null);
    void fetchNews(topic).then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, [topic]);
  if (!items || items.length === 0) return null;
  return (
    <LetterSection label={topicLabel ? `오늘의 소식 · ${topicLabel}` : '오늘의 소식'}>
      <ul className="space-y-2">
        {items.slice(0, 5).map((n) => (
          <li key={n.url}>
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline gap-2.5 text-[14px] leading-snug transition-opacity hover:opacity-70"
              style={{ color: 'var(--hero-fg)' }}
            >
              <span className="mt-[1px] shrink-0" style={{ color: 'var(--hero-fg-muted)' }}>·</span>
              <span className="min-w-0 flex-1">
                <span className="underline decoration-transparent underline-offset-2 transition-colors group-hover:decoration-current">{n.title}</span>
                {n.source && <span className="ml-1.5 text-[11.5px] italic" style={{ color: 'var(--hero-fg-muted)' }}>{n.source}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </LetterSection>
  );
}

export function RecosSection() {
  const [items, setItems] = useState<Reco[] | null>(null);
  useEffect(() => {
    let alive = true;
    void getDailyRecos().then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, []);
  if (!items || items.length === 0) return null;
  return (
    <LetterSection label="오늘의 추천">
      <ul className="space-y-2.5">
        {items.map((r, i) => (
          <li key={`${r.category}-${i}`} className="flex items-baseline gap-2.5">
            <span className="mt-[1px] shrink-0 rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--hero-fg-muted)' }}>{r.category}</span>
            <span className="min-w-0 flex-1">
              <span className="text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>{r.title}</span>
              {r.reason && <span className="ml-1.5 text-[12px] italic" style={{ color: 'var(--hero-fg-muted)' }}>{r.reason}</span>}
            </span>
          </li>
        ))}
      </ul>
    </LetterSection>
  );
}

export function TomorrowSection() {
  const [preview, setPreview] = useState<TomorrowPreview | null>(null);
  useEffect(() => {
    let alive = true;
    void buildTomorrowPreview().then((r) => { if (alive) setPreview(r); });
    return () => { alive = false; };
  }, []);
  if (!preview) return null;
  const { dateLabel, events, weather } = preview;
  // 내일 일정도 예보도 없으면 생략.
  if (events.length === 0 && !weather) return null;
  return (
    <LetterSection label={`내일 미리보기 · ${dateLabel}`}>
      {weather && (
        <div className="mb-2 flex items-baseline gap-2 text-[13.5px]" style={{ color: 'var(--hero-fg)' }}>
          <span>{weather.label}</span>
          <span className="tabular-nums" style={{ fontFamily: 'var(--briefing-serif)' }}>
            <span style={{ color: 'hsl(0 60% 50%)' }}>{weather.tempMax}°</span>
            {' / '}
            <span style={{ color: 'hsl(215 65% 52%)' }}>{weather.tempMin}°</span>
          </span>
        </div>
      )}
      {events.length > 0 ? (
        <ul className="space-y-1.5">
          {events.map((e, i) => (
            <li key={`${e.startAt}-${i}`} className="flex items-baseline gap-3">
              <span className="w-[46px] shrink-0 text-[13.5px] tabular-nums" style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}>
                {e.allDay ? '종일' : hm(e.startAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: 'var(--hero-fg)' }}>{e.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] italic" style={{ color: 'var(--hero-fg-muted)' }}>잡힌 일정은 없어요.</p>
      )}
    </LetterSection>
  );
}

export function DdaySection({ data, onOpen }: { data: BriefingData; onOpen?: () => void }) {
  if (data.upcomingDday.length === 0) return null;
  return (
    <LetterSection label="다가오는 날" onOpen={onOpen}>
      <ul className="space-y-1.5">
        {data.upcomingDday.slice(0, 4).map((d, i) => (
          <li key={`${d.label}-${i}`} className="flex items-baseline gap-2.5 text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>
            <span className="min-w-0 flex-1 truncate">{d.label}</span>
            <span className="shrink-0 tabular-nums" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)' }}>
              {d.daysLeft === 0 ? '오늘' : `${d.daysLeft}일 남음`}
            </span>
          </li>
        ))}
      </ul>
    </LetterSection>
  );
}

export function HabitsSection({ data, onOpen }: { data: BriefingData; onOpen?: () => void }) {
  if (data.habits.length === 0) return null;
  const doneCount = data.habits.filter((h) => h.done).length;
  return (
    <LetterSection label={`습관 · ${doneCount}/${data.habits.length}`} onOpen={onOpen}>
      <ul className="space-y-1.5">
        {data.habits.slice(0, 6).map((h) => (
          <li key={h.id} className="flex items-baseline gap-2.5 text-[14.5px]" style={{ color: 'var(--hero-fg)', opacity: h.done ? 0.5 : 1 }}>
            <span className="shrink-0" style={{ color: h.done ? 'hsl(150 45% 42%)' : 'var(--hero-fg-muted)' }}>{h.done ? '✓' : '·'}</span>
            <span className="min-w-0 flex-1 truncate" style={{ textDecoration: h.done ? 'line-through' : undefined }}>{h.title}</span>
            {h.streakAtRisk && <span className="shrink-0 text-[11px] italic" style={{ color: 'hsl(18 60% 48%)' }}>연속 위험</span>}
          </li>
        ))}
      </ul>
    </LetterSection>
  );
}

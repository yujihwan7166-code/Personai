/**
 * 브리핑 섹션 — 모닝 레터 스타일 (2026-07-05 v6, 탈AI 리뉴얼).
 *
 * 카드·글래스·accent 배경·아이콘을 걷어내고, 편지 속 항목처럼 얇은 구분선 +
 * 소제목 + 담백한 리스트로. 색은 잉크(--hero-fg) 위주, 강조는 최소.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { BriefingData } from '@/lib/buildBriefingData';
import type { WeatherNow } from '@/services/weatherService';
import { fetchMarketIndices, type IndexQuote, type MarketGroup } from '@/services/marketService';
import { fetchNews, type NewsItem } from '@/services/newsService';

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 레터 섹션 — 위 얇은 구분선 + 손글씨풍 소제목 + 내용. onOpen 시 소제목이 점프 버튼. */
function LetterSection({ label, children, onOpen }: { label: string; children: ReactNode; onOpen?: () => void }) {
  return (
    <section className="pt-4">
      <div
        aria-hidden
        className="mb-2.5 h-px w-full"
        style={{ background: 'linear-gradient(90deg, transparent, var(--hero-hairline, rgba(0,0,0,0.14)), transparent)' }}
      />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="group mb-2 flex items-center gap-1.5 text-[12px] tracking-[0.02em] transition-colors hover:text-[color:var(--hero-fg)]"
          style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}
        >
          {label}
          <span aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </button>
      ) : (
        <div className="mb-2 text-[12px] tracking-[0.02em]" style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}>
          {label}
        </div>
      )}
      {children}
    </section>
  );
}

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

export function WeatherSection({ weather }: { weather: WeatherNow }) {
  return (
    <LetterSection label="날씨">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[24px] tabular-nums" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)' }}>{weather.temp}°</span>
        <span className="text-[14.5px]" style={{ color: 'var(--hero-fg)' }}>{weather.label}</span>
        {weather.dust && (
          <span className="text-[12.5px]" style={{ color: weather.dust.color }}>· {weather.dust.label}</span>
        )}
        <span className="ml-auto text-[11.5px] italic" style={{ color: 'var(--hero-fg-muted)' }}>서울</span>
      </div>
    </LetterSection>
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

export function NewsSection() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchNews().then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, []);
  if (!items || items.length === 0) return null;
  return (
    <LetterSection label="오늘의 소식">
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

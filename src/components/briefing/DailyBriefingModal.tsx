/**
 * 데일리 브리핑 v7 — 풀스크린 리치 카드 그리드 (2026-07-06 재설계).
 *
 * 520px 모달 → 전체 화면 브리핑. 상단 날짜·인사·요약 → 날씨 히어로 + AI 한마디 →
 * 2열 masonry 카드(일정·할일·다가오는날·시장·뉴스·습관). 따뜻한 편집(editorial)
 * 톤 유지 (무지개 대시보드 지양). 헤더 ⚙ 로 표시 항목·관심종목 설정.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dailyBriefingStore, useBriefingSettings } from '@/lib/dailyBriefingStore';
import { getDailyBriefing, type BriefingNarrative } from '@/lib/dailyBriefingNarrative';
import { briefingPrefs, useBriefingPrefs, BRIEFING_SECTIONS } from '@/lib/briefingPrefs';
import { watchlistStore, useWatchlist } from '@/lib/watchlistStore';
import { newsTopicStore, useNewsTopic, NEWS_TOPICS } from '@/lib/newsTopicStore';
import { isEvening } from '@/lib/tomorrowPreview';
import {
  BriefingCard,
  ScheduleSection,
  TasksSection,
  WeatherHero,
  StocksSection,
  NewsSection,
  RecosSection,
  TomorrowSection,
  DdaySection,
  HabitsSection,
} from './BriefingSections';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const settings = useBriefingSettings();
  const prefs = useBriefingPrefs();
  const watchlist = useWatchlist();
  const newsTopic = useNewsTopic();
  const [tickerInput, setTickerInput] = useState('');
  const navigate = useNavigate();

  // 섹션 헤더 클릭 → 해당 플래너 뷰로 점프하고 브리핑 닫기.
  const jumpTo = (view: 'day' | 'week' | 'month' | 'year' | 'habits') => {
    onClose();
    navigate(`/planner?view=${view}`);
  };
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const [narrative, setNarrative] = useState<BriefingNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 열림/닫힘 — 종료 애니메이션 위해 잠시 mount 유지.
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = window.setTimeout(() => { setVisible(false); setClosing(false); }, 170);
      return () => window.clearTimeout(t);
    }
  }, [open, visible]);

  // 열릴 때 브리핑 로드 (하루 캐시). autoShow 다음 표시 방지 마킹.
  useEffect(() => {
    if (!open) return;
    dailyBriefingStore.markShownToday();
    let alive = true;
    setLoading(true);
    void getDailyBriefing().then((n) => { if (alive) { setNarrative(n); setLoading(false); } });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (settingsOpen) setSettingsOpen(false); else onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose, settingsOpen]);

  if (!visible || typeof document === 'undefined') return null;

  const d = narrative?.data;
  const w = narrative?.weather ?? null;

  // 오늘 요약 stat — 날씨 스트립 우측에 칩으로. (정보 밀도 ↑, 헤더 중복 제거)
  const stats: { label: string; value: string }[] = [];
  if (d) {
    if (prefs.schedule && d.timed.length) stats.push({ label: '일정', value: String(d.timed.length) });
    if (prefs.tasks && d.inbox.length + d.overdue.length) stats.push({ label: '할일', value: String(d.inbox.length + d.overdue.length) });
    if (prefs.dday && d.upcomingDday.length) stats.push({ label: '다가오는 날', value: String(d.upcomingDday.length) });
    if (prefs.habits && d.habits.length) stats.push({ label: '습관', value: `${d.habits.filter((h) => h.done).length}/${d.habits.length}` });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데일리 브리핑"
      className={cn(
        'fixed inset-0 z-[200] overflow-y-auto scrollbar-thin',
        closing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200',
      )}
      style={{
        // 풀스크린 캔버스 — 따뜻한 종이 톤. 카드가 살짝 떠 보이게 캔버스를 조금 더 진하게.
        ['--briefing-serif' as string]: "'Nanum Myeongjo', 'Noto Serif KR', 'Apple SD Gothic Neo', Georgia, serif",
        ['--hero-fg' as string]: 'hsl(28 18% 20%)',
        ['--hero-fg-muted' as string]: 'hsl(28 12% 48%)',
        ['--hero-hairline' as string]: 'hsl(30 20% 60% / 0.28)',
        ['--briefing-card-bg' as string]: 'hsl(42 50% 99.5%)',
        ['--briefing-card-border' as string]: 'hsl(30 24% 82% / 0.7)',
        background: 'linear-gradient(180deg, hsl(37 34% 96.5%) 0%, hsl(33 26% 94%) 100%)',
        color: 'hsl(28 18% 20%)',
      }}
    >
      <div
        className={cn(
          'mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-5 py-6 sm:px-8',
          closing ? 'animate-out fade-out slide-out-to-bottom-2 duration-150' : 'animate-in fade-in slide-in-from-bottom-3 duration-300',
        )}
      >
        {/* 헤더 — 날짜(작게) → 인사(큰 세리프). 요약은 날씨 스트립으로 이동. */}
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] tracking-[0.04em]" style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}>
              {narrative?.date ?? ''}
            </p>
            <h2 className="mt-1 text-[clamp(26px,3.4vw,32px)] leading-tight" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)', fontWeight: 700 }}>
              {narrative?.greeting ?? '오늘의 브리핑'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="브리핑 설정"
            title="브리핑 설정"
            className={cn(
              'shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              settingsOpen ? 'text-[color:var(--hero-fg)] bg-black/[0.05]' : 'text-[color:var(--hero-fg-muted)] hover:bg-black/[0.04] hover:text-[color:var(--hero-fg)]',
            )}
          >
            <Settings2 size={16} className={cn('transition-transform', settingsOpen && 'rotate-90')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--hero-fg-muted)] transition-colors hover:bg-black/[0.04] hover:text-[color:var(--hero-fg)]"
          >
            <X size={18} />
          </button>
        </div>

        {settingsOpen ? (
          <SettingsPanel
            prefs={prefs}
            settings={settings}
            watchlist={watchlist}
            tickerInput={tickerInput}
            setTickerInput={setTickerInput}
          />
        ) : (
          <div className="space-y-3">
            {/* 날씨 스트립 — 우측에 오늘 요약. 날씨 off 면 요약만 얇게. */}
            {prefs.weather && w ? (
              <WeatherHero weather={w} stats={stats} />
            ) : stats.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-5 py-2.5" style={{ borderColor: 'var(--briefing-card-border)', background: 'var(--briefing-card-bg)' }}>
                {stats.map((s) => (
                  <span key={s.label} className="flex items-baseline gap-1.5 text-[13px]" style={{ color: 'var(--hero-fg)' }}>
                    <span style={{ color: 'var(--hero-fg-muted)' }}>{s.label}</span>
                    <span className="tabular-nums" style={{ fontFamily: 'var(--briefing-serif)', fontWeight: 700 }}>{s.value}</span>
                  </span>
                ))}
              </div>
            ) : null}

            {/* AI 한마디 — 리드 카드(세리프 문단). */}
            {prefs.ai && (
              <BriefingCard label="AI 한마디">
                {loading || !narrative ? (
                  <BriefingShimmer />
                ) : (
                  <p className="text-[15.5px] leading-[1.8]" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)' }}>
                    {narrative.text}
                  </p>
                )}
              </BriefingCard>
            )}

            {/* 2열 masonry — 데이터·설정 없는 카드는 자동 생략. */}
            {d && (
              <div className="columns-1 gap-3 md:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">
                {prefs.schedule && <ScheduleSection data={d} onOpen={() => jumpTo('day')} />}
                {prefs.tasks && <TasksSection data={d} onOpen={() => jumpTo('day')} />}
                {prefs.dday && <DdaySection data={d} onOpen={() => jumpTo('month')} />}
                {prefs.stocks && <StocksSection watch={watchlist} />}
                {prefs.news && <NewsSection topic={newsTopic} topicLabel={NEWS_TOPICS.find((t) => t.key === newsTopic)?.label} />}
                {prefs.recos && <RecosSection />}
                {prefs.tomorrow && isEvening() && <TomorrowSection />}
                {prefs.habits && <HabitsSection data={d} onOpen={() => jumpTo('habits')} />}
              </div>
            )}

            {/* 아무 것도 없을 때. */}
            {d && !prefs.ai && !(prefs.weather && w) &&
              !(prefs.schedule && d.timed.length) &&
              !(prefs.tasks && (d.inbox.length + d.overdue.length)) &&
              !prefs.stocks && !prefs.news && !prefs.recos &&
              !(prefs.tomorrow && isEvening()) &&
              !(prefs.dday && d.upcomingDday.length) &&
              !(prefs.habits && d.habits.length) && (
                <p className="py-16 text-center text-[14px]" style={{ color: 'var(--hero-fg-muted)' }}>
                  오늘 표시할 내용이 없어요. 설정에서 항목을 켜보세요.
                </p>
              )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

/** 설정 — 표시 항목 토글 + 관심종목 + 자동 표시. */
function SettingsPanel({
  prefs,
  settings,
  watchlist,
  tickerInput,
  setTickerInput,
}: {
  prefs: ReturnType<typeof useBriefingPrefs>;
  settings: ReturnType<typeof useBriefingSettings>;
  watchlist: string[];
  tickerInput: string;
  setTickerInput: (v: string) => void;
}) {
  const newsTopic = useNewsTopic();
  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="mb-2 text-[12px] font-bold tracking-wide" style={{ color: 'var(--hero-fg-muted)' }}>브리핑에 표시할 항목</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {BRIEFING_SECTIONS.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] transition-colors hover:bg-black/[0.03]" style={{ color: 'var(--hero-fg)' }}>
            <input
              type="checkbox"
              checked={prefs[s.key]}
              onChange={() => briefingPrefs.toggle(s.key)}
              className="h-4 w-4 cursor-pointer rounded"
              style={{ accentColor: 'var(--hero-accent)' }}
            />
            {s.label}
          </label>
        ))}
      </div>

      {prefs.stocks && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--hero-hairline)' }}>
          <div className="mb-1.5 text-[12px] font-bold tracking-wide" style={{ color: 'var(--hero-fg-muted)' }}>관심 종목</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {watchlist.length === 0 && (
              <span className="text-[12px] italic" style={{ color: 'var(--hero-fg-muted)' }}>예: AAPL · TSLA · 005930.KS</span>
            )}
            {watchlist.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--hero-fg)' }}>
                {t}
                <button type="button" onClick={() => watchlistStore.remove(t)} aria-label={`${t} 제거`} className="opacity-50 hover:opacity-100">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); watchlistStore.add(tickerInput); setTickerInput(''); }}
            className="flex gap-1.5"
          >
            <input
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              placeholder="티커 입력 (예: NVDA)"
              className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[13px] outline-none"
              style={{ borderColor: 'var(--hero-hairline)', background: 'transparent', color: 'var(--hero-fg)' }}
            />
            <button
              type="submit"
              disabled={!tickerInput.trim() || watchlist.length >= watchlistStore.MAX}
              className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40"
              style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--hero-fg)' }}
            >
              추가
            </button>
          </form>
        </div>
      )}

      {prefs.news && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--hero-hairline)' }}>
          <div className="mb-1.5 text-[12px] font-bold tracking-wide" style={{ color: 'var(--hero-fg-muted)' }}>뉴스 주제</div>
          <div className="flex flex-wrap gap-1.5">
            {NEWS_TOPICS.map((t) => {
              const active = newsTopic === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => newsTopicStore.set(t.key)}
                  className="rounded-full px-3 py-1 text-[13px] transition-colors"
                  style={{
                    background: active ? 'var(--hero-fg)' : 'rgba(0,0,0,0.05)',
                    color: active ? 'var(--briefing-card-bg)' : 'var(--hero-fg)',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center gap-2.5 border-t px-2 py-3 text-[13px]" style={{ color: 'var(--hero-fg-muted)', borderColor: 'var(--hero-hairline)' }}>
        <input
          type="checkbox"
          checked={settings.autoShow}
          onChange={(e) => dailyBriefingStore.setAutoShow(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded"
          style={{ accentColor: 'var(--hero-accent)' }}
        />
        매일 아침 자동으로 열기
      </label>
    </div>
  );
}

function BriefingShimmer() {
  return (
    <div className="space-y-2.5 py-1">
      {[100, 92, 78].map((w) => (
        <div
          key={w}
          className="h-4 rounded-md"
          style={{
            width: `${w}%`,
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--hero-fg) 8%, transparent), color-mix(in srgb, var(--hero-fg) 4%, transparent), color-mix(in srgb, var(--hero-fg) 8%, transparent))',
            backgroundSize: '200% 100%',
            animation: 'wb-shimmer 1.4s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`@keyframes wb-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

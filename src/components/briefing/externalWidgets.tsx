/**
 * 데일리 브리핑 외부 정보 위젯 5종 (Step 2).
 *
 * - 날씨 (Open-Meteo + geolocation)
 * - 환율 (exchangerate.host)
 * - 뉴스 (rss2json)
 * - 주식·코인 (CoinGecko)
 * - S&P 500 히트맵 (TradingView 임베드)
 *
 * 모든 위젯: 캐시 + TTL + 에러 fallback + ↻ 새로고침 버튼
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, RefreshCw, Newspaper, TrendingUp, DollarSign, Settings, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchWeather, fetchForex, fetchNews, fetchCoins, searchCoins,
  getCurrentLocation, geocodeCity, wmoLabel,
  forexLabel, ALL_FOREX_CODES, DEFAULT_FOREX_CODES, DEFAULT_COINS,
  NEWS_SOURCES, DEFAULT_NEWS_CONFIG, type NewsConfig, type WeatherData, type ForexRate, type NewsItem, type CoinData,
} from '@/lib/briefingApiClients';
import { type CachedResult } from '@/lib/briefingApi';
import { dailyBriefingStore, WIDGET_META, type PlacedWidget } from '@/lib/dailyBriefingStore';

interface WidgetProps {
  widget: PlacedWidget;
  onClose: () => void;
}

// ──────────────────────────────────────────
// 공통 — async hook

function useAsyncCached<T>(
  fetcher: (force?: boolean) => Promise<CachedResult<T> | null>,
  deps: unknown[],
): { result: CachedResult<T> | null; loading: boolean; error: string | null; refresh: () => void } {
  const [result, setResult] = useState<CachedResult<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const v = ++versionRef.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetcher(force);
      if (v !== versionRef.current) return;
      setResult(r);
    } catch (e) {
      if (v !== versionRef.current) return;
      setError((e as Error).message);
    } finally {
      if (v === versionRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void load(false); }, [load]);

  return { result, loading, error, refresh: () => void load(true) };
}

// ──────────────────────────────────────────
// 1. 날씨

export function WeatherWidget({ widget, onClose: _onClose }: WidgetProps) {
  const config = (widget.config ?? {}) as { lat?: number; lon?: number; city?: string };
  const [coords, setCoords] = useState<{ lat: number; lon: number; city: string } | null>(
    config.lat && config.lon ? { lat: config.lat, lon: config.lon, city: config.city ?? '내 위치' } : null,
  );
  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'denied'>(coords ? 'idle' : 'idle');
  const [cityInputOpen, setCityInputOpen] = useState(false);
  const [cityInput, setCityInput] = useState('');

  // 처음 마운트 — 좌표 없으면 geolocation 시도
  useEffect(() => {
    if (coords) return;
    setGeoState('requesting');
    getCurrentLocation()
      .then((loc) => {
        setCoords(loc);
        setGeoState('idle');
        dailyBriefingStore.updateWidgetConfig(widget.id, { lat: loc.lat, lon: loc.lon, city: loc.city });
      })
      .catch(() => setGeoState('denied'));
  }, [coords, widget.id]);

  const { result, loading, error, refresh } = useAsyncCached<WeatherData>(
    async (force) => coords ? fetchWeather(coords.lat, coords.lon, coords.city, force) : null,
    [coords?.lat, coords?.lon],
  );

  const submitCity = async () => {
    if (!cityInput.trim()) return;
    const loc = await geocodeCity(cityInput);
    if (loc) {
      setCoords(loc);
      setCityInputOpen(false);
      setCityInput('');
      dailyBriefingStore.updateWidgetConfig(widget.id, { lat: loc.lat, lon: loc.lon, city: loc.city });
    }
  };

  return (
    <div className="w-full h-full p-3 flex flex-col">
      <ExtHeader
        icon={<Cloud className="h-3.5 w-3.5" />}
        title={result?.data.city ?? coords?.city ?? '날씨'}
        stale={result?.stale}
        onRefresh={refresh}
        kind="weather"
      />

      {/* geolocation 거부 — 도시 입력 안내 */}
      {!coords && geoState === 'denied' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-[11px] text-muted-foreground">위치 정보가 없어요</span>
          <CityInput value={cityInput} onChange={setCityInput} onSubmit={submitCity} />
        </div>
      )}
      {!coords && geoState === 'requesting' && <CenterText text="위치 확인 중…" />}

      {/* 도시 변경 입력 */}
      {coords && cityInputOpen && (
        <div className="flex-1 flex items-center justify-center">
          <CityInput value={cityInput} onChange={setCityInput} onSubmit={submitCity} onCancel={() => setCityInputOpen(false)} />
        </div>
      )}

      {/* 데이터 표시 */}
      {coords && !cityInputOpen && result?.data && (
        <button
          type="button"
          onClick={() => setCityInputOpen(true)}
          className="flex-1 text-left flex items-center gap-2 mt-1 -mx-1 px-1 rounded transition-colors hover:bg-foreground/5"
          title="도시 변경"
        >
          <span className="text-[44px] leading-none" aria-hidden>{wmoLabel(result.data.code).emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[30px] font-extrabold leading-none tabular-nums text-foreground">
              {result.data.temp}<span className="text-[18px] opacity-70">°</span>
            </div>
            <div className="text-[11px] text-foreground/80 mt-1 leading-tight font-medium">
              {result.data.description}
            </div>
            <div className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5">
              <span className="text-rose-500/85">↑{result.data.tempMax}°</span>{' '}
              <span className="text-blue-500/85">↓{result.data.tempMin}°</span>
            </div>
          </div>
        </button>
      )}

      {coords && !cityInputOpen && !result?.data && loading && <WidgetSkeleton rows={2} />}
      {coords && !cityInputOpen && error && !result?.data && <CenterText text="가져오기 실패" error />}
    </div>
  );
}

function CityInput({ value, onChange, onSubmit, onCancel }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel?: () => void;
}) {
  return (
    <div className="w-full px-2 flex flex-col gap-1.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
        placeholder="도시 (예: 서울)"
        className="w-full h-7 px-2 text-[11.5px] rounded border border-foreground/20 bg-background focus:outline-none focus:border-primary"
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onSubmit}
          className="flex-1 h-6 text-[10.5px] rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          확인
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2 h-6 text-[10.5px] rounded text-muted-foreground hover:bg-accent transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 2. 환율

export function ForexWidget({ widget }: WidgetProps) {
  const config = (widget.config ?? {}) as { codes?: string[] };
  const codes = config.codes && config.codes.length > 0 ? config.codes : DEFAULT_FOREX_CODES;
  const [pickerOpen, setPickerOpen] = useState(false);

  const { result, loading, error, refresh } = useAsyncCached<ForexRate[]>(
    async (force) => fetchForex(codes, force),
    [codes.join(',')],
  );

  return (
    <div className="w-full h-full p-3 flex flex-col relative">
      <ExtHeader
        icon={<DollarSign className="h-3.5 w-3.5" />}
        title="환율"
        stale={result?.stale}
        onRefresh={refresh}
        onConfig={() => setPickerOpen(true)}
        kind="forex"
      />
      {pickerOpen ? (
        <ForexPicker
          codes={codes}
          onChange={(next) => {
            dailyBriefingStore.updateWidgetConfig(widget.id, { codes: next });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
        <>
          {!result?.data && loading && <WidgetSkeleton rows={3} />}
          {error && !result?.data && <CenterText text="실패" error />}
          {result?.data && (
            <ul className={cn(
              'mt-1.5 flex-1 overflow-hidden',
              widget.size === 'M' ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'space-y-1',
            )}>
              {result.data.map((r) => (
                <li key={r.code} className="flex items-baseline gap-1.5 text-[11.5px] leading-tight">
                  <span className="font-bold text-foreground/85 w-[28px] tabular-nums shrink-0">{r.code}</span>
                  {r.rate ? (
                    <span className="tabular-nums text-foreground font-semibold flex-1 truncate">
                      {Math.round(r.rate).toLocaleString()}<span className="text-[10px] text-muted-foreground ml-0.5">원</span>
                    </span>
                  ) : (
                    <span className="flex-1 h-2 rounded skeleton-pulse bg-foreground/8" />
                  )}
                  {r.rate && r.change !== 0 && (
                    <span className={cn(
                      'tabular-nums shrink-0 text-[10px] font-bold',
                      r.change > 0 ? 'text-rose-500' : 'text-blue-500',
                    )}>
                      {r.change > 0 ? '▲' : '▼'}{Math.abs(r.change).toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ForexPicker({ codes, onChange, onClose }: { codes: string[]; onChange: (codes: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(new Set(codes));
  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else if (next.size < 5) next.add(code);
    setSelected(next);
  };
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-[9.5px] text-muted-foreground mb-1.5">최대 5개</div>
      <ul className="grid grid-cols-2 gap-0.5">
        {ALL_FOREX_CODES.map((code) => {
          const on = selected.has(code);
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => toggle(code)}
                className={cn(
                  'w-full text-left px-1 py-0.5 rounded text-[10px] transition-colors',
                  on ? 'bg-primary/15 text-primary font-medium' : 'text-foreground/75 hover:bg-accent',
                )}
              >
                {on && '✓ '}{code}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => onChange([...selected])}
          className="flex-1 h-6 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 h-6 text-[10px] rounded text-muted-foreground hover:bg-accent transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 3. 뉴스

export function NewsWidget({ widget }: WidgetProps) {
  const config = (widget.config ?? {}) as Partial<NewsConfig>;
  const newsConfig: NewsConfig = {
    sources: config.sources && config.sources.length > 0 ? config.sources : DEFAULT_NEWS_CONFIG.sources,
    topics: config.topics && config.topics.length > 0 ? config.topics : DEFAULT_NEWS_CONFIG.topics,
    limit: config.limit ?? 4,
  };
  const [pickerOpen, setPickerOpen] = useState(false);

  const { result, loading, error, refresh } = useAsyncCached<NewsItem[]>(
    async (force) => fetchNews(newsConfig, force),
    [newsConfig.sources.join(','), newsConfig.topics.join(',')],
  );

  return (
    <div className="w-full h-full p-3 flex flex-col">
      <ExtHeader
        icon={<Newspaper className="h-3.5 w-3.5" />}
        title="뉴스"
        stale={result?.stale}
        onRefresh={refresh}
        onConfig={() => setPickerOpen(true)}
        kind="news"
      />
      {pickerOpen ? (
        <NewsPicker
          config={newsConfig}
          onChange={(next) => {
            dailyBriefingStore.updateWidgetConfig(widget.id, { ...next });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
        <>
          {!result?.data && loading && <WidgetSkeleton rows={4} />}
          {error && !result?.data && <CenterText text="가져오기 실패" error />}
          {result?.data && result.data.length === 0 && <CenterText text="기사 없음" />}
          {result?.data && result.data.length > 0 && (
            <ul className="mt-1.5 space-y-1.5 flex-1 overflow-y-auto">
              {result.data.map((n, i) => (
                <li key={i}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-flex items-center px-1.5 h-[16px] rounded-full bg-foreground/8 text-[9px] font-semibold text-foreground/65 truncate max-w-[60px]">
                        {n.source}
                      </span>
                      <span className="text-[9px] text-muted-foreground/65 tabular-nums">
                        {(() => {
                          const ago = Math.round((Date.now() - new Date(n.pubDate).getTime()) / 60000);
                          if (ago < 60) return `${Math.max(1, ago)}분`;
                          if (ago < 1440) return `${Math.round(ago / 60)}시간`;
                          return `${Math.round(ago / 1440)}일`;
                        })()}
                      </span>
                    </div>
                    <div className="text-[11.5px] leading-snug text-foreground/90 line-clamp-2 group-hover:text-primary transition-colors">
                      {n.title}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function NewsPicker({ config, onChange, onClose }: {
  config: NewsConfig;
  onChange: (config: NewsConfig) => void;
  onClose: () => void;
}) {
  const [sources, setSources] = useState(new Set(config.sources));
  const [topics, setTopics] = useState(new Set(config.topics));
  const sourceKeys = Object.keys(NEWS_SOURCES);
  // 모든 활성 매체에서 사용 가능한 토픽 합집합
  const allTopicKeys = new Set<string>();
  for (const sk of sources) {
    Object.keys(NEWS_SOURCES[sk]?.topics ?? {}).forEach((t) => allTopicKeys.add(t));
  }
  const allTopicLabels: Record<string, string> = {};
  for (const sk of sourceKeys) {
    for (const [tk, t] of Object.entries(NEWS_SOURCES[sk].topics)) {
      allTopicLabels[tk] = t.label;
    }
  }

  return (
    <div className="flex-1 overflow-y-auto text-[10.5px]">
      <div className="font-semibold text-foreground/80 mb-1">매체</div>
      <ul className="grid grid-cols-2 gap-0.5 mb-2">
        {sourceKeys.map((sk) => {
          const on = sources.has(sk);
          return (
            <li key={sk}>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(sources);
                  if (next.has(sk)) next.delete(sk);
                  else next.add(sk);
                  setSources(next);
                }}
                className={cn(
                  'w-full text-left px-1.5 py-0.5 rounded transition-colors',
                  on ? 'bg-primary/15 text-primary' : 'text-foreground/75 hover:bg-accent',
                )}
              >
                {on && '✓ '}{NEWS_SOURCES[sk].label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="font-semibold text-foreground/80 mb-1">주제</div>
      <ul className="grid grid-cols-2 gap-0.5 mb-2">
        {[...allTopicKeys].map((tk) => {
          const on = topics.has(tk);
          return (
            <li key={tk}>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(topics);
                  if (next.has(tk)) next.delete(tk);
                  else next.add(tk);
                  setTopics(next);
                }}
                className={cn(
                  'w-full text-left px-1.5 py-0.5 rounded transition-colors',
                  on ? 'bg-primary/15 text-primary' : 'text-foreground/75 hover:bg-accent',
                )}
              >
                {on && '✓ '}{allTopicLabels[tk]}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange({ sources: [...sources], topics: [...topics], limit: config.limit })}
          className="flex-1 h-6 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 h-6 rounded text-muted-foreground hover:bg-accent"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 4. 코인 (주식 v1 — 코인만)

export function StockWidget({ widget }: WidgetProps) {
  const config = (widget.config ?? {}) as { ids?: string[] };
  const ids = config.ids && config.ids.length > 0 ? config.ids : DEFAULT_COINS;
  const [pickerOpen, setPickerOpen] = useState(false);

  const { result, loading, error, refresh } = useAsyncCached<CoinData[]>(
    async (force) => fetchCoins(ids, force),
    [ids.join(',')],
  );

  return (
    <div className="w-full h-full p-3 flex flex-col">
      <ExtHeader
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        title="코인"
        stale={result?.stale}
        onRefresh={refresh}
        onConfig={() => setPickerOpen(true)}
        kind="stock"
      />
      {pickerOpen ? (
        <CoinPicker
          ids={ids}
          onChange={(next) => {
            dailyBriefingStore.updateWidgetConfig(widget.id, { ids: next });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
        <>
          {!result?.data && loading && <WidgetSkeleton rows={3} />}
          {error && !result?.data && <CenterText text="실패" error />}
          {result?.data && (
            <ul className={cn(
              'mt-1.5 flex-1 overflow-hidden',
              widget.size === 'M' ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'space-y-1',
            )}>
              {result.data.slice(0, widget.size === 'M' ? 6 : 4).map((c) => (
                <li key={c.id} className="flex items-center gap-1 text-[11px] leading-tight">
                  <span className="font-bold text-foreground/85 w-[34px] truncate shrink-0">{c.symbol}</span>
                  {c.sparkline && c.sparkline.length > 4 && (
                    <Sparkline data={c.sparkline} up={c.change24h >= 0} className="shrink-0" />
                  )}
                  <span className="tabular-nums text-foreground/90 flex-1 truncate font-semibold text-right">
                    {c.price >= 1000 ? Math.round(c.price).toLocaleString() : c.price.toFixed(2)}
                  </span>
                  <span className={cn(
                    'tabular-nums shrink-0 text-[10px] font-bold w-[34px] text-right',
                    c.change24h > 0 ? 'text-rose-500' : c.change24h < 0 ? 'text-blue-500' : 'text-muted-foreground',
                  )}>
                    {c.change24h > 0 ? '▲' : c.change24h < 0 ? '▼' : ''}
                    {Math.abs(c.change24h).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function CoinPicker({ ids, onChange, onClose }: { ids: string[]; onChange: (ids: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(ids);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; symbol: string; name: string }>>([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => { void searchCoins(query).then(setResults); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const addCoin = (id: string) => {
    if (selected.includes(id) || selected.length >= 5) return;
    setSelected([...selected, id]);
    setQuery('');
    setResults([]);
  };
  const removeCoin = (id: string) => setSelected(selected.filter((s) => s !== id));

  return (
    <div className="flex-1 overflow-y-auto text-[10.5px]">
      <div className="font-semibold text-foreground/80 mb-1">선택된 코인 (최대 5)</div>
      <ul className="space-y-0.5 mb-2">
        {selected.map((id) => (
          <li key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/40">
            <span className="flex-1 truncate">{id}</span>
            <button onClick={() => removeCoin(id)} className="text-muted-foreground hover:text-rose-500">✕</button>
          </li>
        ))}
      </ul>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder="코인 검색 (예: bitcoin)"
        className="w-full h-6 px-1.5 rounded border border-foreground/20 bg-background mb-1"
      />
      {results.length > 0 && (
        <ul className="space-y-0.5 mb-2 max-h-[100px] overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => addCoin(r.id)}
                disabled={selected.includes(r.id)}
                className="w-full text-left px-1.5 py-0.5 rounded hover:bg-accent disabled:opacity-40"
              >
                {r.symbol} <span className="text-muted-foreground">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(selected)}
          className="flex-1 h-6 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 h-6 rounded text-muted-foreground hover:bg-accent"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 5. S&P 500 히트맵 — TradingView 임베드

export function HeatmapWidget(_p: WidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // TradingView Stock Heatmap widget
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: 'SPX500',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'ko',
      symbolUrl: '',
      colorTheme: 'light',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%',
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget w-full h-full';
    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="w-full h-full p-3 flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-foreground/70">📊</span>
        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-foreground/75">S&P 500 히트맵</span>
        <a
          href="https://www.tradingview.com/heatmap/stock/"
          target="_blank"
          rel="noreferrer"
          className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="TradingView 에서 보기"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 tradingview-widget-container rounded-xl overflow-hidden bg-foreground/3" />
    </div>
  );
}

// ──────────────────────────────────────────
// 공통 헬퍼

function ExtHeader({
  icon, title, stale, onRefresh, onConfig, kind,
}: {
  icon: React.ReactNode;
  title: string;
  stale?: boolean;
  onRefresh: () => void;
  onConfig?: () => void;
  kind?: import('@/lib/dailyBriefingStore').WidgetKind;
}) {
  const tintHue = kind ? WIDGET_META[kind].tint.hue : undefined;
  return (
    <div className="flex items-center gap-2">
      <span
        className="shrink-0"
        style={{ color: tintHue ?? 'hsl(var(--foreground) / 0.65)' }}
      >{icon}</span>
      <span className="text-[12.5px] font-semibold tracking-tight text-foreground/85 truncate flex-1">
        {title}
      </span>
      {stale && (
        <span title="갱신 실패 — 옛 데이터" className="text-amber-500 shrink-0">
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRefresh(); }}
        className="h-5 w-5 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
        aria-label="새로고침"
        title="새로고침"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
      {onConfig && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfig(); }}
          className="h-5 w-5 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
          aria-label="설정"
          title="설정"
        >
          <Settings className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function CenterText({ text, error }: { text: string; error?: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className={cn(
        'text-[10.5px] text-center px-2',
        error ? 'text-destructive' : 'text-muted-foreground/65 italic',
      )}>{text}</span>
    </div>
  );
}

/** 미니 sparkline SVG — 가격 추이 시각화. */
export function Sparkline({
  data, up, width = 36, height = 14, className,
}: { data: number[]; up: boolean; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return null;
  // resample to ~32 points 으로 다운샘플 (path 단순화)
  const STEP = Math.max(1, Math.floor(data.length / 32));
  const pts: number[] = [];
  for (let i = 0; i < data.length; i += STEP) pts.push(data[i]);
  if (pts[pts.length - 1] !== data[data.length - 1]) pts.push(data[data.length - 1]);

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const w = width;
  const h = height;
  const stepX = w / (pts.length - 1);
  const path = pts.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const color = up ? 'hsl(0 72% 55%)' : 'hsl(217 91% 55%)';
  // fill 영역 (그라디언트 옅게)
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gradId = `wb-spark-${up ? 'up' : 'down'}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 스켈레톤 — 위젯 로딩 시 표시. */
export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex-1 mt-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 rounded skeleton-pulse bg-foreground/8"
          style={{ width: `${75 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

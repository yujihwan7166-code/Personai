/**
 * 데일리 브리핑 외부 API 클라이언트 (5종).
 *
 * - 날씨: Open-Meteo (무료, 키 X)
 * - 환율: exchangerate.host (무료, 키 X)
 * - 뉴스: rss2json + 한국 매체 RSS
 * - 코인: CoinGecko (무료, 키 X)
 * - 히트맵: TradingView 임베드 (별도 — API 호출 X)
 */
import { cachedFetch, TTL, type CachedResult } from './briefingApi';

// ──────────────────────────────────────────
// 1. 날씨 — Open-Meteo

export interface WeatherData {
  temp: number;
  tempMax: number;
  tempMin: number;
  code: number;         // WMO weather code
  description: string;  // 한국어 라벨
  city: string;
  feelsLike?: number;
}

const WMO_LABELS: Record<number, { label: string; emoji: string }> = {
  0: { label: '맑음', emoji: '☀️' },
  1: { label: '대체로 맑음', emoji: '🌤' },
  2: { label: '부분적 흐림', emoji: '⛅' },
  3: { label: '흐림', emoji: '☁️' },
  45: { label: '안개', emoji: '🌫' },
  48: { label: '안개', emoji: '🌫' },
  51: { label: '가벼운 이슬비', emoji: '🌦' },
  53: { label: '이슬비', emoji: '🌦' },
  55: { label: '진한 이슬비', emoji: '🌧' },
  61: { label: '가벼운 비', emoji: '🌧' },
  63: { label: '비', emoji: '🌧' },
  65: { label: '강한 비', emoji: '🌧' },
  71: { label: '가벼운 눈', emoji: '🌨' },
  73: { label: '눈', emoji: '❄️' },
  75: { label: '강한 눈', emoji: '❄️' },
  77: { label: '진눈깨비', emoji: '🌨' },
  80: { label: '소나기', emoji: '🌦' },
  81: { label: '소나기', emoji: '🌧' },
  82: { label: '강한 소나기', emoji: '⛈' },
  85: { label: '눈 소나기', emoji: '🌨' },
  86: { label: '강한 눈 소나기', emoji: '❄️' },
  95: { label: '뇌우', emoji: '⛈' },
  96: { label: '우박 뇌우', emoji: '⛈' },
  99: { label: '강한 우박 뇌우', emoji: '⛈' },
};

export function wmoLabel(code: number): { label: string; emoji: string } {
  return WMO_LABELS[code] ?? { label: '날씨', emoji: '🌤' };
}

/** geolocation → 위·경도 + reverse geocoding → 도시명. */
export async function getCurrentLocation(): Promise<{ lat: number; lon: number; city: string }> {
  // geolocation
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('geolocation 미지원'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60 * 60_000,  // 1시간
    });
  });
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  // reverse geocoding — Open-Meteo 도 reverse 지원
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ko&count=1`;
  let city = '현 위치';
  try {
    const res = await fetch(url);
    const json = await res.json();
    const result = json.results?.[0];
    if (result?.name) city = result.name;
  } catch { /* silent — 도시명 없어도 위·경도 있으면 OK */ }
  return { lat, lon, city };
}

/** 사용자 입력 도시명 → 위·경도. */
export async function geocodeCity(name: string): Promise<{ lat: number; lon: number; city: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&language=ko&count=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.results?.[0];
    if (!result) return null;
    return { lat: result.latitude, lon: result.longitude, city: result.name };
  } catch {
    return null;
  }
}

export async function fetchWeather(
  lat: number, lon: number, city: string, force = false,
): Promise<CachedResult<WeatherData>> {
  return cachedFetch(
    `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`,
    TTL.weather,
    async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`날씨 API ${res.status}`);
      const json = await res.json();
      const code = json.current?.weather_code ?? 0;
      const { label } = wmoLabel(code);
      return {
        temp: Math.round(json.current?.temperature_2m ?? 0),
        feelsLike: Math.round(json.current?.apparent_temperature ?? 0),
        tempMax: Math.round(json.daily?.temperature_2m_max?.[0] ?? 0),
        tempMin: Math.round(json.daily?.temperature_2m_min?.[0] ?? 0),
        code,
        description: label,
        city,
      };
    },
    force,
  );
}

// ──────────────────────────────────────────
// 2. 환율 — exchangerate.host (free, no key)

export interface ForexRate {
  code: string;       // USD, JPY, EUR ...
  rate: number;       // KRW per 1 unit (or per 100 for JPY)
  change: number;     // % change vs 어제
}

export const DEFAULT_FOREX_CODES = ['USD', 'JPY', 'EUR'];

const FOREX_LABEL: Record<string, string> = {
  USD: '미국 달러',
  JPY: '일본 엔',
  EUR: '유로',
  CNY: '중국 위안',
  GBP: '영국 파운드',
  AUD: '호주 달러',
  CAD: '캐나다 달러',
  HKD: '홍콩 달러',
  CHF: '스위스 프랑',
  SGD: '싱가포르 달러',
  THB: '태국 바트',
  VND: '베트남 동',
  IDR: '인도네시아 루피아',
};

export function forexLabel(code: string): string {
  return FOREX_LABEL[code] ?? code;
}

export const ALL_FOREX_CODES = Object.keys(FOREX_LABEL);

export async function fetchForex(codes: string[], force = false): Promise<CachedResult<ForexRate[]>> {
  const sorted = [...codes].sort();
  return cachedFetch(
    `forex:${sorted.join(',')}`,
    TTL.forex,
    async () => {
      // exchangerate.host — base=KRW reverse 시 1단위당 KRW 환산
      // 더 안전한 방법: base=USD 등 외화 1단위 → KRW 환산
      // 한 번에 여러 통화 → KRW: symbols=KRW 로 매 통화별 호출
      // 그러나 단일 호출이 가능 — fixer/exchange-rate-host 는 latest?base=KRW&symbols=USD,JPY ...
      // 결과: 1 KRW = X USD (역). 우리는 1 USD = X KRW 가 필요해서 reciprocal.
      // 더 간단: latest?base=USD&symbols=KRW 등 — 그러나 base 가 통화별로 달라야 함.
      // 그래서 latest?base=KRW 한 번 호출 + 1/rate 로 reciprocal.
      const url = `https://api.exchangerate.host/latest?base=KRW&symbols=${sorted.join(',')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`환율 API ${res.status}`);
      const json = await res.json();
      const rates: Record<string, number> = json?.rates ?? {};

      // 변동률 — 어제 환율
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      let yesterdayRates: Record<string, number> = {};
      try {
        const yUrl = `https://api.exchangerate.host/${yKey}?base=KRW&symbols=${sorted.join(',')}`;
        const yRes = await fetch(yUrl);
        if (yRes.ok) {
          const yJson = await yRes.json();
          yesterdayRates = yJson?.rates ?? {};
        }
      } catch { /* 변동률 없어도 OK */ }

      return sorted.map((code) => {
        const todayKRW = rates[code] ? 1 / rates[code] : 0;   // 1 외화 당 KRW
        const yesterdayKRW = yesterdayRates[code] ? 1 / yesterdayRates[code] : 0;
        const change = yesterdayKRW > 0 ? ((todayKRW - yesterdayKRW) / yesterdayKRW) * 100 : 0;
        return { code, rate: todayKRW, change };
      });
    },
    force,
  );
}

// ──────────────────────────────────────────
// 3. 뉴스 — rss2json + 한국 매체 RSS

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

/** 한국 매체 RSS — 매체 + 주제 키. */
export const NEWS_SOURCES: Record<string, { label: string; topics: Record<string, { label: string; url: string }> }> = {
  yonhap: {
    label: '연합뉴스',
    topics: {
      general:  { label: '종합',   url: 'https://www.yna.co.kr/rss/news.xml' },
      politics: { label: '정치',   url: 'https://www.yna.co.kr/rss/politics.xml' },
      economy:  { label: '경제',   url: 'https://www.yna.co.kr/rss/economy.xml' },
      society:  { label: '사회',   url: 'https://www.yna.co.kr/rss/society.xml' },
      world:    { label: '국제',   url: 'https://www.yna.co.kr/rss/international.xml' },
      culture:  { label: '문화',   url: 'https://www.yna.co.kr/rss/culture.xml' },
      sports:   { label: '스포츠', url: 'https://www.yna.co.kr/rss/sports.xml' },
      it:       { label: 'IT',     url: 'https://www.yna.co.kr/rss/it.xml' },
    },
  },
  hani: {
    label: '한겨레',
    topics: {
      general:  { label: '종합',   url: 'https://www.hani.co.kr/rss/' },
      politics: { label: '정치',   url: 'https://www.hani.co.kr/rss/politics/' },
      economy:  { label: '경제',   url: 'https://www.hani.co.kr/rss/economy/' },
      society:  { label: '사회',   url: 'https://www.hani.co.kr/rss/society/' },
      world:    { label: '국제',   url: 'https://www.hani.co.kr/rss/international/' },
    },
  },
  chosun: {
    label: '조선일보',
    topics: {
      general: { label: '종합', url: 'https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml' },
    },
  },
  joongang: {
    label: '중앙일보',
    topics: {
      general: { label: '종합', url: 'https://rss.joins.com/joins_news_list.xml' },
    },
  },
  donga: {
    label: '동아일보',
    topics: {
      general: { label: '종합', url: 'https://rss.donga.com/total.xml' },
    },
  },
  kbs: {
    label: 'KBS',
    topics: {
      general: { label: '종합', url: 'http://world.kbs.co.kr/rss/rss_news.htm?lang=k' },
    },
  },
};

/** rss2json 으로 RSS 파싱 (CORS 우회). 무료 무인증 — rate limit 만 주의. */
async function fetchRssViaProxy(rssUrl: string): Promise<{ title: string; link: string; pubDate: string }[]> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS proxy ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`RSS 파싱 실패: ${json.message ?? 'unknown'}`);
  return (json.items ?? []).map((it: { title: string; link: string; pubDate: string }) => ({
    title: it.title,
    link: it.link,
    pubDate: it.pubDate,
  }));
}

export interface NewsConfig {
  /** 활성 매체 keys. 예: ['yonhap', 'hani'] */
  sources: string[];
  /** 활성 주제 keys. 예: ['general', 'politics'] */
  topics: string[];
  /** 위젯에 표시할 개수. */
  limit?: number;
}

export const DEFAULT_NEWS_CONFIG: NewsConfig = {
  sources: ['yonhap'],
  topics: ['general'],
  limit: 5,
};

export async function fetchNews(config: NewsConfig, force = false): Promise<CachedResult<NewsItem[]>> {
  const key = `news:${config.sources.join(',')}:${config.topics.join(',')}`;
  return cachedFetch(
    key,
    TTL.news,
    async () => {
      // 매체×주제 조합으로 RSS URL 모음
      const urls: { url: string; source: string }[] = [];
      for (const srcKey of config.sources) {
        const src = NEWS_SOURCES[srcKey];
        if (!src) continue;
        for (const topicKey of config.topics) {
          const topic = src.topics[topicKey];
          if (!topic) continue;
          urls.push({ url: topic.url, source: src.label });
        }
      }
      if (urls.length === 0) return [];
      // 병렬 fetch (실패 무시)
      const results = await Promise.allSettled(
        urls.map(async ({ url, source }) => {
          const items = await fetchRssViaProxy(url);
          return items.slice(0, 5).map((it) => ({ ...it, source }));
        }),
      );
      const all: NewsItem[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value);
      }
      // 최신순 정렬 + limit
      all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      return all.slice(0, config.limit ?? 5);
    },
    force,
  );
}

// ──────────────────────────────────────────
// 4. 코인 — CoinGecko (무료, 키 X, CORS OK)

export interface CoinData {
  id: string;          // bitcoin, ethereum, ...
  symbol: string;      // BTC, ETH, ...
  name: string;        // 한국어 이름 또는 영어
  price: number;       // KRW
  change24h: number;   // % 변동률
}

export const DEFAULT_COINS = ['bitcoin', 'ethereum'];

export async function fetchCoins(ids: string[], force = false): Promise<CachedResult<CoinData[]>> {
  const sorted = [...ids].sort();
  return cachedFetch(
    `coin:${sorted.join(',')}`,
    TTL.stock,
    async () => {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&ids=${sorted.join(',')}&order=market_cap_desc&per_page=20&page=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Coin API ${res.status}`);
      const json = await res.json() as Array<{ id: string; symbol: string; name: string; current_price: number; price_change_percentage_24h: number }>;
      return json.map((c) => ({
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
      }));
    },
    force,
  );
}

/** 코인 검색 — 사용자가 종목 추가용. */
export async function searchCoins(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
  if (!query.trim()) return [];
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.coins ?? []).slice(0, 10).map((c: { id: string; symbol: string; name: string }) => ({
      id: c.id, symbol: c.symbol.toUpperCase(), name: c.name,
    }));
  } catch { return []; }
}

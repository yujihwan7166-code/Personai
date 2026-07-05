/**
 * 시장 지수 — /api/market-index 호출 + 10분 localStorage 캐시 (2026-07-06).
 *
 * 브리핑 시장 섹션용. 지수·환율·코인 + 관심종목(watch). 한국 관례상 상승 = 빨강,
 * 하락 = 파랑 (UI 에서 매핑). 캐시 키는 watch 조합별로 분리.
 */
export type MarketGroup = '지수' | '환율' | '코인' | '관심 종목';

export interface IndexQuote {
  name: string;
  price: number;
  changePct: number;
  group: MarketGroup;
}

const CACHE_PREFIX = 'personai.market.cache';
const CACHE_TTL = 10 * 60 * 1000;

interface Cached {
  indices: IndexQuote[];
  at: number;
}

function cacheKey(watch: string[]): string {
  return watch.length ? `${CACHE_PREFIX}:${watch.join(',')}` : CACHE_PREFIX;
}

function readCache(key: string): IndexQuote[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.indices;
  } catch {
    return null;
  }
}

export async function fetchMarketIndices(watch: string[] = []): Promise<IndexQuote[]> {
  const key = cacheKey(watch);
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const qs = watch.length ? `?watch=${encodeURIComponent(watch.join(','))}` : '';
    const res = await fetch(`/api/market-index${qs}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { indices?: IndexQuote[] };
    const indices = Array.isArray(json.indices) ? json.indices : [];
    if (indices.length > 0) {
      try {
        window.localStorage.setItem(key, JSON.stringify({ indices, at: Date.now() } satisfies Cached));
      } catch {
        /* noop */
      }
    }
    return indices;
  } catch {
    return [];
  }
}

/**
 * 시장 지수 — /api/market-index 호출 + 10분 localStorage 캐시 (2026-07-06).
 *
 * 브리핑 주식 섹션용. 한국 관례상 상승 = 빨강, 하락 = 파랑 (UI 에서 매핑).
 */
export interface IndexQuote {
  name: string;
  price: number;
  changePct: number;
}

const CACHE_KEY = 'personai.market.cache';
const CACHE_TTL = 10 * 60 * 1000;

interface Cached {
  indices: IndexQuote[];
  at: number;
}

function readCache(): IndexQuote[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.indices;
  } catch {
    return null;
  }
}

export async function fetchMarketIndices(): Promise<IndexQuote[]> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const res = await fetch('/api/market-index');
    if (!res.ok) return [];
    const json = (await res.json()) as { indices?: IndexQuote[] };
    const indices = Array.isArray(json.indices) ? json.indices : [];
    if (indices.length > 0) {
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ indices, at: Date.now() } satisfies Cached));
      } catch {
        /* noop */
      }
    }
    return indices;
  } catch {
    return [];
  }
}

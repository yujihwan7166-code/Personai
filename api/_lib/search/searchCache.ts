import type { CacheEntry, SearchResult, KnowledgeGraph } from './types.js';

// 인메모리 캐시 (서버리스 글로벌 스코프)
const cache = new Map<string, CacheEntry>();

// TTL 키워드 패턴
const SHORT_TTL_PATTERNS = /(비트코인|이더리움|코인|환율|주가|시세|날씨|기온|경기\s*결과|스코어)/;
const MEDIUM_TTL_PATTERNS = /(뉴스|사건|발표|속보|정치|선거|탄핵|지지율)/;

const TTL_SHORT = 5 * 60 * 1000;       // 5분 (시세/날씨/스포츠)
const TTL_MEDIUM = 60 * 60 * 1000;     // 1시간 (뉴스/이슈)
const TTL_LONG = 6 * 60 * 60 * 1000;   // 6시간 (인물/일반)
const MAX_CACHE_SIZE = 500;

function normalizeKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getTtl(query: string): number {
  if (SHORT_TTL_PATTERNS.test(query)) return TTL_SHORT;
  if (MEDIUM_TTL_PATTERNS.test(query)) return TTL_MEDIUM;
  return TTL_LONG;
}

export function getCached(query: string): CacheEntry | null {
  const key = normalizeKey(query);
  const entry = cache.get(key);

  if (!entry) return null;

  // TTL 만료 체크
  if (Date.now() - entry.cachedAt > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry;
}

export function setCache(
  query: string,
  results: SearchResult[],
  knowledgeGraph?: KnowledgeGraph
): void {
  // 캐시 크기 제한 — 가장 오래된 것부터 삭제
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  const key = normalizeKey(query);
  cache.set(key, {
    query: key,
    results,
    knowledgeGraph,
    cachedAt: Date.now(),
    ttl: getTtl(query),
  });
}

// 만료된 캐시 정리
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.cachedAt > entry.ttl) {
      cache.delete(key);
    }
  }
}

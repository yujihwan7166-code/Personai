/**
 * 데일리 브리핑 외부 API — 캐시 + TTL + 에러 fallback.
 *
 * 캐시 키: `wb-api:<source>:<param-hash>`
 * 캐시 값: { data, fetchedAt, etag? }
 *
 * 동작:
 * 1. 호출 시 캐시 확인. TTL 안 지나면 cache 반환.
 * 2. TTL 지났으면 fetch + cache 저장.
 * 3. fetch 실패 + 캐시 있으면 stale 캐시 + warning 플래그.
 * 4. fetch 실패 + 캐시 없으면 에러 throw.
 */

const CACHE_PREFIX = 'wb-api:';

export interface CachedResult<T> {
  data: T;
  fetchedAt: number;
  /** stale = TTL 지났는데 fetch 실패해서 옛 캐시 반환. */
  stale: boolean;
}

interface RawCache<T> {
  data: T;
  fetchedAt: number;
}

function readCache<T>(key: string): RawCache<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RawCache<T>;
    if (typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch { /* quota 초과 등 silent */ }
}

/**
 * TTL 기반 캐시 fetcher.
 * @param key 캐시 키
 * @param ttlMs TTL 밀리초 (예: 30 * 60_000 = 30분)
 * @param fetcher 실제 데이터 가져오는 함수
 * @param force true 면 캐시 무시하고 강제 새로 가져오기
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  force = false,
): Promise<CachedResult<T>> {
  const cached = readCache<T>(key);
  const now = Date.now();

  // 캐시 있고 fresh → cache 반환
  if (!force && cached && now - cached.fetchedAt < ttlMs) {
    return { data: cached.data, fetchedAt: cached.fetchedAt, stale: false };
  }

  // fetch 시도
  try {
    const data = await fetcher();
    writeCache(key, data);
    return { data, fetchedAt: Date.now(), stale: false };
  } catch (err) {
    // fetch 실패 — 캐시 있으면 stale 반환
    if (cached) {
      return { data: cached.data, fetchedAt: cached.fetchedAt, stale: true };
    }
    // 캐시도 없으면 throw
    throw err;
  }
}

/** 캐시 무효화 (수동 새로고침용). */
export function invalidateCache(key: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(CACHE_PREFIX + key); } catch { /* silent */ }
}

// ──────────────────────────────────────────
// TTL 상수 (위젯별)
export const TTL = {
  weather: 30 * 60_000,    // 30분
  forex: 60 * 60_000,      // 1시간
  news: 10 * 60_000,       // 10분
  stock: 5 * 60_000,       // 5분
};

// ──────────────────────────────────────────
// 시간 표기 헬퍼

export function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return '방금';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

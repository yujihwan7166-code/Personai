/**
 * 여행 지오코딩 — 장소 이름 → 좌표.
 *
 * v1: OSM Nominatim (무료·무키·전세계). 국내 정밀도는 이후 네이버 서버 프록시로 보강 예정.
 * - 결과는 localStorage 영구 캐시 (같은 장소 재조회 안 함 → rate limit 보호).
 * - Nominatim 사용정책 초당 1회 → 요청 직렬화 + 1.2초 간격.
 * - "못 찾음"도 캐시한다 (여행 상세를 열 때마다 같은 실패를 반복 조회하지 않게).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_KEY = 'travel.geocache.v1';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1200;

const norm = (place: string): string => place.trim().toLowerCase().replace(/\s+/g, ' ');

type CacheEntry = LatLng | 'none';
type Cache = Record<string, CacheEntry>;

const readCache = (): Cache => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Cache) : {};
  } catch {
    return {};
  }
};

const writeCache = (cache: Cache): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* 캐시 실패는 무시 — 다음에 다시 조회 */
  }
};

/** 캐시 히트면 즉시 좌표 (네트워크 없음). 미스·못찾음은 null. */
export function cachedLatLng(place: string): LatLng | null {
  const hit = readCache()[norm(place)];
  return hit && hit !== 'none' ? hit : null;
}

/** "검색했지만 못 찾은 장소"로 캐시돼 있는지 — 지도에서 사용자에게 알려줄 때 사용. */
export function isCachedMiss(place: string): boolean {
  return readCache()[norm(place)] === 'none';
}

let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function scheduleFetch(place: string): Promise<LatLng | null> {
  const run = async (): Promise<LatLng | null> => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    const url = `${NOMINATIM}?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(place)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as { lat?: string; lon?: string };
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

/** 진행 중 조회 공유 — 같은 장소가 동시에 여러 번 큐에 들어가지 않게. */
const inFlight = new Map<string, Promise<LatLng | null>>();

/**
 * 장소 → 좌표. 캐시 우선, 없으면 Nominatim 조회 후 캐시.
 * 네트워크 오류는 캐시하지 않고 null (다음에 재시도), "검색 결과 없음"은 'none' 으로 캐시.
 */
export function geocode(place: string): Promise<LatLng | null> {
  const key = norm(place);
  if (!key) return Promise.resolve(null);
  const hit = readCache()[key];
  if (hit) return Promise.resolve(hit === 'none' ? null : hit);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      const found = await scheduleFetch(place);
      const fresh = readCache();
      fresh[key] = found ?? 'none';
      writeCache(fresh);
      return found;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, task);
  return task;
}

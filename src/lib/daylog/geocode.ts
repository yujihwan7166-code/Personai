/**
 * 데이로그 지오코딩 — 장소 이름 → 좌표.
 *
 * v1: OSM Nominatim (무료·무키·전세계). 국내 정밀도는 나중에 네이버 프록시로 보강 예정.
 * - 결과는 localStorage 에 영구 캐시 (같은 장소 재조회 안 함 → rate limit 보호).
 * - Nominatim 사용정책: 초당 1회 이하. 요청을 직렬화하고 간격을 둔다.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_KEY = 'daylog.geocache.v1';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1200; // 초당 1회 정책 여유

/** place 문자열 정규화 — 캐시 키. */
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
    /* 캐시 실패는 조용히 무시 — 다음에 다시 조회하면 됨 */
  }
};

/** 캐시에 있으면 즉시 반환 (네트워크 없음). 없으면 null. */
export function cachedLatLng(place: string): LatLng | null {
  const hit = readCache()[norm(place)];
  return hit && hit !== 'none' ? hit : null;
}

let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();

/** 요청 직렬화 + 최소 간격 보장. */
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

/**
 * 장소 → 좌표. 캐시 우선, 없으면 Nominatim 조회 후 캐시.
 * 실패/미발견은 null (found=false 는 캐시하지 않음 → 나중에 재시도 가능).
 */
export async function geocode(place: string): Promise<LatLng | null> {
  const key = norm(place);
  if (!key) return null;
  const cache = readCache();
  const hit = cache[key];
  if (hit) return hit === 'none' ? null : hit;

  try {
    const found = await scheduleFetch(place);
    if (found) {
      const fresh = readCache();
      fresh[key] = found;
      writeCache(fresh);
      return found;
    }
    return null;
  } catch {
    return null;
  }
}

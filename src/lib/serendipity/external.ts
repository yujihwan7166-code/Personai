/**
 * 우연의 발견 — 외부 데이터 소스 fetch.
 *
 * CORS 허용된 공개 API 만 사용 (서버 함수 불필요):
 *  - Wikipedia REST API (한국어 무작위 글)
 *  - NASA APOD (오늘의 천체 사진)
 *
 * 결과는 sessionStorage 에 캐시 (탭 단위, 새로고침 시 유지).
 * 일일 캐시는 하루 1번만 외부 호출하도록 lastFetched 키로 제한.
 */

import type { SerendipityCard } from './types';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  dayKey: string; // 'YYYY-MM-DD'
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readCache<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now(), dayKey: todayKey() };
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota or privacy mode */
  }
}

// ─────────────────────────── Wikipedia ───────────────────────────

interface WikiSummary {
  type?: string;
  title: string;
  displaytitle?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

const WIKI_CACHE_KEY = 'serendipity.wiki.random.v1';

/**
 * 한국어 위키피디아 무작위 글 1개를 가져온다.
 * 세션 캐시(하루 단위)로 외부 호출 빈도 제한.
 */
export async function fetchWikiRandomCard(force = false): Promise<SerendipityCard | null> {
  if (!force) {
    const cached = readCache<SerendipityCard>(WIKI_CACHE_KEY);
    if (cached && cached.dayKey === todayKey()) return cached.data;
  }

  try {
    const res = await fetch('https://ko.wikipedia.org/api/rest_v1/page/random/summary', {
      headers: { Accept: 'application/json' },
      // CORS 허용됨 (Wikipedia REST API)
    });
    if (!res.ok) return null;
    const json = (await res.json()) as WikiSummary;

    // 너무 짧거나 disambiguation 페이지는 스킵 (재시도 X — 다음 날에 새 글)
    if (!json.extract || json.extract.length < 80) return null;
    if (json.type === 'disambiguation') return null;

    const card: SerendipityCard = {
      id: `wiki-${todayKey()}`,
      type: 'topic',
      title: json.displaytitle ?? json.title,
      body: json.extract.slice(0, 600),
      source: '위키피디아',
      url: json.content_urls?.desktop?.page,
      imageUrl: json.thumbnail?.source,
      tags: ['위키','오늘의 글'],
      origin: 'remote',
    };
    writeCache(WIKI_CACHE_KEY, card);
    return card;
  } catch {
    return null;
  }
}

// ─────────────────────────── NASA APOD ───────────────────────────

interface ApodResponse {
  date: string;
  title: string;
  explanation: string;
  url?: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  copyright?: string;
}

const APOD_CACHE_KEY = 'serendipity.nasa.apod.v1';
// DEMO_KEY 는 시간당 30회 / 일 50회 제한. 개인 사이드프로젝트엔 충분.
// 환경변수 NASA_API_KEY 가 빌드 시 주입되면 우선 사용.
const NASA_API_KEY = (import.meta as unknown as { env?: { VITE_NASA_API_KEY?: string } }).env?.VITE_NASA_API_KEY ?? 'DEMO_KEY';

/**
 * NASA APOD (Astronomy Picture of the Day) — 오늘의 천체 사진.
 * 일 1회만 호출 (캐시).
 */
export async function fetchNasaApodCard(force = false): Promise<SerendipityCard | null> {
  if (!force) {
    const cached = readCache<SerendipityCard>(APOD_CACHE_KEY);
    if (cached && cached.dayKey === todayKey()) return cached.data;
  }

  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
    if (!res.ok) return null;
    const json = (await res.json()) as ApodResponse;

    // video 인 경우 썸네일이 없을 수 있어 본문만 사용
    const isImage = json.media_type === 'image' && json.url;

    const card: SerendipityCard = {
      id: `nasa-${json.date}`,
      type: 'topic',
      title: json.title,
      body: json.explanation.slice(0, 800),
      source: json.copyright ? `NASA APOD · ${json.copyright}` : 'NASA APOD',
      url: `https://apod.nasa.gov/apod/ap${json.date.slice(2).replace(/-/g, '')}.html`,
      imageUrl: isImage ? json.url : undefined,
      tags: ['우주','NASA','오늘의 사진'],
      origin: 'remote',
    };
    writeCache(APOD_CACHE_KEY, card);
    return card;
  } catch {
    return null;
  }
}

// ─────────────────────────── 통합 fetcher ───────────────────────────

/**
 * 페이지 진입 시 외부 카드 모두 병렬 fetch.
 * 실패한 항목은 null 로 배제 — 다른 카드는 계속 노출.
 */
export async function fetchAllExternalCards(): Promise<SerendipityCard[]> {
  const [wiki, apod] = await Promise.all([
    fetchWikiRandomCard().catch(() => null),
    fetchNasaApodCard().catch(() => null),
  ]);
  return [wiki, apod].filter((c): c is SerendipityCard => c !== null);
}

/**
 * 강제 새로고침 — 캐시 무시하고 다시 가져옴.
 */
export async function refetchExternalCards(): Promise<SerendipityCard[]> {
  const [wiki, apod] = await Promise.all([
    fetchWikiRandomCard(true).catch(() => null),
    fetchNasaApodCard(true).catch(() => null),
  ]);
  return [wiki, apod].filter((c): c is SerendipityCard => c !== null);
}

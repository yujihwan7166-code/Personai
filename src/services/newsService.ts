/**
 * 오늘의 뉴스 — /api/news 호출 + 20분 localStorage 캐시 (2026-07-06).
 *
 * 브리핑 뉴스 섹션용. Google News RSS 상위 헤드라인. 주제별 캐시 분리.
 */
export interface NewsItem {
  title: string;
  url: string;
  source: string;
}

export type NewsTopic = 'headline' | 'business' | 'tech' | 'world';

const CACHE_PREFIX = 'personai.news.cache';
const CACHE_TTL = 20 * 60 * 1000;

interface Cached {
  items: NewsItem[];
  at: number;
}

function readCache(topic: NewsTopic): NewsItem[] | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${topic}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

export async function fetchNews(topic: NewsTopic = 'headline'): Promise<NewsItem[]> {
  const cached = readCache(topic);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/news?topic=${topic}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: NewsItem[] };
    const items = Array.isArray(json.items) ? json.items : [];
    if (items.length > 0) {
      try {
        window.localStorage.setItem(`${CACHE_PREFIX}:${topic}`, JSON.stringify({ items, at: Date.now() } satisfies Cached));
      } catch {
        /* noop */
      }
    }
    return items;
  } catch {
    return [];
  }
}

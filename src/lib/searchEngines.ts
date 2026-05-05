/**
 * 검색 엔진 카탈로그 + URL 빌더 + 선택 상태 (localStorage).
 *
 * "브라우저" 카테고리에서 사용자가 엔진 선택 → 컴포저 submit 시
 * URL 빌더로 검색 URL 만들어 새 탭 오픈.
 */

export interface SearchEngine {
  id: string;
  name: string;          // 한글 라벨
  emoji: string;         // 폴백 아이콘
  iconUrl?: string;      // favicon (https)
  urlTpl: string;        // {Q} placeholder
  hint: string;          // 1줄 설명
  domain: string;        // 'naver.com'
  category: 'web' | 'video' | 'dev' | 'academic' | 'ai';
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'naver', name: '네이버', emoji: '🟢',
    iconUrl: 'https://www.naver.com/favicon.ico',
    urlTpl: 'https://search.naver.com/search.naver?query={Q}',
    hint: '한국어 종합', domain: 'naver.com', category: 'web',
  },
  {
    id: 'google', name: '구글', emoji: '🔍',
    iconUrl: 'https://www.google.com/favicon.ico',
    urlTpl: 'https://www.google.com/search?q={Q}',
    hint: '글로벌 종합', domain: 'google.com', category: 'web',
  },
  {
    id: 'youtube', name: 'YouTube', emoji: '▶️',
    iconUrl: 'https://www.youtube.com/favicon.ico',
    urlTpl: 'https://www.youtube.com/results?search_query={Q}',
    hint: '동영상', domain: 'youtube.com', category: 'video',
  },
  {
    id: 'daum', name: '다음', emoji: '🔵',
    iconUrl: 'https://www.daum.net/favicon.ico',
    urlTpl: 'https://search.daum.net/search?q={Q}',
    hint: '한국어 포털', domain: 'daum.net', category: 'web',
  },
  {
    id: 'bing', name: 'Bing', emoji: '🔷',
    iconUrl: 'https://www.bing.com/favicon.ico',
    urlTpl: 'https://www.bing.com/search?q={Q}',
    hint: '글로벌 + AI 검색', domain: 'bing.com', category: 'web',
  },
  // 자주 사용하는 3개
  {
    id: 'wikipedia', name: '위키백과', emoji: '📖',
    iconUrl: 'https://ko.wikipedia.org/static/favicon/wikipedia.ico',
    urlTpl: 'https://ko.wikipedia.org/w/index.php?search={Q}',
    hint: '한국어 지식 검색', domain: 'wikipedia.org', category: 'academic',
  },
  {
    id: 'perplexity-search', name: 'Perplexity', emoji: '🔎',
    iconUrl: 'https://www.perplexity.ai/favicon.ico',
    urlTpl: 'https://www.perplexity.ai/search?q={Q}',
    hint: 'AI 검색 + 인용', domain: 'perplexity.ai', category: 'ai',
  },
  {
    id: 'ddg', name: 'DuckDuckGo', emoji: '🦆',
    iconUrl: 'https://duckduckgo.com/favicon.ico',
    urlTpl: 'https://duckduckgo.com/?q={Q}',
    hint: '사생활 보호', domain: 'duckduckgo.com', category: 'web',
  },
];

export const buildSearchUrl = (engine: SearchEngine, query: string): string =>
  engine.urlTpl.replace('{Q}', encodeURIComponent(query.trim()));

// ─── 선택 상태 (localStorage + custom event) ───

const STORAGE_KEY = 'personai-search-engine-v1';
export const SEARCH_ENGINE_CHANGED = 'personai:search-engine-changed';

const defaultEngineId = (): string | null => {
  if (typeof navigator === 'undefined') return null;
  return navigator.language?.startsWith('ko') ? 'naver' : 'google';
};

export const getSelectedEngineId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v || null;
  } catch {
    return null;
  }
};

export const setSelectedEngineId = (id: string | null): void => {
  if (typeof window === 'undefined') return;
  if (id) window.localStorage.setItem(STORAGE_KEY, id);
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SEARCH_ENGINE_CHANGED));
};

export const getSelectedEngine = (): SearchEngine | null => {
  const id = getSelectedEngineId() ?? defaultEngineId();
  if (!id) return null;
  return SEARCH_ENGINES.find((e) => e.id === id) ?? null;
};

export const findEngine = (id: string): SearchEngine | undefined =>
  SEARCH_ENGINES.find((e) => e.id === id);

/** 검색 실행 — 새 탭으로. */
export const runSearch = (engine: SearchEngine, query: string): void => {
  const trimmed = query.trim();
  if (!trimmed) return;
  const url = buildSearchUrl(engine, trimmed);
  window.open(url, '_blank', 'noopener,noreferrer');
};

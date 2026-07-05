/**
 * 뉴스 주제 — 브리핑 뉴스 섹션의 관심 분야 (2026-07-06).
 *
 * headline/business/tech/world 중 하나. localStorage + 이벤트 + 훅.
 */
import { useSyncExternalStore } from 'react';
import type { NewsTopic } from '@/services/newsService';

export const NEWS_TOPICS: { key: NewsTopic; label: string }[] = [
  { key: 'headline', label: '헤드라인' },
  { key: 'business', label: '경제' },
  { key: 'tech', label: '기술' },
  { key: 'world', label: '세계' },
];

const KEY = 'personai.news.topic';
const EVENT = 'personai:news-topic-changed';

function read(): NewsTopic {
  if (typeof window === 'undefined') return 'headline';
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw && NEWS_TOPICS.some((t) => t.key === raw)) return raw as NewsTopic;
  } catch {
    /* noop */
  }
  return 'headline';
}

let cache: NewsTopic | null = null;

function snapshot(): NewsTopic {
  if (cache === null) cache = read();
  return cache;
}

export const newsTopicStore = {
  get: snapshot,
  set(topic: NewsTopic): void {
    cache = topic;
    try {
      window.localStorage.setItem(KEY, topic);
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  },
};

function subscribe(cb: () => void): () => void {
  const handler = () => { cache = read(); cb(); };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function useNewsTopic(): NewsTopic {
  return useSyncExternalStore(subscribe, snapshot, () => 'headline');
}

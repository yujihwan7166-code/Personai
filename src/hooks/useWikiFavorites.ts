import { useCallback, useEffect, useState } from 'react';

const FAV_KEY = 'wiki_favorites_v1';
const RECENT_KEY = 'wiki_recent_v1';
const RECENT_MAX = 10;

function loadIds(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

export function useWikiFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => loadIds(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => loadIds(RECENT_KEY));

  useEffect(() => { saveIds(FAV_KEY, favorites); }, [favorites]);
  useEffect(() => { saveIds(RECENT_KEY, recent); }, [recent]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const recordView = useCallback((id: string) => {
    setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_MAX));
  }, []);

  /** 페이지 삭제 시 함께 정리 */
  const purge = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((x) => x !== id));
    setRecent((prev) => prev.filter((x) => x !== id));
  }, []);

  return { favorites, recent, toggleFavorite, isFavorite, recordView, purge };
}

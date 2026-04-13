import { useCallback, useMemo, useState } from 'react';

const FAVORITES_STORAGE_KEY = 'ai-debate-favorites';

export function useFavoriteExperts() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const storedValue = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return storedValue ? JSON.parse(storedValue) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((previousIds) => {
      const nextIds = previousIds.includes(id)
        ? previousIds.filter((favoriteId) => favoriteId !== id)
        : [...previousIds, id];

      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  return {
    favoriteIds,
    favoriteSet,
    toggleFavorite,
  };
}

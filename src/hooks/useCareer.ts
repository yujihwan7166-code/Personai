/**
 * 스펙 보드 데이터 훅 — CAREER_CHANGED 이벤트 listen 으로 자동 re-render.
 */
import { useCallback, useEffect, useState } from 'react';
import { careerStore } from '@/services/careerStore';
import { CAREER_CHANGED, type SpecCategory, type SpecItem } from '@/types/career';

export const useCareerBoard = (): { items: SpecItem[]; categories: SpecCategory[] } => {
  const [items, setItems] = useState<SpecItem[]>(() => careerStore.listItems());
  const [categories, setCategories] = useState<SpecCategory[]>(() => careerStore.listCategories());

  const refresh = useCallback(() => {
    setItems(careerStore.listItems());
    setCategories(careerStore.listCategories());
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(CAREER_CHANGED, refresh);
    return () => window.removeEventListener(CAREER_CHANGED, refresh);
  }, [refresh]);

  return { items, categories };
};

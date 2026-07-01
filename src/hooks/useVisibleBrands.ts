/**
 * 히어로 칩 스트립에 표시할 AI 브랜드 목록 훅.
 *
 * localStorage 로 사용자별 커스텀 목록 저장 (기본은 8개 전체).
 * `+` 버튼 → AI 편집 창에서 토글 가능.
 */
import { useCallback, useEffect, useState } from 'react';
import { BRANDS, type BrandId } from '@/lib/aiBrands';

const STORAGE_KEY = 'personai.hero.visible_brands';
const CHANGED_EVENT = 'personai:hero-visible-brands-changed';

const ALL_IDS: BrandId[] = BRANDS.map((b) => b.id);

function readStored(): BrandId[] {
  if (typeof window === 'undefined') return ALL_IDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_IDS;
    const parsed = JSON.parse(raw) as string[];
    // 유효한 BrandId 만 필터.
    const valid = parsed.filter((id): id is BrandId => ALL_IDS.includes(id as BrandId));
    return valid.length > 0 ? valid : ALL_IDS;
  } catch {
    return ALL_IDS;
  }
}

export function useVisibleBrands(): {
  visibleIds: BrandId[];
  toggleBrand: (id: BrandId) => void;
  showAll: () => void;
  isVisible: (id: BrandId) => boolean;
} {
  const [visibleIds, setVisibleIds] = useState<BrandId[]>(readStored);

  useEffect(() => {
    const handler = () => setVisibleIds(readStored());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const persist = useCallback((next: BrandId[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setVisibleIds(next);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }, []);

  const toggleBrand = useCallback(
    (id: BrandId) => {
      const isOn = visibleIds.includes(id);
      // 마지막 하나 남았을 땐 끄지 않음 (칩 스트립이 비면 안 됨).
      if (isOn && visibleIds.length <= 1) return;
      const next = isOn
        ? visibleIds.filter((v) => v !== id)
        : // BRANDS 배열 순서 유지하며 추가.
          ALL_IDS.filter((v) => visibleIds.includes(v) || v === id);
      persist(next);
    },
    [visibleIds, persist],
  );

  const showAll = useCallback(() => {
    persist(ALL_IDS);
  }, [persist]);

  const isVisible = useCallback((id: BrandId) => visibleIds.includes(id), [visibleIds]);

  return { visibleIds, toggleBrand, showAll, isVisible };
}

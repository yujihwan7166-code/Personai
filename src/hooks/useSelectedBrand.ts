/**
 * 히어로 대표 AI 브랜드 선택 훅. localStorage 동기화 + 커스텀 이벤트로 다른 탭/컴포넌트 반영.
 */
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_BRAND, SELECTED_BRAND_KEY, type BrandId } from '@/lib/aiBrands';

const CHANGED_EVENT = 'personai:hero-brand-changed';

import { BRAND_BY_ID } from '@/lib/aiBrands';

function readStored(): BrandId {
  if (typeof window === 'undefined') return DEFAULT_BRAND;
  try {
    const raw = window.localStorage.getItem(SELECTED_BRAND_KEY);
    // 유효한 BrandId 인 경우에만 반환 (구버전 값 e.g. 'copilot' 대응).
    if (raw && BRAND_BY_ID[raw as BrandId]) return raw as BrandId;
  } catch {
    /* noop */
  }
  return DEFAULT_BRAND;
}

export function useSelectedBrand(): {
  brand: BrandId;
  setBrand: (b: BrandId) => void;
} {
  const [brand, setBrandState] = useState<BrandId>(readStored);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<BrandId>).detail;
      if (detail) setBrandState(detail);
    };
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const setBrand = useCallback((next: BrandId) => {
    setBrandState(next);
    try {
      window.localStorage.setItem(SELECTED_BRAND_KEY, next);
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent<BrandId>(CHANGED_EVENT, { detail: next }));
  }, []);

  return { brand, setBrand };
}

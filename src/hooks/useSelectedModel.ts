/**
 * 브랜드별 선택된 모델 훅 — localStorage 로 브랜드마다 독립 동기화.
 * key: `personai.hero.selected_model.{brandId}` → 값 = model.id.
 *
 * 브랜드가 바뀌면 이 훅도 새 브랜드의 스토리지 키를 읽음.
 * 저장된 값이 브랜드의 models 안에 없으면 default 로 폴백.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  BRAND_BY_ID,
  SELECTED_MODEL_KEY_PREFIX,
  getDefaultModel,
  type BrandId,
  type BrandModel,
} from '@/lib/aiBrands';

const CHANGED_EVENT = 'personai:hero-model-changed';

function keyFor(brandId: BrandId): string {
  return `${SELECTED_MODEL_KEY_PREFIX}${brandId}`;
}

function readStored(brandId: BrandId): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(keyFor(brandId));
  } catch {
    return null;
  }
}

function resolveModel(brandId: BrandId, stored: string | null): BrandModel {
  const brand = BRAND_BY_ID[brandId];
  if (stored) {
    const found = brand.models.find((m) => m.id === stored);
    if (found) return found;
  }
  return getDefaultModel(brand);
}

export function useSelectedModel(brandId: BrandId): {
  model: BrandModel;
  setModel: (modelId: string) => void;
} {
  const [modelState, setModelState] = useState<BrandModel>(() =>
    resolveModel(brandId, readStored(brandId)),
  );

  // 브랜드가 바뀌면 그 브랜드의 저장된/기본 모델로 스위칭.
  useEffect(() => {
    setModelState(resolveModel(brandId, readStored(brandId)));
  }, [brandId]);

  // 다른 곳에서 setModel 호출 시 동기화.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ brandId: BrandId; modelId: string }>).detail;
      if (!detail || detail.brandId !== brandId) return;
      setModelState(resolveModel(brandId, detail.modelId));
    };
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, [brandId]);

  const setModel = useCallback(
    (modelId: string) => {
      const next = resolveModel(brandId, modelId);
      setModelState(next);
      try {
        window.localStorage.setItem(keyFor(brandId), next.id);
      } catch {
        /* noop */
      }
      window.dispatchEvent(
        new CustomEvent(CHANGED_EVENT, {
          detail: { brandId, modelId: next.id },
        }),
      );
    },
    [brandId],
  );

  return { model: modelState, setModel };
}

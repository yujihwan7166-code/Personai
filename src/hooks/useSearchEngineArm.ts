/**
 * 검색 칩 armed 상태 훅.
 *   - null 이면 AI 모드로 라우팅 (기본).
 *   - 특정 chipId 로 armed 되면 입력창 placeholder / 색이 바뀌고,
 *     Enter 시 외부 검색으로 이동.
 *   - 같은 칩을 다시 누르면 disarm (null).
 *
 * 2026-07-04: 로컬 state → 모듈 공유 스토어 (커스텀 이벤트 동기화).
 * HeroSection 내부 캔버스만 armed 를 알고 Index 의 외부 hero-brand-canvas 는
 * AI 브랜드를 유지해 배경이 안 바뀌던 버그 수정 — 이제 어디서든 같은 값.
 */
import { useCallback, useEffect, useState } from 'react';
import type { HeroChipId } from '@/lib/heroSearchChips';

const CHANGED_EVENT = 'personai:search-arm-changed';

let currentArmed: HeroChipId | null = null;

function setArmedShared(next: HeroChipId | null): void {
  currentArmed = next;
  window.dispatchEvent(new CustomEvent<HeroChipId | null>(CHANGED_EVENT, { detail: next }));
}

export function useSearchEngineArm(): {
  armed: HeroChipId | null;
  toggle: (id: HeroChipId) => void;
  disarm: () => void;
} {
  const [armed, setLocal] = useState<HeroChipId | null>(currentArmed);

  useEffect(() => {
    const handler = (e: Event) => {
      setLocal((e as CustomEvent<HeroChipId | null>).detail ?? null);
    };
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const toggle = useCallback((id: HeroChipId) => {
    setArmedShared(currentArmed === id ? null : id);
  }, []);

  const disarm = useCallback(() => {
    setArmedShared(null);
  }, []);

  return { armed, toggle, disarm };
}

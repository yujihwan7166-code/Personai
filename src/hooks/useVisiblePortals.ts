/**
 * 히어로 좌측 포탈 칩 스트립에 표시할 목록 훅.
 *
 * 기본: naver / google / daum (한국 3대 검색).
 * `+` 버튼 → 편집 창에서 유튜브·트위터·GitHub·Reddit·위키 등 추가 가능.
 * localStorage 로 사용자 커스텀 목록 저장.
 */
import { useCallback, useEffect, useState } from 'react';
import { HERO_SEARCH_CHIPS, type HeroChipId } from '@/lib/heroSearchChips';

const STORAGE_KEY = 'personai.hero.visible_portals';
const CHANGED_EVENT = 'personai:hero-visible-portals-changed';

const ALL_IDS: HeroChipId[] = HERO_SEARCH_CHIPS.map((c) => c.id);
const DEFAULT_VISIBLE: HeroChipId[] = ['naver', 'google', 'daum'];

function readStored(): HeroChipId[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id): id is HeroChipId =>
      ALL_IDS.includes(id as HeroChipId),
    );
    return valid.length > 0 ? valid : DEFAULT_VISIBLE;
  } catch {
    return DEFAULT_VISIBLE;
  }
}

export function useVisiblePortals(): {
  visibleIds: HeroChipId[];
  togglePortal: (id: HeroChipId) => void;
  resetDefaults: () => void;
} {
  const [visibleIds, setVisibleIds] = useState<HeroChipId[]>(readStored);

  useEffect(() => {
    const handler = () => setVisibleIds(readStored());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const persist = useCallback((next: HeroChipId[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setVisibleIds(next);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }, []);

  const togglePortal = useCallback(
    (id: HeroChipId) => {
      const isOn = visibleIds.includes(id);
      // 최소 1개는 유지.
      if (isOn && visibleIds.length <= 1) return;
      const next = isOn
        ? visibleIds.filter((v) => v !== id)
        : ALL_IDS.filter((v) => visibleIds.includes(v) || v === id);
      persist(next);
    },
    [visibleIds, persist],
  );

  const resetDefaults = useCallback(() => {
    persist(DEFAULT_VISIBLE);
  }, [persist]);

  return { visibleIds, togglePortal, resetDefaults };
}

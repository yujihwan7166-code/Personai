/**
 * 히어로 좌측 포탈 칩 스트립에 표시할 목록 훅.
 *
 * 기본: naver / google / daum (한국 3대 검색).
 * `+` 버튼 → 편집 창에서 유튜브·트위터·GitHub·Reddit·위키 등 추가 가능.
 * localStorage 로 사용자 커스텀 목록 저장.
 */
import { useCallback, useEffect, useState } from 'react';
import { HERO_SEARCH_CHIPS, type HeroChipId } from '@/lib/heroSearchChips';
import { isCustomPortalId } from '@/lib/customPortal';

const STORAGE_KEY = 'personai.hero.visible_portals';
const CHANGED_EVENT = 'personai:hero-visible-portals-changed';

const BUILT_IN_IDS: HeroChipId[] = HERO_SEARCH_CHIPS.map((c) => c.id);
const DEFAULT_VISIBLE: HeroChipId[] = ['naver', 'google', 'daum'];

/** 유효한 포탈 id 인지 (built-in 또는 custom-portal-*). */
function isValidPortalId(id: string): boolean {
  return BUILT_IN_IDS.includes(id as HeroChipId) || isCustomPortalId(id);
}

function readStored(): HeroChipId[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id): id is HeroChipId => isValidPortalId(id));
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
      // 켜기: 원래 순서 유지하되 새 id 는 끝에 추가.
      const next = isOn
        ? visibleIds.filter((v) => v !== id)
        : [...visibleIds, id];
      persist(next);
    },
    [visibleIds, persist],
  );

  const resetDefaults = useCallback(() => {
    persist(DEFAULT_VISIBLE);
  }, [persist]);

  return { visibleIds, togglePortal, resetDefaults };
}

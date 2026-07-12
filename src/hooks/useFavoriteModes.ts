/**
 * 즐겨찾기 모드 — 공유 스토어.
 *
 * ModeMenu(별 토글)와 HeroSection 칩 줄이 같은 목록을 실시간 공유해야 해서
 * useSelectedBrand 와 동일한 모듈 상태 + CustomEvent 패턴.
 * 저장소는 기존 personai.favorite_modes 그대로 재사용.
 *
 * 최대 6개 (MAX_FAVS) — 모드 메뉴 하단 독 6칸과 1:1. 초과 시 toggleFav 가 'full' 반환.
 */
import { useEffect, useState } from 'react';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';

export type ItemTarget =
  | { kind: 'mode'; mode: MainMode }
  | { kind: 'debate'; sub: DebateSubMode }
  | { kind: 'premium'; domainId: PremiumDomainId }
  | { kind: 'assistant'; cardId: string }
  | { kind: 'life'; toolId: string }
  | { kind: 'player'; toolId: string }
  | { kind: 'hub'; hubId: string };

export interface FavEntry {
  id: string;
  label: string;
  desc?: string;
  tint: string;
  target: ItemTarget;
}

export const MAX_FAVS = 6;

const FAV_KEY = 'personai.favorite_modes';
const EVENT = 'personai:favorites-changed';

function readFavs(): FavEntry[] {
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavEntry[];
    return Array.isArray(parsed) ? parsed.filter((r) => r?.target?.kind) : [];
  } catch {
    return [];
  }
}

let favsState: FavEntry[] | null = null;

function getFavs(): FavEntry[] {
  if (favsState === null) favsState = readFavs();
  return favsState;
}

function setFavs(next: FavEntry[]): void {
  favsState = next;
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useFavoriteModes() {
  const [favs, setLocal] = useState<FavEntry[]>(() => getFavs());

  useEffect(() => {
    const sync = () => setLocal(getFavs());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const isFav = (id: string) => favs.some((f) => f.id === id);

  /** 토글 결과 — 'full' 이면 호출 측에서 안내 (5개 제한). */
  const toggleFav = (entry: FavEntry): 'added' | 'removed' | 'full' => {
    const cur = getFavs();
    if (cur.some((f) => f.id === entry.id)) {
      setFavs(cur.filter((f) => f.id !== entry.id));
      return 'removed';
    }
    if (cur.length >= MAX_FAVS) return 'full';
    setFavs([...cur, entry]);
    return 'added';
  };

  const removeFav = (id: string) => {
    setFavs(getFavs().filter((f) => f.id !== id));
  };

  return { favs, isFav, toggleFav, removeFav };
}

/**
 * 마이위키 — 자동 시드 비활성화.
 *
 * 첫 진입 시 빈 위키 + WikiHome 의 스타터 팩 화면을 보이도록 자동 시드는
 * 비웠다. 사용자가 4 스타터 팩 (학습자/연구자/직장인/취미) 또는 빈 페이지로
 * 시작 중 선택한다.
 *
 * 시드 플래그(SEED_KEY)는 그대로 유지 — 기존 사용자에 영향 없음.
 * 함수 시그니처도 그대로 두어 useWikiPages 의 호출 코드 변경 X.
 */

import type { WikiPage } from '@/types/wiki';

const SEED_KEY = 'wiki_seeded_v1';

export function isWikiSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SEED_KEY) === '1';
}

export function markWikiSeeded(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEED_KEY, '1');
}

/** 자동 시드 페이지를 만들지 않는다. 빈 위키로 두어 스타터 팩 UI 가 동작. */
export async function seedWiki(): Promise<WikiPage[]> {
  markWikiSeeded();
  return [];
}

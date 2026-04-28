/**
 * 마이위키 첫 방문 시 시드 — 4 메인 (나·인맥·프로젝트·주식) + 하위 페이지들 자동 생성.
 * 시드 플래그(localStorage)로 한 번만 실행, 사용자가 지우면 재생성 X.
 *
 * 본문 [[wikilink]] 는 시드 시점에 refersTo 로 자동 채움.
 * 각 하위 페이지의 parentMocs 는 도메인 파일에서 이미 부착됨.
 */

import type { WikiPage } from '@/types/wiki';
import { upsertPage } from '@/lib/wikiStore';
import { buildAllSeedPages } from '@/lib/wikiSeedData';

const SEED_KEY = 'wiki_seeded_v1';

export function isWikiSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SEED_KEY) === '1';
}

export function markWikiSeeded(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEED_KEY, '1');
}

export async function seedWiki(): Promise<WikiPage[]> {
  const pages = buildAllSeedPages();

  // 제목·별칭 → id 인덱스 (refersTo 자동 채움용)
  const titleToId = new Map<string, string>();
  for (const p of pages) {
    titleToId.set(p.title, p.id);
    for (const a of p.aliases) titleToId.set(a, p.id);
  }

  const seeded: WikiPage[] = pages.map((p) => {
    const matches = p.body.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g);
    const refs = new Set<string>();
    for (const m of matches) {
      const id = titleToId.get(m[1].trim());
      if (id && id !== p.id) refs.add(id);
    }
    return { ...p, refersTo: Array.from(refs) };
  });

  for (const p of seeded) await upsertPage(p);
  markWikiSeeded();
  return seeded;
}

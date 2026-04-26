/**
 * 마이위키 데일리 노트 — Logseq/Roam 패턴.
 *
 * 오늘 날짜(YYYY-MM-DD) 제목의 페이지를 자동 생성/조회.
 * type='index', tags=['daily'] — 일반 페이지와 구분.
 * 본문 템플릿: ## 오늘 / ## 메모 / ## 어제 회고 ([[어제 날짜]] 자동 임베드)
 */

import type { WikiPage } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';
import { loadAllPages } from '@/lib/wikiStore';

function pad(n: number): string { return String(n).padStart(2, '0'); }

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

function buildBody(yesterday: string): string {
  return `## 오늘

-

## 메모

-

## 어제 회고

[[${yesterday}]] 의 마무리 — 못한 것·이어서 할 것.
`;
}

/** 오늘 날짜 페이지가 있으면 반환, 없으면 새 페이지 객체 생성(저장은 호출자). */
export async function getOrBuildTodayNote(): Promise<{ page: WikiPage; created: boolean }> {
  const today = todayKey();
  const yesterday = yesterdayKey();
  const all = await loadAllPages();
  const existing = all.find((p) => p.title === today);
  if (existing) return { page: existing, created: false };
  const now = Date.now();
  const page: WikiPage = {
    id: newWikiId(),
    title: today,
    aliases: [],
    type: 'index',
    status: 'active',
    tags: ['daily'],
    body: buildBody(yesterday),
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: now,
    updatedAt: now,
  };
  return { page, created: true };
}

export function isDailyNoteTitle(title: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(title);
}

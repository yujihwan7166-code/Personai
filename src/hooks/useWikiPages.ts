/**
 * 마이위키 페이지 컬렉션 훅 — IDB CRUD + 메모리 캐시 + dirty 추적.
 *
 * 책임:
 * - 페이지 CRUD
 * - 저장 시 직전 스냅샷을 history 에 기록
 * - 페이지 삭제 시 history·이미지 청소
 * - 본문 [[link]] 자동 refersTo 갱신
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WikiPage } from '@/types/wiki';
import { extractWikiLinks } from '@/types/wiki';
import { deletePage as idbDelete, loadAllPages, normalizeWikiPage, upsertPage as idbUpsert } from '@/lib/wikiStore';
import { isWikiSeeded, seedWiki } from '@/lib/wikiSeed';
import { recordRevision, deleteRevisionsForPage } from '@/lib/wikiHistory';
import { garbageCollectImages } from '@/lib/wikiMaintenance';
import { buildWikiRelations } from '@/lib/wikiQuery';
import { addAliasOnce, rewriteWikiLinkTargets } from '@/lib/wikiLinks';
import { mergeWikiPages, replaceRelationTarget, setWikiPageArchived } from '@/lib/wikiCleanup';

export function useWikiPages() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  // 최신 pages snapshot ref — upsert 시 정확한 title 매핑 + 직전 페이지 가져오기.
  const pagesRef = useRef<WikiPage[]>([]);
  pagesRef.current = pages;

  const reload = useCallback(async () => {
    setLoading(true);
    let all = await loadAllPages();
    if (all.length === 0 && !isWikiSeeded()) {
      await seedWiki();
      all = await loadAllPages();
    }
    setPages(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let all = await loadAllPages();
      if (all.length === 0 && !isWikiSeeded()) {
        await seedWiki();
        all = await loadAllPages();
      }
      if (!cancelled) {
        setPages(all);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** 본문에서 [[link]] 추출 → refersTo 자동 갱신 + 직전 스냅샷 history 기록 후 저장. */
  const upsertPage = useCallback(async (page: WikiPage) => {
    const safePage = normalizeWikiPage(page);
    if (!safePage) throw new Error('Invalid wiki page');
    // 직전 페이지 (있으면 history 에 기록할 스냅샷)
    const prev = pagesRef.current.find((p) => p.id === safePage.id);

    // title → id 매핑 (현재 정확한 snapshot 기준)
    const titleToId = new Map<string, string>();
    for (const p of pagesRef.current) {
      titleToId.set(p.id.toLowerCase(), p.id);
      titleToId.set(p.title.trim().toLowerCase(), p.id);
      for (const a of p.aliases ?? []) titleToId.set(a.trim().toLowerCase(), p.id);
    }

    const renamed = prev && prev.title.trim() !== safePage.title.trim();
    const safeWithRenameAlias: WikiPage = renamed
      ? { ...safePage, aliases: addAliasOnce(safePage.aliases, prev.title) }
      : safePage;

    const linkedTitles = extractWikiLinks(safeWithRenameAlias.body);
    const refersTo = [...new Set(linkedTitles
      .map((t) => titleToId.get(t.trim().toLowerCase()))
      .filter((id): id is string => !!id && id !== safeWithRenameAlias.id))];

    const next: WikiPage = {
      ...safeWithRenameAlias,
      refersTo,
      updatedAt: Date.now(),
    };

    // 직전 스냅샷이 본문 또는 제목/메타가 다르면 히스토리 기록
    if (prev && hasMeaningfulChange(prev, next)) {
      void recordRevision(prev);
    }

    await idbUpsert(next);
    let repairedPages: WikiPage[] = [];
    if (renamed && prev) {
      repairedPages = await repairIncomingLinksAfterRename(prev, next, pagesRef.current);
    }

    setPages((cur) => {
      const i = cur.findIndex((p) => p.id === next.id);
      const copy = i === -1 ? [next, ...cur] : cur.slice();
      if (i !== -1) copy[i] = next;
      for (const repaired of repairedPages) {
        const idx = copy.findIndex((p) => p.id === repaired.id);
        if (idx >= 0) copy[idx] = repaired;
        else copy.push(repaired);
      }
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    });
    return next;
  }, []);

  const deletePage = useCallback(async (id: string) => {
    await idbDelete(id);
    void deleteRevisionsForPage(id);
    // 비활성: 즉시 GC 는 사용자가 직접 트리거 — 삭제 직후 자동 정리는 사용량 패널 권장.
    // 단, 현재 페이지 삭제로 더 이상 어디서도 참조 안 되는 이미지를 백그라운드 정리.
    void garbageCollectImages().catch(() => {});
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const archivePage = useCallback(async (id: string) => {
    const prev = pagesRef.current.find((p) => p.id === id);
    if (!prev) throw new Error('보관할 페이지를 찾지 못했습니다.');
    if (prev.status === 'archived') return prev;

    const next = setWikiPageArchived(prev, true);
    await recordRevision(prev);
    await idbUpsert(next);
    setPages((cur) => cur.map((p) => (p.id === id ? next : p)).sort((a, b) => b.updatedAt - a.updatedAt));
    return next;
  }, []);

  const restoreArchivedPage = useCallback(async (id: string) => {
    const prev = pagesRef.current.find((p) => p.id === id);
    if (!prev) throw new Error('복원할 페이지를 찾지 못했습니다.');
    if (prev.status !== 'archived') return prev;

    const next = setWikiPageArchived(prev, false);
    await recordRevision(prev);
    await idbUpsert(next);
    setPages((cur) => cur.map((p) => (p.id === id ? next : p)).sort((a, b) => b.updatedAt - a.updatedAt));
    return next;
  }, []);

  const mergePages = useCallback(async (primaryId: string, secondaryId: string) => {
    if (primaryId === secondaryId) return;
    const primary = pagesRef.current.find((p) => p.id === primaryId);
    const secondary = pagesRef.current.find((p) => p.id === secondaryId);
    if (!primary || !secondary) throw new Error('병합할 페이지를 찾지 못했습니다.');

    const { merged, archived } = mergeWikiPages({ primary, secondary });
    await recordRevision(primary);
    await recordRevision(secondary);
    await idbUpsert(merged);
    await idbUpsert(archived);

    const titleMap = new Map<string, string>();
    titleMap.set(secondary.id.toLowerCase(), merged.title);
    titleMap.set(secondary.title.trim().toLowerCase(), merged.title);
    for (const alias of secondary.aliases) titleMap.set(alias.trim().toLowerCase(), merged.title);

    const repaired: WikiPage[] = [];
    for (const page of pagesRef.current) {
      if (page.id === merged.id || page.id === archived.id) continue;
      const fixed = repairPageReferences(page, archived.id, merged.id, titleMap);
      if (!fixed) continue;
      await recordRevision(page);
      await idbUpsert(fixed);
      repaired.push(fixed);
    }

    setPages((cur) => {
      const next = cur.map((page) => {
        if (page.id === merged.id) return merged;
        if (page.id === archived.id) return archived;
        return repaired.find((fixed) => fixed.id === page.id) ?? page;
      });
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });

    return merged;
  }, []);

  /** 직전 버전으로 복원 — history 에서 받은 snapshot 으로 upsert. */
  const restoreRevision = useCallback(async (snapshot: WikiPage) => {
    // upsertPage 가 직전 페이지를 자동으로 history 에 기록하므로
    // restore 자체도 새 revision 으로 남는다.
    return upsertPage(snapshot);
  }, [upsertPage]);

  const getBacklinks = useCallback((id: string): WikiPage[] => {
    const relations = buildWikiRelations(pages);
    const ids = relations.backlinks.get(id);
    if (!ids) return [];
    return [...ids]
      .map((sourceId) => relations.byId.get(sourceId))
      .filter((page): page is WikiPage => !!page)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [pages]);

  const findByTitle = useCallback((title: string): WikiPage | undefined => {
    const t = title.trim().toLowerCase();
    return pages.find((p) => p.title.trim().toLowerCase() === t || (p.aliases ?? []).some((a) => a.trim().toLowerCase() === t));
  }, [pages]);

  /** ID(`w_xxx`) 또는 제목으로 페이지 찾기. ID 우선, 없으면 제목 매칭. */
  const findByIdOrTitle = useCallback((target: string): WikiPage | undefined => {
    const t = target.trim();
    if (t.startsWith('w_')) {
      const byId = pages.find((p) => p.id === t);
      if (byId) return byId;
    }
    const lower = t.toLowerCase();
    return pages.find((p) => p.title.trim().toLowerCase() === lower || (p.aliases ?? []).some((a) => a.trim().toLowerCase() === lower));
  }, [pages]);

  return {
    pages,
    loading,
    upsertPage,
    deletePage,
    archivePage,
    restoreArchivedPage,
    mergePages,
    restoreRevision,
    getBacklinks,
    findByTitle,
    findByIdOrTitle,
    reload,
  };
}

function repairPageReferences(page: WikiPage, fromId: string, toId: string, titleMap: Map<string, string>): WikiPage | null {
  const body = rewriteWikiLinkTargets(page.body, titleMap);
  const next: WikiPage = {
    ...page,
    body,
    refersTo: replaceRelationTarget(page.refersTo, fromId, toId),
    cites: replaceRelationTarget(page.cites, fromId, toId),
    inherits: replaceRelationTarget(page.inherits, fromId, toId),
    similarTo: replaceRelationTarget(page.similarTo, fromId, toId),
    parentMocs: replaceRelationTarget(page.parentMocs, fromId, toId),
  };
  const changed = body !== page.body
    || next.refersTo.join('|') !== page.refersTo.join('|')
    || next.cites.join('|') !== page.cites.join('|')
    || next.inherits.join('|') !== page.inherits.join('|')
    || next.similarTo.join('|') !== page.similarTo.join('|')
    || next.parentMocs.join('|') !== page.parentMocs.join('|');
  return changed ? { ...next, updatedAt: Date.now() } : null;
}

async function repairIncomingLinksAfterRename(prev: WikiPage, next: WikiPage, pages: WikiPage[]): Promise<WikiPage[]> {
  const titleMap = new Map([[prev.title.trim().toLowerCase(), next.title]]);
  const repaired: WikiPage[] = [];

  for (const page of pages) {
    if (page.id === next.id) continue;
    const body = rewriteWikiLinkTargets(page.body, titleMap);
    if (body === page.body) continue;
    const fixed: WikiPage = {
      ...page,
      body,
      updatedAt: Date.now(),
    };
    await recordRevision(page);
    await idbUpsert(fixed);
    repaired.push(fixed);
  }

  return repaired;
}

/** 의미 있는 변경인지 — 메타 변경 + 본문 변경. timestamp 만 다른 건 제외. */
function hasMeaningfulChange(prev: WikiPage, next: WikiPage): boolean {
  if (prev.title !== next.title) return true;
  if (prev.body !== next.body) return true;
  if (prev.type !== next.type) return true;
  if (prev.status !== next.status) return true;
  if (prev.category !== next.category) return true;
  if ((prev.tags ?? []).join('|') !== (next.tags ?? []).join('|')) return true;
  if ((prev.aliases ?? []).join('|') !== (next.aliases ?? []).join('|')) return true;
  return false;
}

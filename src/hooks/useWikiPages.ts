/**
 * 마이위키 페이지 컬렉션 훅 — IDB CRUD + 메모리 캐시 + dirty 추적.
 *
 * 컴포넌트는 이 훅 하나만 호출하면 되고, 내부에서 wikiStore 와 동기화한다.
 */

import { useCallback, useEffect, useState } from 'react';
import type { WikiPage } from '@/types/wiki';
import { extractWikiLinks } from '@/types/wiki';
import { deletePage as idbDelete, loadAllPages, upsertPage as idbUpsert } from '@/lib/wikiStore';

export function useWikiPages() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadAllPages().then((all) => {
      if (!cancelled) {
        setPages(all);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  /** 본문에서 [[link]] 추출 → refersTo 자동 갱신 후 저장. */
  const upsertPage = useCallback(async (page: WikiPage) => {
    const titleToId = new Map<string, string>();
    setPages((prev) => {
      for (const p of prev) {
        titleToId.set(p.title, p.id);
        for (const a of p.aliases) titleToId.set(a, p.id);
      }
      return prev;
    });
    // 위 setPages 는 반환만 하고 prev 를 안 바꾸지만, snapshot 이 클로저에 잡힘.
    // 더 정확하게는 ref 로 잡는 것이 좋지만 v1 에서는 충분.

    const linkedTitles = extractWikiLinks(page.body);
    const refersTo = linkedTitles
      .map((t) => titleToId.get(t))
      .filter((id): id is string => !!id && id !== page.id);

    const next: WikiPage = {
      ...page,
      refersTo,
      updatedAt: Date.now(),
    };
    await idbUpsert(next);
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === next.id);
      const copy = i === -1 ? [next, ...prev] : prev.slice();
      if (i !== -1) copy[i] = next;
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    });
    return next;
  }, []);

  const deletePage = useCallback(async (id: string) => {
    await idbDelete(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** 백링크 — 이 id 를 참조하는 페이지 목록. */
  const getBacklinks = useCallback((id: string): WikiPage[] => {
    return pages.filter((p) => p.refersTo.includes(id) || p.cites.includes(id));
  }, [pages]);

  /** 제목 또는 alias 로 페이지 조회. */
  const findByTitle = useCallback((title: string): WikiPage | undefined => {
    const t = title.trim();
    return pages.find((p) => p.title === t || p.aliases.includes(t));
  }, [pages]);

  return {
    pages,
    loading,
    upsertPage,
    deletePage,
    getBacklinks,
    findByTitle,
  };
}

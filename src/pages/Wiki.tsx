import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useWikiPages } from '@/hooks/useWikiPages';
import { createEmptyWikiPage, type WikiPage } from '@/types/wiki';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiPageView } from '@/components/wiki/WikiPageView';
import { WikiHome } from '@/components/wiki/WikiHome';

/**
 * /wiki — 마이위키 풀스크린 페이지.
 * 좌: 사이드바 (검색·필터·페이지 리스트)
 * 우: 활성 페이지가 있으면 뷰어/에디터, 없으면 홈 대시보드.
 */
const Wiki = () => {
  const { pages, loading, upsertPage, deletePage, getBacklinks, findByTitle } = useWikiPages();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const activePage = activeId ? pages.find((p) => p.id === activeId) ?? null : null;

  const handleCreate = async (overrides: Partial<WikiPage> = {}) => {
    const next = createEmptyWikiPage(overrides);
    await upsertPage(next);
    setActiveId(next.id);
    setEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 페이지를 삭제할까요?')) return;
    await deletePage(id);
    if (activeId === id) {
      setActiveId(null);
      setEditing(false);
    }
  };

  const handleOpenByTitle = (title: string) => {
    const found = findByTitle(title);
    if (found) {
      setActiveId(found.id);
      setEditing(false);
    } else {
      // 미존재 — 새 페이지로 만들기 (제목만 채워서)
      void handleCreate({ title });
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-[260px] shrink-0 h-full border-r border-[hsl(var(--hairline))] flex flex-col">
        <div className="px-3 py-2.5 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
          <Link
            to="/"
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-[13px] font-bold">🌐 마이위키</span>
        </div>
        <WikiSidebar
          pages={pages}
          loading={loading}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setEditing(false); }}
          onCreate={() => handleCreate()}
        />
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {activePage ? (
          <WikiPageView
            page={activePage}
            editing={editing}
            backlinks={getBacklinks(activePage.id)}
            onChange={(next) => { void upsertPage(next); }}
            onDelete={() => handleDelete(activePage.id)}
            onToggleEdit={() => setEditing((v) => !v)}
            onOpenLink={handleOpenByTitle}
          />
        ) : (
          <WikiHome
            pages={pages}
            onSelect={(id) => setActiveId(id)}
            onCreate={() => handleCreate()}
          />
        )}
      </main>
    </div>
  );
};

export default Wiki;

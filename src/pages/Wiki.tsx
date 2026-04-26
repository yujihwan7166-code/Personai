import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import '@/styles/wiki.css';
import { useWikiPages } from '@/hooks/useWikiPages';
import { createEmptyWikiPage, type WikiPage } from '@/types/wiki';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiPageView } from '@/components/wiki/WikiPageView';
import { WikiHome } from '@/components/wiki/WikiHome';
import { cn } from '@/lib/utils';

const SIDEBAR_KEY = 'wiki_sidebar_open';

/**
 * /wiki — 마이위키 풀스크린 페이지.
 * 좌: 사이드바 (검색·필터·페이지 리스트, 토글 가능)
 * 우: 활성 페이지가 있으면 뷰어/에디터, 없으면 홈 대시보드.
 */
const Wiki = () => {
  const { pages, loading, upsertPage, deletePage, getBacklinks, findByTitle } = useWikiPages();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_KEY) !== '0';
  });

  const activePage = activeId ? pages.find((p) => p.id === activeId) ?? null : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const handleCreate = useCallback(async (overrides: Partial<WikiPage> = {}) => {
    const next = createEmptyWikiPage(overrides);
    await upsertPage(next);
    setActiveId(next.id);
    setEditing(true);
  }, [upsertPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 페이지를 삭제할까요?')) return;
    await deletePage(id);
    if (activeId === id) {
      setActiveId(null);
      setEditing(false);
    }
  };

  // 백링크는 id, 위키링크는 title 을 넘긴다 — 둘 다 처리.
  const handleOpenByTitleOrId = useCallback((titleOrId: string) => {
    const byId = pages.find((p) => p.id === titleOrId);
    if (byId) {
      setActiveId(byId.id);
      setEditing(false);
      return;
    }
    const found = findByTitle(titleOrId);
    if (found) {
      setActiveId(found.id);
      setEditing(false);
    } else {
      void handleCreate({ title: titleOrId });
    }
  }, [pages, findByTitle, handleCreate]);

  // 단축키 — Ctrl/Cmd+N 새 페이지, Ctrl/Cmd+B 사이드바 토글, E 편집 토글, Esc 편집 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditor = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void handleCreate();
      } else if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (!inEditor && e.key.toLowerCase() === 'e' && activePage && !editing) {
        e.preventDefault();
        setEditing(true);
      } else if (!inEditor && e.key === 'Escape' && editing) {
        e.preventDefault();
        setEditing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCreate, activePage, editing]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* 사이드바 — 토글 가능 */}
      <aside
        className={cn(
          'shrink-0 h-full overflow-hidden transition-[width,border-right-width] duration-200 ease-out border-r flex flex-col',
          sidebarOpen
            ? 'w-[260px] border-[hsl(var(--hairline))]'
            : 'w-0 border-r-0',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="w-[260px] h-full flex flex-col">
          <div className="px-3 py-2.5 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
            <Link
              to="/"
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="홈으로"
              title="홈으로"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="text-[13px] font-bold flex-1 text-left truncate hover:text-primary transition-colors"
              title="대문으로"
            >
              🌐 마이위키
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="사이드바 접기 (Ctrl/Cmd+B)"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
          <WikiSidebar
            pages={pages}
            loading={loading}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); setEditing(false); }}
            onCreate={() => handleCreate()}
          />
        </div>
      </aside>

      {/* 사이드바 닫혔을 때 좌측 모서리에 작은 펴기 버튼 */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute top-3 left-3 z-30 p-1.5 rounded-md bg-card border border-[hsl(var(--hairline))] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm"
          title="사이드바 펴기 (Ctrl/Cmd+B)"
          aria-label="사이드바 펴기"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </button>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto relative">
        {activePage ? (
          <WikiPageView
            page={activePage}
            editing={editing}
            backlinks={getBacklinks(activePage.id)}
            allPages={pages}
            findByTitle={findByTitle}
            onChange={(next) => { void upsertPage(next); }}
            onDelete={() => handleDelete(activePage.id)}
            onToggleEdit={() => setEditing((v) => !v)}
            onOpenLink={handleOpenByTitleOrId}
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

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, Network, Menu, CalendarDays, Home, Plus } from 'lucide-react';
import '@/styles/wiki.css';
import { useWikiPages } from '@/hooks/useWikiPages';
import { useWikiFavorites } from '@/hooks/useWikiFavorites';
import type { WikiPage } from '@/types/wiki';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiPageView } from '@/components/wiki/WikiPageView';
import { WikiHome } from '@/components/wiki/WikiHome';
import { WikiGraph } from '@/components/wiki/WikiGraph';
import { WikiSettingsMenu } from '@/components/wiki/WikiSettingsMenu';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiTemplatePicker } from '@/components/wiki/WikiTemplatePicker';
import { WikiHeaderBadges } from '@/components/wiki/WikiHeaderBadges';
import { WikiStoragePanel } from '@/components/wiki/WikiStoragePanel';
import { clearAllPages } from '@/lib/wikiStore';
import { getOrBuildTodayNote, todayKey } from '@/lib/wikiDailyNote';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

const SIDEBAR_KEY = 'wiki_sidebar_open';

const Wiki = () => {
  const { pages, loading, upsertPage, deletePage, getBacklinks, findByTitle, reload, restoreRevision } = useWikiPages();
  const { favorites, recent, toggleFavorite, isFavorite, recordView, purge } = useWikiFavorites();
  // 위키링크 visited 색상용 — 최근 본 + 즐겨찾기 합집합
  const visitedIds = new Set([...recent, ...favorites]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<'page' | 'graph'>('page');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [storageOpen, setStorageOpen] = useState(false);
  // 모바일에선 기본 닫힘, 데스크탑은 localStorage. 768px 미만은 오버레이 모드.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 768) return false;
    return window.localStorage.getItem(SIDEBAR_KEY) !== '0';
  });

  const activePage = activeId ? pages.find((p) => p.id === activeId) ?? null : null;

  // 활성 페이지 변경 시 최근 본 기록
  useEffect(() => {
    if (activeId) recordView(activeId);
  }, [activeId, recordView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openTemplatePicker = useCallback(() => setTemplatePickerOpen(true), []);

  /** 오늘 데일리 노트로 점프 — 없으면 자동 생성. */
  const openTodayNote = useCallback(async () => {
    const { page, created } = await getOrBuildTodayNote();
    if (created) {
      await upsertPage(page);
      notify.success(`${todayKey()} 데일리 노트를 만들었어요`, { duration: 1800 });
    }
    // 저장된 후 useWikiPages 가 setPages 한 시점이 setActiveId 이전이라 안전.
    setActiveId(page.id);
    setEditing(false);
    setView('page');
    if (isMobile) setSidebarOpen(false);
  }, [upsertPage, isMobile]);

  const handleTemplatePicked = useCallback(async (page: WikiPage) => {
    await upsertPage(page);
    setActiveId(page.id);
    setEditing(true);
    setView('page');
    setTemplatePickerOpen(false);
    if (isMobile) setSidebarOpen(false);
  }, [upsertPage, isMobile]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 페이지를 삭제할까요?')) return;
    await deletePage(id);
    purge(id);  // 즐겨찾기·최근 정리
    if (activeId === id) {
      setActiveId(null);
      setEditing(false);
    }
  };

  const handleOpenByTitleOrId = useCallback((titleOrId: string) => {
    const byId = pages.find((p) => p.id === titleOrId);
    if (byId) {
      setActiveId(byId.id);
      setEditing(false);
      if (isMobile) setSidebarOpen(false);
      return;
    }
    const found = findByTitle(titleOrId);
    if (found) {
      setActiveId(found.id);
      setEditing(false);
      if (isMobile) setSidebarOpen(false);
    } else {
      // 미존재 — 즉시 새 페이지로 (제목만 채워서, 빈 본문)
      void (async () => {
        const { newWikiId } = await import('@/types/wiki');
        const now = Date.now();
        const next: WikiPage = {
          id: newWikiId(), title: titleOrId, aliases: [], type: 'concept',
          status: 'draft', tags: [], body: '',
          refersTo: [], cites: [], inherits: [], similarTo: [], parentMocs: [],
          createdAt: now, updatedAt: now,
        };
        await upsertPage(next);
        setActiveId(next.id);
        setEditing(true);
      })();
    }
  }, [pages, findByTitle, upsertPage, isMobile]);

  const handleClearAll = async () => {
    if (!confirm('정말 모든 위키 페이지를 삭제할까요?')) return;
    if (!confirm('한 번 더 확인 — 모든 페이지가 사라집니다.')) return;
    await clearAllPages();
    void reload();
    setActiveId(null);
  };

  // 단축키 — Ctrl/Cmd+N 새 페이지(템플릿 픽커), Ctrl/Cmd+B 사이드바, E 편집, Esc 편집취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditor = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openTemplatePicker();
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
  }, [openTemplatePicker, activePage, editing]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* 모바일: 사이드바 열렸을 때 백드롭 */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 wiki-z-sidebar-overlay bg-black/40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* 활동 스트립 — 데스크탑에선 항상 보이는 좌측 44px 세로 바 */}
      {!isMobile && (
        <nav
          className="shrink-0 h-full w-11 border-r border-[hsl(var(--hairline))] bg-background flex flex-col items-center py-2 gap-1"
          aria-label="마이위키 빠른 액션"
        >
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
              sidebarOpen
                ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title={sidebarOpen ? '페이지 목록 접기 (Ctrl/Cmd+B)' : '페이지 목록 펴기 (Ctrl/Cmd+B)'}
            aria-label={sidebarOpen ? '페이지 목록 접기' : '페이지 목록 펴기'}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <div className="my-1 w-6 h-px bg-[hsl(var(--hairline))]" aria-hidden />
          <StripButton
            label="대문(홈)"
            active={!activeId && view === 'page'}
            onClick={() => { setActiveId(null); setView('page'); }}
            icon={<Home className="h-4 w-4" />}
          />
          <StripButton
            label="오늘 데일리 노트"
            onClick={() => { void openTodayNote(); }}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StripButton
            label="연결 그래프"
            active={view === 'graph'}
            onClick={() => { setView(view === 'graph' ? 'page' : 'graph'); setActiveId(null); }}
            icon={<Network className="h-4 w-4" />}
          />
          <StripButton
            label="새 페이지 (Ctrl/Cmd+N)"
            accent
            onClick={openTemplatePicker}
            icon={<Plus className="h-4 w-4" />}
          />
          <div className="flex-1" aria-hidden />
          <WikiHeaderBadges onOpenStorage={() => setStorageOpen(true)} />
          <WikiSettingsMenu
            onMutated={() => { void reload(); setActiveId(null); }}
            onOpenStorage={() => setStorageOpen(true)}
          />
          <Link
            to="/"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            title="앱으로 돌아가기"
            aria-label="앱으로 돌아가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </nav>
      )}

      {/* 페이지 목록 패널 — 사이드바 펴짐 상태에만 노출 */}
      <aside
        className={cn(
          'shrink-0 h-full overflow-hidden transition-[width,transform,border-right-width] duration-200 ease-out border-r flex flex-col',
          isMobile
            ? 'fixed left-0 top-0 wiki-z-sidebar w-[280px] bg-background border-[hsl(var(--hairline))]'
            : (sidebarOpen
                ? 'w-[244px] border-[hsl(var(--hairline))]'
                : 'w-0 border-r-0'),
          isMobile && !sidebarOpen && '-translate-x-full',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className={cn(isMobile ? 'w-[280px]' : 'w-[244px]', 'h-full flex flex-col')}>
          {/* 패널 헤더 — 모바일은 닫기 버튼 + 타이틀, 데스크탑은 타이틀만 */}
          <div className="px-3 h-10 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
                title="닫기"
                aria-label="닫기"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            )}
            <span
              className="flex-1 text-[12.5px] font-bold text-foreground/90 truncate"
              style={{ fontFamily: 'var(--wiki-font-meta)' }}
            >
              🌐 마이위키
            </span>
          </div>
          <WikiSidebar
            pages={pages}
            loading={loading}
            activeId={activeId}
            favorites={favorites}
            recent={recent}
            externalQuery={sidebarQuery}
            onQueryChange={setSidebarQuery}
            onSelect={(id) => { setActiveId(id); setEditing(false); setView('page'); if (isMobile) setSidebarOpen(false); }}
            onCreate={openTemplatePicker}
          />
        </div>
      </aside>

      {/* 모바일: 사이드바 닫혔을 때 햄버거 */}
      {!sidebarOpen && isMobile && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute top-3 left-3 wiki-z-toolbar p-1.5 rounded-md bg-card border border-[hsl(var(--hairline))] text-muted-foreground hover:text-foreground hover:bg-accent wiki-trans-color shadow-sm"
          title="사이드바 펴기 (Ctrl/Cmd+B)"
          aria-label="사이드바 펴기"
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto relative">
        {view === 'graph' ? (
          <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto">
            <header className="mb-4">
              <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1">
                MY WIKI · GRAPH
              </p>
              <h1 className="text-2xl font-serif font-bold text-foreground"
                style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}>
                연결 그래프
              </h1>
              <p className="text-[12px] text-muted-foreground mt-1">
                전체 페이지를 타입별 클러스터로 시각화. 노드 클릭 → 페이지 열기.
              </p>
            </header>
            <WikiGraph
              pages={pages}
              onSelect={(id) => { setActiveId(id); setView('page'); setEditing(false); }}
            />
          </div>
        ) : activePage ? (
          <WikiPageView
            page={activePage}
            editing={editing}
            backlinks={getBacklinks(activePage.id)}
            allPages={pages}
            findByTitle={findByTitle}
            isFavorite={isFavorite(activePage.id)}
            onToggleFavorite={() => toggleFavorite(activePage.id)}
            visitedIds={visitedIds}
            onChange={(next) => { void upsertPage(next); }}
            onRestore={(snapshot) => { void restoreRevision(snapshot); }}
            onDelete={() => handleDelete(activePage.id)}
            onToggleEdit={() => setEditing((v) => !v)}
            onOpenLink={handleOpenByTitleOrId}
            onTagClick={(tag) => {
              setSidebarQuery(tag);
              setActiveId(null);
              setView('page');
              if (isMobile) setSidebarOpen(true);
            }}
          />
        ) : (
          <WikiHome
            pages={pages}
            onSelect={(id) => setActiveId(id)}
            onCreate={openTemplatePicker}
          />
        )}
      </main>

      {/* 명령 팔레트 (Ctrl/Cmd+K) */}
      <WikiCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        pages={pages}
        onOpen={(id) => { setActiveId(id); setView('page'); setEditing(false); }}
        onCreate={openTemplatePicker}
        onGoHome={() => { setActiveId(null); setView('page'); }}
        onGoGraph={() => { setView('graph'); setActiveId(null); }}
        onImport={() => {
          // 가벼운 트리거 — 실제 파일 picker 는 settings menu 안에 있음.
          notify.info('백업 가져오기는 사이드바 ⚙ 설정 메뉴에서', { duration: 3500 });
        }}
        onClearAll={handleClearAll}
      />

      {/* 템플릿 픽커 */}
      <WikiTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onPick={handleTemplatePicked}
      />

      {/* 저장소 사용량 — 헤더 배지·설정 메뉴 둘 다에서 열 수 있게 위로 lift */}
      <WikiStoragePanel open={storageOpen} onClose={() => setStorageOpen(false)} />
    </div>
  );
};

/* ── 활동 스트립 버튼 — 정렬·active·accent 톤 일관 ── */
function StripButton({
  label, onClick, icon, active, accent,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
        active
          ? 'bg-primary/10 text-primary'
          : accent
            ? 'text-primary hover:bg-primary/15'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

export default Wiki;

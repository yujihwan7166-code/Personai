import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Network, Menu, Home, LayoutGrid, Shuffle, Plus, Sparkles } from 'lucide-react';
import '@/styles/wiki.css';
import { useWikiPages } from '@/hooks/useWikiPages';
import { useWikiFavorites } from '@/hooks/useWikiFavorites';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import type { WikiPage } from '@/types/wiki';
import { MainModeTabs } from '@/components/MainModeTabs';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiPageView } from '@/components/wiki/WikiPageView';
import { WikiHome } from '@/components/wiki/WikiHome';
import { WikiGraph } from '@/components/wiki/WikiGraph';
import { WikiSettingsMenu } from '@/components/wiki/WikiSettingsMenu';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiTemplatePicker } from '@/components/wiki/WikiTemplatePicker';
import { WikiStoragePanel } from '@/components/wiki/WikiStoragePanel';
import { WikiAiPanel } from '@/components/wiki/WikiAiPanel';
import { WikiQuickCapture } from '@/components/wiki/WikiQuickCapture';
import { clearAllPages } from '@/lib/wikiStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

const SIDEBAR_KEY = 'wiki_sidebar_open';
const AI_PANEL_KEY = 'wiki_ai_panel_open';

const Wiki = () => {
  const navigate = useNavigate();
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
  // ⊞ 모드 전환 패널 — Wiki 페이지 위에 직접 띄우기 (페이지 이동 X)
  const modeApiRef = useRef<{ open: () => void; close: () => void } | null>(null);

  const goToMainWith = useCallback((state: Record<string, unknown>) => {
    navigate('/', { state });
  }, [navigate]);

  const mainModeLabelMap = (() => {
    const out: Partial<Record<MainMode, string>> = {};
    for (const [k, v] of Object.entries(MAIN_MODE_LABELS)) {
      out[k as MainMode] = (v as { label: string }).label;
    }
    return out as Record<MainMode, string>;
  })();
  // 모바일에선 기본 닫힘, 데스크탑은 localStorage. 768px 미만은 오버레이 모드.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 768) return false;
    return window.localStorage.getItem(SIDEBAR_KEY) !== '0';
  });
  const [aiOpen, setAiOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AI_PANEL_KEY) === '1';
  });
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [graphFocusId, setGraphFocusId] = useState<string | null>(null);

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AI_PANEL_KEY, aiOpen ? '1' : '0');
  }, [aiOpen]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openTemplatePicker = useCallback(() => setTemplatePickerOpen(true), []);

  /** 무작위 페이지 — 보관 제외, 현재 페이지 제외. */
  const openRandomPage = useCallback(() => {
    const candidates = pages.filter((p) => p.status !== 'archived' && p.id !== activeId);
    if (candidates.length === 0) {
      notify.info('무작위 후보 페이지가 없어요', { duration: 1800 });
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setActiveId(pick.id);
    setEditing(false);
    setView('page');
    if (isMobile) setSidebarOpen(false);
  }, [pages, activeId, isMobile]);

  /** 인기 태그로 메인 문서 자동 생성 — 그 태그를 가진 페이지들을 [[링크]] 로 묶음 */
  const makeMocFromTag = useCallback(async (tag: string) => {
    const targets = pages.filter((p) => p.tags.includes(tag));
    if (targets.length === 0) {
      notify.info(`#${tag} 태그를 가진 페이지가 없어요`, { duration: 2200 });
      return;
    }
    const { newWikiId } = await import('@/types/wiki');
    const now = Date.now();
    const lines = [
      `# ${tag}`,
      '',
      `\`#${tag}\` 태그를 가진 ${targets.length}개 페이지를 묶어둔 메인 문서.`,
      '',
      '## 페이지',
      ...targets.map((p) => `- [[${p.title}]]`),
      '',
      '## 같이 보기',
      '- ',
      '',
    ].join('\n');
    const next: WikiPage = {
      id: newWikiId(),
      title: tag,
      aliases: [],
      type: 'concept',
      isMain: true,
      status: 'active',
      tags: [tag, 'main'],
      body: lines,
      refersTo: [],
      cites: [],
      inherits: [],
      similarTo: [],
      parentMocs: [],
      createdAt: now,
      updatedAt: now,
    };
    await upsertPage(next);
    setActiveId(next.id);
    setEditing(false);
    setView('page');
    notify.success(`#${tag} 메인 문서를 만들었어요 — ${targets.length}개 페이지`, { duration: 2200 });
  }, [pages, upsertPage]);

  /** '+ 새 메인 문서' — 템플릿 픽커 거치지 않고 바로 isMain=true 페이지 생성 + 편집 진입 */
  const createMainDoc = useCallback(async () => {
    const { newWikiId } = await import('@/types/wiki');
    const now = Date.now();
    const next: WikiPage = {
      id: newWikiId(),
      title: '새 메인 문서',
      aliases: [],
      type: 'concept',
      isMain: true,
      status: 'draft',
      tags: ['main'],
      body: '## 개요\n\n이 메인 문서가 다루는 범위.\n\n## 핵심 페이지\n\n- [[ ]]\n\n## 하위 주제\n\n- [[ ]]\n',
      refersTo: [],
      cites: [],
      inherits: [],
      similarTo: [],
      parentMocs: [],
      createdAt: now,
      updatedAt: now,
    };
    await upsertPage(next);
    setActiveId(next.id);
    setEditing(true);
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
      } else if (meta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAiOpen((v) => !v);
      } else if (meta && e.shiftKey && (e.key === ';' || e.key === ':' || e.code === 'Semicolon')) {
        e.preventDefault();
        setQuickCaptureOpen(true);
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

      {/* 사이드바 */}
      <aside
        className={cn(
          'shrink-0 h-full overflow-hidden transition-[width,transform,border-right-width] duration-200 ease-out border-r flex flex-col',
          isMobile
            ? 'fixed left-0 top-0 wiki-z-sidebar w-[280px] bg-background border-[hsl(var(--hairline))]'
            : (sidebarOpen
                ? 'w-[260px] border-[hsl(var(--hairline))]'
                : 'w-0 border-r-0'),
          isMobile && !sidebarOpen && '-translate-x-full',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className={cn(isMobile ? 'w-[280px]' : 'w-[260px]', 'h-full flex flex-col')}>
          {/* 윗줄 — 정체성 / 모드 전환 / 사이드바 닫기 */}
          <div className="px-2 h-12 border-b border-[hsl(var(--hairline))] flex items-center gap-1">
            <span
              className="flex-1 text-[13px] font-bold text-foreground/90 truncate px-1"
              style={{ fontFamily: 'var(--wiki-font-meta)' }}
            >
              🌐 마이위키
            </span>
            <button
              type="button"
              onClick={() => modeApiRef.current?.open()}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
              title="모드 전환"
              aria-label="모드 전환"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
              title="사이드바 접기 (Ctrl/Cmd+B)"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* 아랫줄 — 4 균등 (홈 / 그래프 / 새 / 무작위) */}
          <div className="px-2 h-10 border-b border-[hsl(var(--hairline))] flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setActiveId(null); setView('page'); if (isMobile) setSidebarOpen(false); }}
              className={cn(
                'flex-1 h-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
                !activeId && view === 'page'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="대문(홈)"
              aria-label="대문(홈)"
            >
              <Home className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setView(view === 'graph' ? 'page' : 'graph'); setActiveId(null); if (isMobile) setSidebarOpen(false); }}
              className={cn(
                'flex-1 h-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
                view === 'graph'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="연결 그래프"
              aria-label="연결 그래프"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openTemplatePicker}
              className="flex-1 h-8 inline-flex items-center justify-center rounded-md text-primary hover:bg-primary/15 wiki-trans-color"
              title="새 페이지 (Ctrl/Cmd+N)"
              aria-label="새 페이지"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openRandomPage}
              className="flex-1 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
              title="무작위 페이지"
              aria-label="무작위 페이지"
            >
              <Shuffle className="h-4 w-4" />
            </button>
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
          />
          {/* 사이드바 footer — 우하단 설정 */}
          <div className="px-2 h-9 border-t border-[hsl(var(--hairline))] flex items-center justify-end shrink-0">
            <WikiSettingsMenu
              onMutated={() => { void reload(); setActiveId(null); }}
              onOpenStorage={() => setStorageOpen(true)}
            />
          </div>
        </div>
      </aside>

      {/* 사이드바 닫혔을 때 — 데스크탑은 세로 아이콘 스트립(activity bar), 모바일은 햄버거 1개 */}
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
      {!sidebarOpen && !isMobile && (
        <nav
          className="shrink-0 h-full w-11 border-r border-[hsl(var(--hairline))] bg-background flex flex-col items-center py-2 gap-1"
          aria-label="마이위키 빠른 액션"
        >
          {/* 최상단: 사이드바 펴기 → 모드 전환 */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            title="사이드바 펴기 (Ctrl/Cmd+B)"
            aria-label="사이드바 펴기"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => modeApiRef.current?.open()}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            title="모드 전환"
            aria-label="모드 전환"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <div className="my-1 w-6 h-px bg-[hsl(var(--hairline))]" aria-hidden />

          {/* 진입 액션 3개 */}
          <button
            type="button"
            onClick={() => { setActiveId(null); setView('page'); }}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
              !activeId && view === 'page'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title="대문(홈)"
            aria-label="대문(홈)"
          >
            <Home className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setView(view === 'graph' ? 'page' : 'graph'); setActiveId(null); }}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
              view === 'graph'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title="연결 그래프"
            aria-label="연결 그래프"
          >
            <Network className="h-4 w-4" />
          </button>

          {/* 하단: 설정 */}
          <div className="flex-1" aria-hidden />
          <div className="my-1 w-6 h-px bg-[hsl(var(--hairline))]" aria-hidden />
          <WikiSettingsMenu
            onMutated={() => { void reload(); setActiveId(null); }}
            onOpenStorage={() => setStorageOpen(true)}
          />
        </nav>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto relative">
        {!aiOpen && (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="absolute top-2 right-2 sm:top-3 sm:right-4 z-10 h-8 w-8 sm:w-auto sm:px-2.5 inline-flex items-center justify-center sm:justify-start gap-1 rounded-md border border-[hsl(var(--hairline))] bg-background/80 backdrop-blur text-muted-foreground hover:text-primary hover:border-primary/40 wiki-trans-color"
            title="AI 보조 (Ctrl/Cmd+J)"
            aria-label="AI 보조 열기"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline text-[11.5px] font-medium">AI</span>
          </button>
        )}
        {view === 'graph' ? (
          pages.length === 0 ? (
            <WikiHome
              pages={pages}
              favorites={favorites}
              onSelect={(id) => setActiveId(id)}
              onCreate={openTemplatePicker}
              onCreateMissing={(title) => handleOpenByTitleOrId(title)}
              onMakeMocFromTag={(tag) => { void makeMocFromTag(tag); }}
              onCreateMainDoc={() => { void createMainDoc(); }}
              onPickStarterPack={async (pack) => {
                const built = pack.build();
                for (const p of built) await upsertPage(p);
                const home = built.find((p) => p.type === 'index') ?? built[0];
                setActiveId(home.id);
                setEditing(false);
                setView('page');
                notify.success(`${pack.label} 스타터 팩 적용 — ${built.length}개 페이지`, { duration: 2200 });
              }}
            />
          ) : (
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
                  검색·필터·줌·팬·경로 찾기. 노드 클릭 → 페이지 열기.
                </p>
              </header>
              <WikiGraph
                pages={pages}
                onSelect={(id) => { setActiveId(id); setView('page'); setEditing(false); setGraphFocusId(null); }}
                initialFocusId={graphFocusId}
              />
            </div>
          )
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
            onOpenInGlobalGraph={(centerId) => {
              setGraphFocusId(centerId);
              setView('graph');
              setActiveId(null);
            }}
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
            favorites={favorites}
            onSelect={(id) => setActiveId(id)}
            onCreate={openTemplatePicker}
            onCreateMissing={(title) => handleOpenByTitleOrId(title)}
            onMakeMocFromTag={(tag) => { void makeMocFromTag(tag); }}
            onCreateMainDoc={() => { void createMainDoc(); }}
            onPickStarterPack={async (pack) => {
              const built = pack.build();
              for (const p of built) await upsertPage(p);
              const home = built.find((p) => p.type === 'index') ?? built[0];
              setActiveId(home.id);
              setEditing(false);
              setView('page');
              notify.success(`${pack.label} 스타터 팩 적용 — ${built.length}개 페이지`, { duration: 2200 });
            }}
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
        onQuickCapture={() => setQuickCaptureOpen(true)}
        onAskAi={() => setAiOpen(true)}
        currentPageId={activeId}
        onGoGraphFocus={(id) => {
          setGraphFocusId(id);
          setView('graph');
          setActiveId(null);
        }}
      />

      {/* 템플릿 픽커 */}
      <WikiTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onPick={handleTemplatePicked}
      />

      {/* 저장소 사용량 — 헤더 배지·설정 메뉴 둘 다에서 열 수 있게 위로 lift */}
      <WikiStoragePanel open={storageOpen} onClose={() => setStorageOpen(false)} />

      {/* 빠른 캡처 — 어디서든 Ctrl/Cmd+Shift+; 로 호출, #inbox draft 페이지 1개 생성 */}
      <WikiQuickCapture
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onCreate={async (page) => {
          await upsertPage(page);
          notify.info(`Inbox 에 새 페이지: ${page.title}`, { duration: 2200 });
        }}
      />

      {/* AI 보조 패널 — 활성 페이지가 있으면 그 컨텍스트, 없으면 위키 전체 메타 */}
      <WikiAiPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        page={activePage}
        totalPages={pages.length}
        onAppendToBody={activePage ? (snippet) => {
          const quoted = snippet.split('\n').map((l) => `> ${l}`).join('\n');
          const next: WikiPage = { ...activePage, body: `${activePage.body}\n\n${quoted}\n`, updatedAt: Date.now() };
          void upsertPage(next);
          notify.success('현재 페이지 본문에 추가했어요');
        } : undefined}
        onCreatePageFromAnswer={async (title, body) => {
          const { newWikiId } = await import('@/types/wiki');
          const now = Date.now();
          const next: WikiPage = {
            id: newWikiId(), title: title || '제목 없음', aliases: [], type: 'concept',
            status: 'draft', tags: [], body,
            refersTo: [], cites: [], inherits: [], similarTo: [], parentMocs: [],
            createdAt: now, updatedAt: now,
          };
          await upsertPage(next);
          setActiveId(next.id);
          setEditing(true);
          setView('page');
          notify.success('새 draft 페이지로 만들었어요');
        }}
      />

      {/* 메인 모드 전환 패널 — 트리거 pill 은 화면 밖으로 완전 이동 (left: -9999px).
          panel 만 portal 로 body 에 노출되어 viewport 정중앙에 등장.
          모드 선택 시 그 모드의 default DiscussionMode 를 state 로 넘겨 메인으로 이동. */}
      <div
        style={{ position: 'fixed', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden
      >
        <MainModeTabs
          modes={['general', 'research_main', 'study_main', 'multi', 'debate', 'stakeholder_main', 'premium_main', 'assistant']}
          labels={mainModeLabelMap}
          currentMode="general"
          pendingMode={null}
          isDiscussing={false}
          transitionPhase={0}
          showPlayerBg={false}
          onChange={(mode) => goToMainWith({ selectMainMode: mode })}
          onSelectDebateSub={(sub) => goToMainWith({ selectMainMode: 'debate', selectDebateSub: sub })}
          onSelectAssistantCard={(cardId) => goToMainWith({ selectMainMode: 'assistant', selectAssistantCard: cardId })}
          onSelectLifeTool={(toolId) => goToMainWith({ selectMainMode: 'general', selectLifeTool: toolId })}
          onOpenMentalTests={() => goToMainWith({ openMentalTests: true })}
          onOpenBookmarks={() => goToMainWith({ openBookmarks: true })}
          onSelectPlayerTool={(toolId) => goToMainWith({ selectMainMode: 'player', selectPlayerTool: toolId })}
          apiRef={modeApiRef}
        />
      </div>
    </div>
  );
};

export default Wiki;

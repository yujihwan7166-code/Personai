import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Archive,
  CalendarDays,
  Contact,
  FileUser,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Network,
  NotebookPen,
  StickyNote,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HiddenInteractiveMount } from '@/components/HiddenInteractiveMount';
import { MainModeTabs, type MainModeTabsApi } from '@/components/MainModeTabs';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type WorkspaceKey = 'planner' | 'wiki' | 'journal' | 'career' | 'people' | 'archive';

type WorkspaceDestinationKey = WorkspaceKey | 'home' | 'notes';

interface WorkspaceDestination {
  key: WorkspaceDestinationKey;
  label: string;
  to: string;
  icon: LucideIcon;
}

const WORKSPACE_DESTINATIONS: WorkspaceDestination[] = [
  { key: 'home', label: '홈', to: '/', icon: Home },
  { key: 'planner', label: '통합플래너', to: '/planner', icon: CalendarDays },
  { key: 'notes', label: '올인원 노트', to: '/notes', icon: StickyNote },
  { key: 'journal', label: '데일리 로그', to: '/journal', icon: NotebookPen },
  { key: 'career', label: '스펙 보드', to: '/career', icon: FileUser },
  { key: 'people', label: '인맥노트', to: '/people', icon: Contact },
  { key: 'archive', label: '아카이브', to: '/archive', icon: Archive },
  { key: 'wiki', label: '마이위키', to: '/wiki', icon: Network },
];

/* 왼쪽 세로 레일에 노출할 워크스페이스 (홈은 별도 상단, 메뉴는 별도) — 캘린더/위키/노트/일기. */
const RAIL_WORKSPACES = WORKSPACE_DESTINATIONS.filter((item) => item.key !== 'home');

const MOBILE_PRIMARY = WORKSPACE_DESTINATIONS.filter((item) =>
  ['planner', 'wiki', 'notes', 'journal'].includes(item.key),
);
const MOBILE_MORE = WORKSPACE_DESTINATIONS.filter((item) =>
  ['home', 'career', 'people', 'archive'].includes(item.key),
);

/* 모드 메가메뉴(홈 히어로와 동일) 런처에 노출할 모드 — WorkspaceSidebarSwitchButton 과 동일 세트. */
const MODE_LAUNCHER_MODES: MainMode[] = [
  'general',
  'research_main',
  'study_main',
  'voice_main',
  'multi',
  'debate',
  'stakeholder_main',
  'premium_main',
  'assistant',
];

/** 페이지 전용 레일 항목 — 스위처 아래 구분선 다음에 아이콘으로 렌더 (플래너 등). */
export interface RailExtraItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** 아직 미구현(placeholder) — 흐리게 표시. */
  soon?: boolean;
}

interface AppWorkspaceShellProps {
  current: WorkspaceKey | 'notes';
  children: ReactNode;
  /** 이 워크스페이스만의 레일 항목 — 공통 네비 아래 구분선 다음에 추가. */
  railExtra?: RailExtraItem[];
}

export function AppWorkspaceShell({ current, children, railExtra }: AppWorkspaceShellProps) {
  const navigate = useNavigate();
  const moreActive = MOBILE_MORE.some((item) => item.key === current);
  const currentItem = WORKSPACE_DESTINATIONS.find((item) => item.key === current);

  // 모드 메가메뉴 — 레일 '메뉴(⊞)' 버튼이 홈 히어로와 같은 패널을 연다.
  const modeApiRef = useRef<MainModeTabsApi | null>(null);
  const modeMenuId = useId();
  const [modeOpen, setModeOpen] = useState(false);
  const modeLabels = useMemo(() => {
    const out: Partial<Record<MainMode, string>> = {};
    for (const [key, value] of Object.entries(MAIN_MODE_LABELS)) {
      out[key as MainMode] = value.label;
    }
    return out as Record<MainMode, string>;
  }, []);
  const goToHomeWith = useCallback(
    (state: Record<string, unknown>) => navigate('/', { state }),
    [navigate],
  );
  const openModePanel = useCallback(() => {
    const tryOpen = (attempt = 0) => {
      if (modeApiRef.current) {
        modeApiRef.current.open();
        return;
      }
      if (attempt >= 4) return;
      window.requestAnimationFrame(() => tryOpen(attempt + 1));
    };
    tryOpen();
  }, []);

  return (
    <div className="app-workspace-shell min-h-dvh bg-background text-foreground">
      {/* ────── 데스크톱 좌측 세로 아이콘 레일 (모든 워크스페이스 공통·고정) ──────
       * 홈 · 메뉴(모드 메가메뉴) · 구분선 · 캘린더/위키/노트/화이트보드/일기.
       * 페이지가 바뀌어도 자리·디자인 불변 → "같은 앱 안에서 방만 바뀐다" 감. */}
      <nav
        aria-label="워크스페이스 레일"
        data-app-workspace-rail
        className="fixed inset-y-0 left-0 z-[45] hidden w-14 flex-col items-center gap-1 border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] py-2.5 sm:flex"
      >
        {/* 홈 — 방 상관없이 고정 홈 아이콘(색 없음). */}
        <NavLink
          to="/"
          aria-label="홈으로"
          title="홈으로"
          className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Home className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </NavLink>

        <button
          type="button"
          onClick={openModePanel}
          aria-label="모드 메뉴 열기"
          aria-haspopup="menu"
          aria-expanded={modeOpen}
          aria-controls={modeMenuId}
          title="모드 — 대화·토론·리서치·스튜디오"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            modeOpen
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <span aria-hidden className="my-1 h-px w-6 bg-[hsl(var(--hairline))]" />

        {RAIL_WORKSPACES.map((item) => (
          <RailLink key={item.key} item={item} active={item.key === current} />
        ))}

        {/* 페이지 전용 기능 — 스위처 아래 구분선 다음에 (예: 플래너 매트릭스·보관함…). */}
        {railExtra && railExtra.length > 0 && (
          <>
            <span aria-hidden className="my-1 h-px w-6 bg-[hsl(var(--hairline))]" />
            {railExtra.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                    'text-muted-foreground hover:bg-accent hover:text-foreground',
                    item.soon && 'opacity-45',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              );
            })}
          </>
        )}

        {/* 테마 토글 — 레일 하단 고정. */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <span aria-hidden className="mb-0.5 h-px w-6 bg-[hsl(var(--hairline))]" />
          <RailThemeToggle />
        </div>
      </nav>

      {/* 레일 밖(히든 마운트)에 메가메뉴 실체 — apiRef 로 열림 제어. */}
      <HiddenInteractiveMount>
        <MainModeTabs
          modes={MODE_LAUNCHER_MODES}
          labels={modeLabels}
          currentMode="general"
          pendingMode={null}
          isDiscussing={false}
          transitionPhase={0}
          showPlayerBg={false}
          onChange={(mode) => goToHomeWith({ selectMainMode: mode })}
          onSelectDebateSub={(sub) => goToHomeWith({ selectMainMode: 'debate', selectDebateSub: sub })}
          onSelectPremiumDomain={(domainId) => goToHomeWith({ selectMainMode: 'premium_main', selectPremiumDomain: domainId })}
          onSelectAssistantCard={(cardId) => goToHomeWith({
            selectMainMode: cardId === 'voice-analysis' ? 'voice_main' : 'assistant',
            selectAssistantCard: cardId,
          })}
          onSelectLifeTool={(toolId) => goToHomeWith({ selectMainMode: 'general', selectLifeTool: toolId })}
          onOpenMentalTests={() => goToHomeWith({ openMentalTests: true })}
          onOpenBookmarks={() => goToHomeWith({ openBookmarks: true })}
          onSelectPlayerTool={(toolId) => goToHomeWith({ selectMainMode: 'player', selectPlayerTool: toolId })}
          apiRef={modeApiRef}
          menuId={modeMenuId}
          onOpenChange={setModeOpen}
        />
      </HiddenInteractiveMount>

      <main className="min-w-0 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0 sm:pl-14">
        {children}
      </main>

      <nav
        aria-label="앱 전환"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[hsl(var(--hairline))] bg-background/95 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-24px_hsl(var(--foreground)/0.38)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {MOBILE_PRIMARY.map((item) => (
            <WorkspaceBottomLink
              key={item.key}
              item={item}
              active={item.key === current}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="더 많은 앱"
                className={cn(
                  'flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[10.5px] font-semibold transition-colors',
                  moreActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2.1} />
                <span className="max-w-full truncate px-1">더보기</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-2 w-40">
              {MOBILE_MORE.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.key} asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn('flex items-center gap-2', (isActive || item.key === current) && 'text-primary')
                      }
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.1} />
                      <span>{item.label}</span>
                    </NavLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}

/** 레일 하단 다크/라이트 토글 — document.documentElement 의 .dark 클래스 + localStorage 동기화. */
function RailThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const toggle = () => {
    const root = document.documentElement;
    const next = !dark;
    root.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* noop */ }
    setDark(next);
  };
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? '라이트 모드로' : '다크 모드로'}
      title={dark ? '라이트 모드' : '다크 모드'}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}

interface WorkspaceLinkProps {
  item: WorkspaceDestination;
  active: boolean;
}

/* 좌측 레일 아이콘 링크 — 아이콘만(마크형), 현재 페이지는 primary 하이라이트. */
function RailLink({ item, active }: WorkspaceLinkProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
        active
          ? 'bg-primary/12 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </NavLink>
  );
}

function WorkspaceBottomLink({ item, active }: WorkspaceLinkProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[10.5px] font-semibold transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.1} />
      <span className="max-w-full truncate px-1">{item.label}</span>
    </NavLink>
  );
}

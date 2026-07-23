import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Archive,
  Award,
  HeartPulse,
  Library,
  LayoutDashboard,
  CalendarDays,
  Contact,
  FileUser,
  Home,
  LayoutGrid,
  MoreHorizontal,
  NotebookPen,
  PiggyBank,
  StickyNote,
  Sun,
  Moon,
  Ticket,
  Settings2,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HiddenInteractiveMount } from '@/components/HiddenInteractiveMount';
import { MainModeTabs, type MainModeTabsApi } from '@/components/MainModeTabs';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type WorkspaceKey = 'today' | 'planner' | 'wiki' | 'journal' | 'career' | 'career2' | 'people' | 'archive' | 'health' | 'tickets' | 'ledger';

type WorkspaceDestinationKey = WorkspaceKey | 'home' | 'notes';

interface WorkspaceDestination {
  key: WorkspaceDestinationKey;
  label: string;
  to: string;
  icon: LucideIcon;
}

const WORKSPACE_DESTINATIONS: WorkspaceDestination[] = [
  { key: 'home', label: '홈', to: '/', icon: Home },
  { key: 'today', label: '오늘', to: '/today', icon: LayoutDashboard },
  { key: 'planner', label: '통합플래너', to: '/planner', icon: CalendarDays },
  { key: 'notes', label: '올인원 노트', to: '/notes', icon: StickyNote },
  { key: 'journal', label: '데일리 로그', to: '/journal', icon: NotebookPen },
  { key: 'career', label: '스펙 보드', to: '/career', icon: FileUser },
  { key: 'career2', label: '마이커리어 v2', to: '/career2', icon: Award },
  { key: 'people', label: '인맥노트', to: '/people', icon: Contact },
  { key: 'archive', label: '아카이브', to: '/archive', icon: Archive },
  { key: 'wiki', label: '마이위키', to: '/wiki', icon: Library },
  { key: 'health', label: '건강기록', to: '/health', icon: HeartPulse },
  { key: 'tickets', label: '티켓북', to: '/tickets', icon: Ticket },
  { key: 'ledger', label: '가계부', to: '/ledger', icon: PiggyBank },
];

/* 레일(그라파이트) 활성 = 방 앰센트 채움 알약 색 — 방별 개성(공통 뼈대 + 앱 아이덴티티). */
/* 레일 활성 알약 = 각 방의 실제 테마색과 일치시킨다 (레일 버튼 색이 방 색과 안 맞던 문제). */
const RAIL_ACCENT: Partial<Record<WorkspaceDestinationKey, string>> = {
  today: '#3a72b8',    // 오늘 — 블루
  planner: '#3a72b8',  // 통합플래너 — 블루
  notes: '#2c4f93',    // 올인원 노트 — 네이비 블루 (방 accent와 동일)
  journal: '#6d5dd3',  // 데일리 로그 — 퍼플
  career: '#8a3550',   // 스펙 보드 — 로즈/버건디 (방 accent와 동일)
  career2: '#4d7c0f',  // 마이커리어 v2 — 월계수 올리브 (방 accent와 동일)
  people: '#a15008',   // 인맥노트 — 앰버
  archive: '#a5642e',  // 아카이브 — 세피아 (인맥노트 앰버와 구분)
  health: '#2f9e6e',   // 건강기록 — 그린
  tickets: '#d97706',  // 티켓북 — 앰버
  wiki: '#8b3d6e',     // 마이위키 — 플럼(자두)
  ledger: '#2d4a7c',   // 가계부 — 딥 네이비 (방 accent와 동일)
};

/** 레일 색 후보 — 레일 위에서 마우스 휠 위/아래로 돌려가며 고른다 (선택은 localStorage 저장).
 * 원칙: 레일은 크롬이라 방 액센트(블루·그린·퍼플·브릭·앰버)와 경쟁하면 안 됨 → 채도 낮게.
 * hoverInk 는 밝은 레일에서 호버 글자가 안 보이는 것 방지. */
interface RailTheme {
  name: string;
  bg: string;
  border: string;
  icon: string;
  hover: string;
  hoverInk: string;
  fallback: string;
}
const RAIL_THEMES: RailTheme[] = [
  // 웜 다크 — 명암 차가 곧 사이드바와의 경계
  { name: '웜 잉크',    bg: '#2d2926', border: '#221f1c', icon: '#b0a89e', hover: '#3d3833', hoverInk: '#ffffff', fallback: '#4f4841' },
  { name: '잉크 블랙',  bg: '#1c1a18', border: '#121110', icon: '#a49c92', hover: '#2c2926', hoverInk: '#ffffff', fallback: '#413b34' },
  { name: '에스프레소', bg: '#3a352f', border: '#2e2a25', icon: '#b9b2a8', hover: '#4a443c', hoverInk: '#ffffff', fallback: '#5c554b' },
  // 라이트 — 사이드바와 뭉개지지 않게 border 를 또렷한 헤어라인으로
  { name: '화이트',     bg: '#ffffff', border: '#e2ddd6', icon: '#9aa1ab', hover: '#f2f1ef', hoverInk: '#23262b', fallback: '#8d949d' },
];
const RAIL_THEME_KEY = 'rail.theme.v1';
/** 레일에서 숨긴 방 — "보이는 목록"이 아니라 "숨긴 목록"을 저장한다.
 * 나중에 방이 추가돼도 저장된 목록에 없어서 안 보이는 사고를 막기 위함(신규 방은 기본 노출). */
const RAIL_HIDDEN_KEY = 'rail.icons.v1';
/** 레일 방 순서 — 설정에서 드래그로 바꾼 결과. 저장 안 된 신규 방은 뒤에 붙는다. */
const RAIL_ORDER_KEY = 'rail.order.v1';

/* 왼쪽 세로 레일에 노출할 워크스페이스 (홈은 별도 상단, 메뉴는 별도) — 캘린더/위키/노트/일기. */
const RAIL_WORKSPACES = WORKSPACE_DESTINATIONS.filter((item) => item.key !== 'home');

const MOBILE_PRIMARY = WORKSPACE_DESTINATIONS.filter((item) =>
  ['planner', 'notes', 'journal'].includes(item.key),
);
const MOBILE_MORE = WORKSPACE_DESTINATIONS.filter((item) =>
  ['home', 'today', 'career', 'career2', 'people', 'archive', 'wiki', 'health', 'tickets', 'ledger'].includes(item.key),
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

  /* 레일 색 — 설정 패널에서 고른다. 선택은 localStorage 유지. */
  const [railThemeIdx, setRailThemeIdx] = useState<number>(() => {
    try {
      const raw = Number(window.localStorage.getItem(RAIL_THEME_KEY));
      return Number.isInteger(raw) && raw >= 0 && raw < RAIL_THEMES.length ? raw : 0;
    } catch {
      return 0;
    }
  });
  const pickRailTheme = useCallback((i: number) => {
    setRailThemeIdx(i);
    try { window.localStorage.setItem(RAIL_THEME_KEY, String(i)); } catch { /* 저장 실패는 무시 */ }
  }, []);

  /* 레일에 표시할 방 — 설정에서 숨긴 방을 뺀 목록. "숨긴 목록"만 저장(신규 방은 기본 노출). */
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(RAIL_HIDDEN_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []);
    } catch {
      return new Set();
    }
  });
  const persistHidden = useCallback((s: Set<string>) => {
    try { window.localStorage.setItem(RAIL_HIDDEN_KEY, JSON.stringify([...s])); } catch { /* 저장 실패는 무시 */ }
  }, []);
  const toggleHidden = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      persistHidden(next);
      return next;
    });
  }, [persistHidden]);

  /* 레일 방 순서 — 설정에서 드래그로 바꾼다. 저장된 순서에 없는 방(신규)은 뒤에 붙는다. */
  const [railOrder, setRailOrder] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(RAIL_ORDER_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      return [];
    }
  });
  /** 전체 방을 저장된 순서대로 정렬(신규는 뒤). 표시/숨김과 무관 — 설정 목록·레일 공용. */
  const orderedAll = useMemo(() => {
    const byKey = new Map(RAIL_WORKSPACES.map((i) => [i.key as string, i]));
    const out = railOrder.map((k) => byKey.get(k)).filter((i): i is WorkspaceDestination => !!i);
    for (const item of RAIL_WORKSPACES) if (!out.includes(item)) out.push(item);
    return out;
  }, [railOrder]);
  const reorderRail = useCallback((fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setRailOrder(() => {
      const cur = orderedAll.map((i) => i.key as string);
      const a = cur.indexOf(fromKey);
      const b = cur.indexOf(toKey);
      if (a < 0 || b < 0) return cur;
      const next = [...cur];
      next.splice(a, 1);
      next.splice(b, 0, fromKey);
      try { window.localStorage.setItem(RAIL_ORDER_KEY, JSON.stringify(next)); } catch { /* 저장 실패는 무시 */ }
      return next;
    });
  }, [orderedAll]);

  const visibleRail = useMemo(() => orderedAll.filter((i) => !hiddenKeys.has(i.key)), [orderedAll, hiddenKeys]);

  /* 레일 휠 — 레일 위에서 위/아래로 굴리면 인접한 (보이는) 방으로 이동한다. */
  const railRef = useRef<HTMLElement | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const visibleRailRef = useRef(visibleRail);
  visibleRailRef.current = visibleRail;
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 2) return;
      e.preventDefault(); // 레일 위 휠이 뒤 페이지를 스크롤하지 않게
      const now = Date.now();
      if (now - lock < 220) return; // 한 틱에 한 방 — 연속 스크롤로 훅 지나가지 않게
      const list = visibleRailRef.current;
      const idx = list.findIndex((i) => i.key === currentRef.current);
      if (idx < 0) return; // 현재 방이 숨겨졌으면 휠 무시
      const next = idx + (e.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= list.length) return; // 양 끝에서 멈춤
      lock = now;
      navigate(list[next].to);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [navigate]);

  const railTheme = RAIL_THEMES[railThemeIdx] ?? RAIL_THEMES[0];
  const railVars = {
    '--rail-bg': railTheme.bg,
    '--rail-border': railTheme.border,
    '--rail-icon': railTheme.icon,
    '--rail-hover': railTheme.hover,
    '--rail-hover-ink': railTheme.hoverInk,
    '--rail-fallback': railTheme.fallback,
  } as CSSProperties;

  return (
    <div className="app-workspace-shell min-h-dvh bg-background text-foreground">
      {/* ────── 데스크톱 좌측 세로 아이콘 레일 (모든 워크스페이스 공통·고정) ──────
       * 홈 · 메뉴(모드 메가메뉴) · 구분선 · 캘린더/위키/노트/화이트보드/일기.
       * 페이지가 바뀌어도 자리·디자인 불변 → "같은 앱 안에서 방만 바뀐다" 감. */}
      <nav
        ref={railRef}
        aria-label="워크스페이스 레일"
        data-app-workspace-rail
        title="휠 위/아래 — 옆 방으로 이동"
        style={railVars}
        className="fixed inset-y-0 left-0 z-[45] hidden w-16 flex-col items-center gap-1 border-r border-[var(--rail-border)] bg-[var(--rail-bg)] py-3.5 shadow-[2px_0_8px_rgba(0,0,0,0.06)] sm:flex"
      >
        {/* 홈 — 방 상관없이 고정 홈 아이콘(색 없음). */}
        <NavLink
          to="/"
          aria-label="홈으로"
          title="홈으로"
          className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-[11px] text-[var(--rail-icon)] transition-colors hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]"
        >
          <Home className="h-5 w-5" strokeWidth={2} />
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
            'flex h-10 w-10 items-center justify-center rounded-[11px] transition-colors',
            modeOpen
              ? 'bg-[var(--rail-hover)] text-[var(--rail-hover-ink)]'
              : 'text-[var(--rail-icon)] hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]',
          )}
        >
          <LayoutGrid className="h-5 w-5" strokeWidth={1.9} />
        </button>

        <span aria-hidden className="my-1.5 h-px w-6 bg-[var(--rail-hover)]" />

        {visibleRail.map((item) => (
          <RailLink key={item.key} item={item} active={item.key === current} />
        ))}

        {/* 페이지 전용 기능 — 스위처 아래 구분선 다음에 (예: 플래너 매트릭스·보관함…). */}
        {railExtra && railExtra.length > 0 && (
          <>
            <span aria-hidden className="my-1.5 h-px w-6 bg-[var(--rail-hover)]" />
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
                    'flex h-10 w-10 items-center justify-center rounded-[11px] transition-colors',
                    'text-[var(--rail-icon)] hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]',
                    item.soon && 'opacity-45',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              );
            })}
          </>
        )}

        {/* 테마 토글 + 레일 설정(색·아이콘) — 레일 하단 고정. */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <span aria-hidden className="mb-0.5 h-px w-6 bg-[var(--rail-hover)]" />
          <RailThemeToggle />
          <RailSettings
            themeIdx={railThemeIdx}
            onPickTheme={pickRailTheme}
            orderedAll={orderedAll}
            hiddenKeys={hiddenKeys}
            onToggleHidden={toggleHidden}
            onReorder={reorderRail}
          />
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

      <main className="min-w-0 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0 sm:pl-16">
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

/** 레일 하단 설정 — 팝오버로 레일 색 선택 + 표시할 방 순서(드래그)·표시 토글. */
function RailSettings({
  themeIdx, onPickTheme, orderedAll, hiddenKeys, onToggleHidden, onReorder,
}: {
  themeIdx: number;
  onPickTheme: (i: number) => void;
  orderedAll: WorkspaceDestination[];
  hiddenKeys: Set<string>;
  onToggleHidden: (key: string) => void;
  onReorder: (fromKey: string, toKey: string) => void;
}) {
  const visibleCount = RAIL_WORKSPACES.length - hiddenKeys.size;
  // 드래그 키는 ref(즉시 읽기) + state(흐리게 표시).
  const dragRef = useRef<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="레일 설정 — 색·아이콘"
          title="레일 설정 — 색·아이콘"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--rail-icon)] transition-colors hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]"
        >
          <Settings2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={10} className="w-72 p-0">
        {/* ── 레일 색 ── */}
        <div className="px-3.5 pb-2.5 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">레일 색</p>
          <div className="grid grid-cols-4 gap-2">
            {RAIL_THEMES.map((t, i) => {
              const on = i === themeIdx;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onPickTheme(i)}
                  aria-pressed={on}
                  title={t.name}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg border-2 transition-colors',
                    on ? 'border-[hsl(var(--foreground))]' : 'border-transparent hover:border-[hsl(var(--hairline))]',
                  )}
                  style={{ backgroundColor: t.bg, boxShadow: t.name === '화이트' ? 'inset 0 0 0 1px hsl(var(--hairline))' : undefined }}
                >
                  {on && <Check className="h-4 w-4" style={{ color: t.icon }} strokeWidth={2.6} />}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{RAIL_THEMES[themeIdx]?.name}</p>
        </div>

        <div className="h-px bg-[hsl(var(--hairline))]" />

        {/* ── 표시할 방 — 드래그로 순서, 눈 아이콘으로 표시/숨김 ── */}
        <div className="px-3.5 pb-3 pt-2.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">표시할 방</p>
            <span className="text-[11px] tabular-nums text-muted-foreground/60">{visibleCount}/{RAIL_WORKSPACES.length}</span>
          </div>
          <div className="-mx-1 max-h-[70vh] space-y-0.5 overflow-y-auto pr-0.5">
            {orderedAll.map((item) => {
              const Icon = item.icon;
              const shown = !hiddenKeys.has(item.key);
              return (
                <div
                  key={item.key}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.key); dragRef.current = item.key; setDragKey(item.key); }}
                  onDragEnter={(e) => { e.preventDefault(); if (dragRef.current) onReorder(dragRef.current, item.key); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={() => { dragRef.current = null; setDragKey(null); }}
                  className={cn(
                    'group/rr flex cursor-grab items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent active:cursor-grabbing',
                    dragKey === item.key && 'opacity-40',
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35 group-hover/rr:text-muted-foreground/60" />
                  <Icon className={cn('h-4 w-4 shrink-0', shown ? 'text-foreground' : 'text-muted-foreground/45')} strokeWidth={1.9} />
                  <span className={cn('flex-1 truncate text-[13px]', shown ? 'text-foreground' : 'text-muted-foreground/50')}>{item.label}</span>
                  <button
                    type="button"
                    onClick={() => onToggleHidden(item.key)}
                    aria-label={shown ? `${item.label} 숨기기` : `${item.label} 표시`}
                    aria-pressed={shown}
                    className="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
                  >
                    {shown ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-muted-foreground/60">드래그로 순서 바꾸기 · 눈 아이콘으로 표시/숨김. 숨긴 방도 홈·메뉴로 열 수 있어요.</p>
        </div>
      </PopoverContent>
    </Popover>
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
      className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--rail-icon)] transition-colors hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]"
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
  const accent = RAIL_ACCENT[item.key];
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-[11px] transition-colors',
        active ? 'text-white' : 'text-[var(--rail-icon)] hover:bg-[var(--rail-hover)] hover:text-[var(--rail-hover-ink)]',
      )}
      style={active ? { backgroundColor: accent ?? 'var(--rail-fallback)' } : undefined}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
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

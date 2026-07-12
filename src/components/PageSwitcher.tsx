/**
 * 페이지 스위처 — 통합플래너, 마이위키, 일기 간 빠른 이동.
 *
 * 사용: <PageSwitcher current="planner" />
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Award,
  CalendarDays,
  Network,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PAGE_SWITCHER_DESKTOP_CLASS,
  PAGE_SWITCHER_MOBILE_MENU_CLASS,
  PAGE_SWITCHER_MOBILE_POSITION_CLASS,
} from '@/components/PageWorkspaceTokens';

export type PageSwitcherCurrent =
  | 'home'
  | 'planner'
  | 'wiki'
  | 'journal'
  | 'career';

interface PageSwitcherProps {
  current: PageSwitcherCurrent;
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
  showMobile?: boolean;
  showDesktop?: boolean;
  /** true면 항상 아이콘만 표시한다. */
  compact?: boolean;
}

interface ChipDef {
  key: PageSwitcherCurrent;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
}

export const PageSwitcher = ({
  current,
  className,
  mobileClassName,
  desktopClassName,
  showMobile = true,
  showDesktop = true,
  compact = false,
}: PageSwitcherProps) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuId = useId();
  const mobileRef = useRef<HTMLDivElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeMobileItemRef = useRef<HTMLButtonElement | null>(null);

  const chips: ChipDef[] = [
    { key: 'home', label: '홈', icon: Home, to: '/' },
    { key: 'planner', label: '통합플래너', icon: CalendarDays, to: '/planner' },
    { key: 'wiki', label: '마이위키', icon: Network, to: '/wiki' },
    { key: 'journal', label: '데일리로그', icon: NotebookPen, to: '/journal' },
    { key: 'career', label: '스펙 보드', icon: Award, to: '/career' },
  ];
  const activeChip = chips.find((p) => p.key === current) ?? chips[0];
  const ActiveIcon = activeChip.icon;

  useEffect(() => {
    if (!mobileOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (mobileRef.current?.contains(event.target as Node)) return;
      setMobileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    window.requestAnimationFrame(() => activeMobileItemRef.current?.focus());
  }, [mobileOpen]);

  const goTo = (p: ChipDef) => {
    if (p.key === current) {
      setMobileOpen(false);
      return;
    }
    if (p.onClick) p.onClick();
    else if (p.to) navigate(p.to);
    setMobileOpen(false);
  };

  const focusMobileItem = (index: number) => {
    const items = Array.from(
      mobileRef.current?.querySelectorAll<HTMLButtonElement>('[data-page-switcher-mobile-item="true"]') ?? [],
    );
    if (items.length === 0) return;
    const next = ((index % items.length) + items.length) % items.length;
    items[next]?.focus();
  };

  const onMobileMenuKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(
      mobileRef.current?.querySelectorAll<HTMLButtonElement>('[data-page-switcher-mobile-item="true"]') ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const activeIndex = Math.max(0, currentIndex);
    if (event.key === 'ArrowDown') focusMobileItem(activeIndex + 1);
    else if (event.key === 'ArrowUp') focusMobileItem(activeIndex - 1);
    else if (event.key === 'Home') focusMobileItem(0);
    else if (event.key === 'End') focusMobileItem(items.length - 1);
  };

  const onMobileRootBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (!mobileOpen || (nextTarget instanceof Node && event.currentTarget.contains(nextTarget))) return;
    setMobileOpen(false);
  };

  return (
    <>
      {showMobile && (
        <div
          ref={mobileRef}
          data-page-switcher-root="mobile"
          onBlur={onMobileRootBlur}
          className={cn(
            PAGE_SWITCHER_MOBILE_POSITION_CLASS,
            className,
            mobileClassName,
          )}
        >
          {mobileOpen && (
            <nav
              id={mobileMenuId}
              aria-label="페이지 이동 메뉴"
              onKeyDown={onMobileMenuKeyDown}
              className={PAGE_SWITCHER_MOBILE_MENU_CLASS}
            >
              {chips.map((p) => {
                const Icon = p.icon;
                const active = p.key === current;
                return (
                  <button
                    key={p.key}
                    ref={active ? activeMobileItemRef : undefined}
                    type="button"
                    data-page-switcher-mobile-item="true"
                    onClick={() => goTo(p)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-medium transition-colors',
                      active
                        ? 'bg-primary/12 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            data-page-switcher-trigger="true"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={`페이지 이동: 현재 ${activeChip.label}`}
            title="페이지 이동"
            className="inline-flex h-9 max-w-[132px] items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/90 px-2.5 text-primary shadow-sm backdrop-blur transition-colors hover:bg-card"
          >
            <ActiveIcon className="h-3.5 w-3.5" />
            <span className="max-w-[88px] truncate text-[11.5px] font-semibold text-foreground/80">
              {activeChip.label}
            </span>
          </button>
        </div>
      )}

      {showDesktop && (
        <nav
          aria-label="페이지 이동"
          data-page-switcher-root="desktop"
          className={cn(
            PAGE_SWITCHER_DESKTOP_CLASS,
            className,
            desktopClassName,
          )}
        >
          {chips.map((p) => {
            const Icon = p.icon;
            const active = p.key === current;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => goTo(p)}
                data-page-switcher-item={p.key}
                data-page-switcher-current={active ? 'true' : undefined}
                aria-current={active ? 'page' : undefined}
                aria-label={compact ? p.label : undefined}
                title={p.label}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors',
                  active
                    ? 'cursor-default bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {!compact && <span>{p.label}</span>}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
};

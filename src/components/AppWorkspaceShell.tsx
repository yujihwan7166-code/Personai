import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Network,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type WorkspaceKey = 'planner' | 'wiki' | 'memos' | 'whiteboard' | 'journal';

type WorkspaceDestinationKey = WorkspaceKey | 'home';

interface WorkspaceDestination {
  key: WorkspaceDestinationKey;
  label: string;
  to: string;
  icon: LucideIcon;
}

const WORKSPACE_DESTINATIONS: WorkspaceDestination[] = [
  { key: 'home', label: '홈', to: '/', icon: Home },
  { key: 'planner', label: '통합플래너', to: '/planner', icon: CalendarDays },
  { key: 'wiki', label: '마이위키', to: '/wiki', icon: Network },
  { key: 'memos', label: '메모', to: '/memos', icon: FileText },
  { key: 'whiteboard', label: '화이트보드', to: '/whiteboard', icon: LayoutDashboard },
  { key: 'journal', label: '일기', to: '/journal', icon: NotebookPen },
];

const MOBILE_PRIMARY = WORKSPACE_DESTINATIONS.filter((item) =>
  ['planner', 'wiki', 'memos', 'whiteboard'].includes(item.key),
);
const MOBILE_MORE = WORKSPACE_DESTINATIONS.filter((item) =>
  ['home', 'journal'].includes(item.key),
);

interface AppWorkspaceShellProps {
  current: WorkspaceKey;
  children: ReactNode;
}

export function AppWorkspaceShell({ current, children }: AppWorkspaceShellProps) {
  const moreActive = MOBILE_MORE.some((item) => item.key === current);
  const currentItem = WORKSPACE_DESTINATIONS.find((item) => item.key === current);
  const CurrentIcon = currentItem?.icon ?? CalendarDays;

  return (
    <div className="app-workspace-shell min-h-dvh bg-background text-foreground">
      <div
        data-app-workspace-switcher
        className={cn(
          'fixed right-[calc(0.5rem+env(safe-area-inset-right))] z-[45] hidden sm:block',
          'sm:right-[calc(0.75rem+env(safe-area-inset-right))]',
          current === 'planner'
            ? 'top-[calc(0.8125rem+env(safe-area-inset-top))]'
            : 'top-[calc(0.5rem+env(safe-area-inset-top))]',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="앱 전환"
              className="inline-flex h-8 w-[128px] items-center gap-1.5 rounded-lg border border-foreground/30 bg-card/95 px-2.5 text-[12px] font-semibold text-foreground shadow-[0_6px_18px_-16px_hsl(var(--foreground)/0.42)] backdrop-blur transition-colors hover:border-foreground/40 hover:bg-card"
            >
              <CurrentIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.1} />
              <span className="min-w-0 flex-1 truncate text-left">{currentItem?.label}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2.1} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={5} className="w-[128px] rounded-lg p-1 shadow-[0_12px_32px_-20px_hsl(var(--foreground)/0.5)]">
            {WORKSPACE_DESTINATIONS.map((item) => {
              const Icon = item.icon;
              const active = item.key === current;
              return (
                <DropdownMenuItem key={item.key} asChild>
                  <NavLink
                    to={item.to}
                    className={cn('flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px]', active && 'text-primary')}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active && <Check className="h-3.5 w-3.5" strokeWidth={2.2} />}
                  </NavLink>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <main className="min-w-0 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
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

interface WorkspaceLinkProps {
  item: WorkspaceDestination;
  active: boolean;
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

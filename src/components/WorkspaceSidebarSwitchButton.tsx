import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  FileText,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Network,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkspaceKey } from '@/components/AppWorkspaceShell';
import { cn } from '@/lib/utils';

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

interface WorkspaceSidebarSwitchButtonProps {
  current: WorkspaceKey;
  className?: string;
  contentAlign?: 'start' | 'center' | 'end';
}

export function WorkspaceSidebarSwitchButton({
  current,
  className,
  contentAlign = 'end',
}: WorkspaceSidebarSwitchButtonProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            className,
          )}
          title="페이지 전환"
          aria-label="페이지 전환"
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={1.9} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={contentAlign} sideOffset={6} className="w-40 rounded-lg p-1">
        {WORKSPACE_DESTINATIONS.map((item) => {
          const Icon = item.icon;
          const active = item.key === current;
          return (
            <DropdownMenuItem
              key={item.key}
              onClick={() => {
                if (!active) navigate(item.to);
              }}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px]',
                active && 'text-primary focus:text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.05} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

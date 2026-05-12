/**
 * 페이지 스위처 — 노트 그룹 페이지(통합플래너/마이위키/메모/화이트보드/일기) 간 상단 빠른 이동.
 *
 * 사용: <PageSwitcher current="planner" />
 *
 * 화이트보드는 라우트 미구현 — 클릭 시 "준비 중" toast.
 */
import { useNavigate } from 'react-router-dom';
import {
  Home,
  CalendarDays,
  Network,
  FileText,
  LayoutDashboard,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

export type PageSwitcherCurrent =
  | 'home'
  | 'planner'
  | 'wiki'
  | 'memos'
  | 'whiteboard'
  | 'journal';

interface PageSwitcherProps {
  current: PageSwitcherCurrent;
  className?: string;
  /** true 면 항상 아이콘만 (좁은 사이드바용). */
  compact?: boolean;
}

interface ChipDef {
  key: PageSwitcherCurrent;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
}

export const PageSwitcher = ({ current, className, compact = false }: PageSwitcherProps) => {
  const navigate = useNavigate();

  const chips: ChipDef[] = [
    { key: 'home',       label: '홈',         icon: Home,            to: '/' },
    { key: 'planner',    label: '통합플래너', icon: CalendarDays,    to: '/planner' },
    { key: 'wiki',       label: '마이위키',   icon: Network,         to: '/wiki' },
    { key: 'memos',      label: '메모',       icon: FileText,        to: '/memos' },
    { key: 'whiteboard', label: '화이트보드', icon: LayoutDashboard, onClick: () => notify.info('화이트보드', { description: '준비 중이에요.' }) },
    { key: 'journal',    label: '일기',       icon: NotebookPen,     to: '/journal' },
  ];

  return (
    <nav
      aria-label="페이지 이동"
      className={cn(
        'inline-flex flex-wrap items-center gap-0.5 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/60',
        className,
      )}
    >
      {chips.map((p) => {
        const Icon = p.icon;
        const active = p.key === current;
        const handle = () => {
          if (active) return;
          if (p.onClick) p.onClick();
          else if (p.to) navigate(p.to);
        };
        return (
          <button
            key={p.key}
            type="button"
            onClick={handle}
            aria-current={active ? 'page' : undefined}
            title={p.label}
            className={cn(
              'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium transition-colors',
              active
                ? 'bg-primary/12 text-primary cursor-default'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span className="hidden sm:inline">{p.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};

/**
 * 페이지 스위처 — 홈 + 플래너·위키·메모·일기 4개 모드 칩.
 *
 * 4개 페이지 (Planner / Wiki / Memos / Journal) 헤더에 공통 사용.
 * active 키는 페이지 자기 자신 — 클릭 시 noop, 시각 강조.
 */
import { useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Network, FileText, NotebookPen, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PageSwitcherKey = 'planner' | 'wiki' | 'memos' | 'journal';

const ITEMS: Array<{ key: PageSwitcherKey; label: string; icon: LucideIcon; path: string }> = [
  { key: 'planner', label: '플래너', icon: CalendarDays, path: '/planner' },
  { key: 'wiki',    label: '위키',    icon: Network,      path: '/wiki'    },
  { key: 'memos',   label: '메모',    icon: FileText,     path: '/memos'   },
  { key: 'journal', label: '일기',    icon: NotebookPen,  path: '/journal' },
];

interface PageSwitcherProps {
  active: PageSwitcherKey;
  className?: string;
}

export const PageSwitcher = ({ active, className }: PageSwitcherProps) => {
  const navigate = useNavigate();
  return (
    <nav
      aria-label="페이지 이동"
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/60 shrink-0',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="홈 (모드 선택)"
        title="홈 · 모드 선택"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </button>
      <span className="w-px h-4 bg-[hsl(var(--hairline))]" aria-hidden />
      {ITEMS.map((p) => {
        const isActive = p.key === active;
        const Icon = p.icon;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => { if (!isActive) navigate(p.path); }}
            aria-current={isActive ? 'page' : undefined}
            title={p.label}
            className={cn(
              'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium transition-colors',
              isActive
                ? 'bg-primary/12 text-primary cursor-default'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/**
 * 좌측 아이콘 rail — Notion/Linear 스타일.
 *
 * - 라우트(홈/발견) + drawer (저널/메모/위키) 토글
 * - 아이콘만 표시, 라벨은 Tooltip 으로
 * - 폭 48px 고정
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Compass, FileText, Home, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MemoDrawer } from './MemoDrawer';
import { JournalDrawer } from './JournalDrawer';
import { WikiDrawer } from './WikiDrawer';

type DrawerKind = 'memos' | 'journal' | 'wiki';

type RailItem =
  | { kind: 'route'; to: string; label: string; Icon: typeof FileText }
  | { kind: 'drawer'; drawer: DrawerKind; label: string; Icon: typeof FileText };

const ITEMS: RailItem[] = [
  { kind: 'route',  to: '/',          label: '홈',   Icon: Home },
  { kind: 'drawer', drawer: 'journal', label: '저널', Icon: BookOpen },
  { kind: 'route',  to: '/discover',  label: '발견', Icon: Compass },
  { kind: 'drawer', drawer: 'memos',  label: '메모', Icon: FileText },
  { kind: 'drawer', drawer: 'wiki',   label: '위키', Icon: Network },
];

export const PlannerLeftRail = () => {
  const navigate = useNavigate();
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col items-center gap-1 py-3">
        {ITEMS.map((item) => {
          const isActive = item.kind === 'drawer' && activeDrawer === item.drawer;
          const onClick = () => {
            if (item.kind === 'route') navigate(item.to);
            else setActiveDrawer(activeDrawer === item.drawer ? null : item.drawer);
          };
          const key = item.kind === 'route' ? `r-${item.to}` : `d-${item.drawer}`;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onClick}
                  aria-label={item.label}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-foreground/55 hover:text-foreground hover:bg-accent/60',
                  )}
                >
                  <item.Icon className="h-[17px] w-[17px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[11.5px]">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <MemoDrawer
        open={activeDrawer === 'memos'}
        onOpenChange={(o) => setActiveDrawer(o ? 'memos' : null)}
      />
      <JournalDrawer
        open={activeDrawer === 'journal'}
        onOpenChange={(o) => setActiveDrawer(o ? 'journal' : null)}
      />
      <WikiDrawer
        open={activeDrawer === 'wiki'}
        onOpenChange={(o) => setActiveDrawer(o ? 'wiki' : null)}
      />
    </TooltipProvider>
  );
};

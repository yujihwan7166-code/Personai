/**
 * 좌측 아이콘 rail — Notion/Linear 스타일.
 *
 * 순서: 홈, 습관, AI, 검색, 메모, 위키, 타이머
 * - route: 라우트 점프
 * - drawer: 사이드 패널 (메모/위키)
 * - event: window CustomEvent 발행 (검색 = 팔레트, 그 외는 placeholder toast)
 * 폭 48px 고정.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Home, Network, Repeat, Search, Sparkles, Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MemoDrawer } from './MemoDrawer';
import { WikiDrawer } from './WikiDrawer';

type DrawerKind = 'memos' | 'wiki';

type RailItem =
  | { kind: 'route'; to: string; label: string; Icon: typeof FileText }
  | { kind: 'drawer'; drawer: DrawerKind; label: string; Icon: typeof FileText }
  | { kind: 'event'; eventName: string; label: string; Icon: typeof FileText }
  | { kind: 'soon'; label: string; Icon: typeof FileText };

/** Planner 가 listen 하는 커스텀 이벤트 이름들 — 결합도 낮추기. */
export const RAIL_EVENT = {
  openPalette: 'planner:open-palette',
} as const;

const ITEMS: RailItem[] = [
  { kind: 'route',  to: '/',                       label: '홈',     Icon: Home },
  { kind: 'soon',                                  label: '습관',   Icon: Repeat },
  { kind: 'soon',                                  label: 'AI',     Icon: Sparkles },
  { kind: 'event',  eventName: RAIL_EVENT.openPalette, label: '검색',   Icon: Search },
  { kind: 'drawer', drawer: 'memos',               label: '메모',   Icon: FileText },
  { kind: 'drawer', drawer: 'wiki',                label: '위키',   Icon: Network },
  { kind: 'soon',                                  label: '타이머', Icon: Timer },
];

export const PlannerLeftRail = () => {
  const navigate = useNavigate();
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col items-center gap-1 py-3">
        {ITEMS.map((item, idx) => {
          const isActive = item.kind === 'drawer' && activeDrawer === item.drawer;
          const onClick = () => {
            if (item.kind === 'route') navigate(item.to);
            else if (item.kind === 'drawer') {
              setActiveDrawer(activeDrawer === item.drawer ? null : item.drawer);
            } else if (item.kind === 'event') {
              window.dispatchEvent(new CustomEvent(item.eventName));
            } else {
              notify.info(`${item.label} 곧 추가됩니다`, { duration: 1200 });
            }
          };
          return (
            <Tooltip key={`${item.kind}-${idx}-${item.label}`}>
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
                    item.kind === 'soon' && 'opacity-55',
                  )}
                >
                  <item.Icon className="h-[17px] w-[17px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[11.5px]">
                {item.label}
                {item.kind === 'soon' && <span className="ml-1 opacity-55">· 곧</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <MemoDrawer
        open={activeDrawer === 'memos'}
        onOpenChange={(o) => setActiveDrawer(o ? 'memos' : null)}
      />
      <WikiDrawer
        open={activeDrawer === 'wiki'}
        onOpenChange={(o) => setActiveDrawer(o ? 'wiki' : null)}
      />
    </TooltipProvider>
  );
};

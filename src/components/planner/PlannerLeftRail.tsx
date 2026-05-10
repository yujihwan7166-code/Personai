/**
 * 좌측 아이콘 rail — Notion/Linear 스타일.
 *
 * 최상단: 사이트 로고 (실제 홈 / 으로 이탈)
 * 상단 그룹: 모드, 오늘, 습관, AI, 검색, 매트릭스, 다가오는 일정, 메모, 위키, 타이머
 * 하단 그룹(mt-auto): 설정 (placeholder, 곧)
 * - route: 라우트 점프
 * - drawer: 사이드 패널 (메모/위키)
 * - event: window CustomEvent 발행 (검색 = 팔레트, 오늘 = day 뷰 + 오늘로, 모드 = MainModeTabs 패널)
 * 폭 48px 고정.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, CalendarDays, FileText, Grid2x2, Home, LayoutGrid, Network, Repeat,
  Search, Settings, Sparkles, Timer,
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
  openMatrix: 'planner:open-matrix',
  openAgenda: 'planner:open-agenda',
  openHabits: 'planner:open-habits',
  goToday: 'planner:go-today',
  openModePalette: 'planner:open-mode-palette',
} as const;

const TOP_ITEMS: RailItem[] = [
  { kind: 'event',  eventName: RAIL_EVENT.openModePalette, label: '모드',         Icon: LayoutGrid },
  { kind: 'event',  eventName: RAIL_EVENT.goToday,         label: '오늘',         Icon: CalendarDays },
  { kind: 'event',  eventName: RAIL_EVENT.openHabits,      label: '습관',         Icon: Repeat },
  { kind: 'soon',                                         label: 'AI',           Icon: Sparkles },
  { kind: 'event',  eventName: RAIL_EVENT.openPalette,     label: '검색',         Icon: Search },
  { kind: 'event',  eventName: RAIL_EVENT.openMatrix,      label: '매트릭스',     Icon: Grid2x2 },
  { kind: 'event',  eventName: RAIL_EVENT.openAgenda,      label: '다가오는 일정',  Icon: CalendarClock },
  { kind: 'drawer', drawer: 'memos',                      label: '메모',         Icon: FileText },
  { kind: 'drawer', drawer: 'wiki',                       label: '위키',         Icon: Network },
  { kind: 'soon',                                         label: '타이머',       Icon: Timer },
];

const BOTTOM_ITEMS: RailItem[] = [
  { kind: 'soon',                                         label: '설정',         Icon: Settings },
];

export const PlannerLeftRail = () => {
  const navigate = useNavigate();
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind | null>(null);

  const renderItem = (item: RailItem, idx: number) => {
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
              'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
              isActive
                ? 'bg-card text-primary shadow-[0_1px_2px_hsl(30_15%_8%/0.06)]'
                : 'text-foreground/50 hover:text-foreground hover:bg-accent/70',
              item.kind === 'soon' && 'opacity-45',
            )}
          >
            <item.Icon className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-[11.5px]">
          {item.label}
          {item.kind === 'soon' && <span className="ml-1 opacity-55">· 곧</span>}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col items-center gap-1 py-3">
        {/* 사이트 로고 — 진짜 홈(/)으로 이탈. 다른 rail 아이콘과 시각적으로 분리. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="사이트 홈으로"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent/70 transition-all"
            >
              <Home className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11.5px]">
            사이트 홈으로
          </TooltipContent>
        </Tooltip>
        <div className="my-1 h-px w-5 bg-border/60" aria-hidden />

        {TOP_ITEMS.map(renderItem)}

        {/* 하단 그룹 — 메타/글로벌 (설정 등). 위 그룹과 자동 분리. */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="my-1 h-px w-5 bg-border/60" aria-hidden />
          {BOTTOM_ITEMS.map((item, idx) => renderItem(item, TOP_ITEMS.length + idx))}
        </div>
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

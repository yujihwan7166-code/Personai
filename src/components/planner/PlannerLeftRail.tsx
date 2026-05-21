/**
 * 좌측 아이콘 rail — Notion/Linear 스타일.
 *
 * 최상단(글로벌 네비): 사이트 로고 (실제 홈 / 으로 이탈), 모드 (사이트 모드 picker)
 * 1그룹(플래너 핵심): 오늘, 습관, AI, 검색, 매트릭스, 다가오는 일정
 * 2그룹(기록): 메모, 위키
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
  Search, Settings, Sparkles,
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
  toggleAI: 'planner:toggle-ai',
} as const;

/** 1그룹 — 플래너 핵심(시간·일정·검색). */
const TOP_ITEMS_PRIMARY: RailItem[] = [
  { kind: 'event',  eventName: RAIL_EVENT.goToday,         label: '오늘',         Icon: CalendarDays },
  { kind: 'event',  eventName: RAIL_EVENT.openHabits,      label: '습관',         Icon: Repeat },
  { kind: 'event',  eventName: RAIL_EVENT.toggleAI,        label: 'AI',           Icon: Sparkles },
  { kind: 'event',  eventName: RAIL_EVENT.openPalette,     label: '검색',         Icon: Search },
  { kind: 'event',  eventName: RAIL_EVENT.openMatrix,      label: '매트릭스',     Icon: Grid2x2 },
  { kind: 'event',  eventName: RAIL_EVENT.openAgenda,      label: '다가오는 일정',  Icon: CalendarClock },
];

/** 2그룹 — 기록 도구. */
const TOP_ITEMS_SECONDARY: RailItem[] = [
  { kind: 'drawer', drawer: 'memos',                      label: '메모',         Icon: FileText },
  { kind: 'drawer', drawer: 'wiki',                       label: '위키',         Icon: Network },
];

const BOTTOM_ITEMS: RailItem[] = [
  { kind: 'soon',                                         label: '설정',         Icon: Settings },
];

interface PlannerLeftRailProps {
  /** AI 패널 열림 상태 — ✨ 버튼 active 시각 피드백용. */
  aiOpen?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export const PlannerLeftRail = ({ aiOpen = false, orientation = 'vertical' }: PlannerLeftRailProps) => {
  const navigate = useNavigate();
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind | null>(null);
  const horizontal = orientation === 'horizontal';
  const tooltipSide = horizontal ? 'top' : 'right';

  const renderItem = (item: RailItem, idx: number) => {
    const isActive = (item.kind === 'drawer' && activeDrawer === item.drawer)
      || (item.kind === 'event' && item.eventName === RAIL_EVENT.toggleAI && aiOpen);
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
        <TooltipContent side={tooltipSide} className="text-[11.5px]">
          {item.label}
          {item.kind === 'soon' && <span className="ml-1 opacity-55">· 곧</span>}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          horizontal
            ? 'flex h-full w-full items-center gap-1 overflow-x-auto px-3 py-2'
            : 'h-full flex flex-col items-center gap-1 py-3',
        )}
      >
        {/* ── 글로벌 네비 그룹 — 사이트 홈 + 모드 전환. 플래너 밖으로 나가는 액션들. ── */}
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
          <TooltipContent side={tooltipSide} className="text-[11.5px]">
            사이트 홈으로
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(RAIL_EVENT.openModePalette))}
              aria-label="모드"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/50 hover:text-foreground hover:bg-accent/70 transition-all"
            >
              <LayoutGrid className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide} className="text-[11.5px]">
            모드
          </TooltipContent>
        </Tooltip>
        <div className={cn(horizontal ? 'mx-1 h-5 w-px bg-border/60' : 'my-1 h-px w-5 bg-border/60')} aria-hidden />

        {TOP_ITEMS_PRIMARY.map(renderItem)}
        <div className={cn(horizontal ? 'mx-1 h-5 w-px bg-border/60' : 'my-1 h-px w-5 bg-border/60')} aria-hidden />
        {TOP_ITEMS_SECONDARY.map((item, idx) =>
          renderItem(item, TOP_ITEMS_PRIMARY.length + idx),
        )}

        {/* 하단 그룹 — 메타/글로벌 (설정 등). 위 그룹과 자동 분리. */}
        <div className={cn(horizontal ? 'ml-auto flex items-center gap-1' : 'mt-auto flex flex-col items-center gap-1')}>
          <div className={cn(horizontal ? 'mx-1 h-5 w-px bg-border/60' : 'my-1 h-px w-5 bg-border/60')} aria-hidden />
          {BOTTOM_ITEMS.map((item, idx) =>
            renderItem(item, TOP_ITEMS_PRIMARY.length + TOP_ITEMS_SECONDARY.length + idx),
          )}
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

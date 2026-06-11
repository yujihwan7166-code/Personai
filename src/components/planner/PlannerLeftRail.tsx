/**
 * 좌측 아이콘 rail — Notion/Linear 스타일.
 *
 * 최상단(글로벌 네비): 사이트 로고 (실제 홈 / 으로 이탈), 모드 (사이트 모드 picker)
 * 1그룹(플래너 핵심): 오늘, 습관, 매트릭스, 다가오는 일정
 * 하단 그룹(mt-auto): 설정 (placeholder, 곧)
 * - route: 라우트 점프
 * - event: window CustomEvent 발행 (검색 = 팔레트, 오늘 = day 뷰 + 오늘로, 모드 = MainModeTabs 패널)
 * 폭 48px 고정.
 */
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, Grid2x2, Home, LayoutGrid,
  Archive, Flag, Settings, Trash2, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RAIL_EVENT } from './plannerRailEvents';

type RailItem =
  | { kind: 'route'; to: string; label: string; Icon: LucideIcon }
  | { kind: 'event'; eventName: string; label: string; Icon: LucideIcon }
  | { kind: 'soon'; label: string; Icon: LucideIcon };

/** Planner 가 listen 하는 커스텀 이벤트 이름들 — 결합도 낮추기. */
/** 1그룹 — 플래너 핵심(시간·일정·검색). */
const TOP_ITEMS_PRIMARY: RailItem[] = [
  { kind: 'event',  eventName: RAIL_EVENT.openMatrix,      label: '매트릭스',     Icon: Grid2x2 },
  { kind: 'event',  eventName: RAIL_EVENT.openAgenda,      label: '다가오는 일정',  Icon: CalendarClock },
  { kind: 'event',  eventName: RAIL_EVENT.openDdayCreate,  label: 'D-day 설정',  Icon: Flag },
  { kind: 'event',  eventName: RAIL_EVENT.openLibrary,     label: '보관함',       Icon: Archive },
  { kind: 'event',  eventName: RAIL_EVENT.openTrash,       label: '휴지통',       Icon: Trash2 },
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
  const horizontal = orientation === 'horizontal';
  const tooltipSide = horizontal ? 'top' : 'right';

  const renderItem = (item: RailItem, idx: number) => {
    const isActive = item.kind === 'event' && item.eventName === RAIL_EVENT.toggleAI && aiOpen;
    const onClick = () => {
      if (item.kind === 'route') navigate(item.to);
      else if (item.kind === 'event') {
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
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all',
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
            ? 'flex h-full w-full items-center gap-1 overflow-x-auto px-2 py-2'
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent/70 transition-all"
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
              aria-label="모드 전환: 현재 통합 플래너"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/50 hover:text-foreground hover:bg-accent/70 transition-all"
            >
              <LayoutGrid className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide} className="text-[11.5px]">
            모드 전환
          </TooltipContent>
        </Tooltip>
        <div className={cn(horizontal ? 'mx-1 h-5 w-px shrink-0 bg-border/60' : 'my-1 h-px w-5 bg-border/60')} aria-hidden />

        {TOP_ITEMS_PRIMARY.map(renderItem)}

        {/* 하단 그룹 — 메타/글로벌 (설정 등). 위 그룹과 자동 분리. */}
        {!horizontal && (
          <div className="mt-auto flex flex-col items-center gap-1">
            <div className="my-1 h-px w-5 bg-border/60" aria-hidden />
            {BOTTOM_ITEMS.map((item, idx) =>
              renderItem(item, TOP_ITEMS_PRIMARY.length + idx),
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

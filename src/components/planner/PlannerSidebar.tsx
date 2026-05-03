/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { Calendar, CalendarDays, CalendarRange, Grid2x2, LayoutGrid, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ViewToggle, type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerDday } from './PlannerDday';
import { PlannerMatrixMini } from './PlannerMatrixMini';

const MODE_OPTIONS: Array<{ id: PlannerView; label: string; hint: string; Icon: typeof Calendar }> = [
  { id: 'day',   label: '일',   hint: '오늘 시간표 + 할 일', Icon: Calendar },
  { id: 'week',  label: '주',   hint: '일주일 한눈에',       Icon: CalendarRange },
  { id: 'month', label: '월',   hint: '월 캘린더',            Icon: CalendarDays },
  { id: 'year',  label: '년',   hint: '연 히트맵',            Icon: LayoutGrid },
  { id: 'goals', label: '목표', hint: '진행률 추적',          Icon: Target },
];

interface PlannerSidebarProps {
  anchorIso: string;
  view: PlannerView;
  onViewChange: (view: PlannerView) => void;
  /** 미니 월에서 날짜 클릭 시 — Day 뷰로 전환 + anchor 갱신을 부모가 처리. */
  onSelectDay: (dayIso: string) => void;
  /** 매트릭스 위젯에서 task 클릭 시 — 모달 오픈을 부모가 처리. */
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const PlannerSidebar = ({
  anchorIso,
  view,
  onViewChange,
  onSelectDay,
  onTaskClick,
}: PlannerSidebarProps) => {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* 상단 — 모드 그리드 + 제목 + 뷰 토글 */}
      <div className="shrink-0 px-1">
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="모드 목록"
                title="모드 목록"
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[hsl(var(--hairline))] bg-card text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              >
                <Grid2x2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55">
                모드
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MODE_OPTIONS.map((opt) => {
                const active = view === opt.id;
                return (
                  <DropdownMenuItem
                    key={opt.id}
                    onSelect={() => onViewChange(opt.id)}
                    className={cn(
                      'flex items-start gap-2 cursor-pointer',
                      active && 'bg-accent',
                    )}
                  >
                    <opt.Icon className={cn('h-4 w-4 mt-0.5 shrink-0', active ? 'text-foreground' : 'text-foreground/55')} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium leading-tight">{opt.label}</span>
                      <span className="text-[11px] text-foreground/55 leading-tight truncate">{opt.hint}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <h1 className="text-[15px] font-semibold tracking-tight leading-none truncate flex-1">통합 플래너</h1>
          <ViewToggle value={view} onChange={onViewChange} />
        </div>
      </div>

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 미니 월 캘린더 */}
      <PlannerMiniMonth anchorIso={anchorIso} onSelectDay={onSelectDay} />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* D-day — 시험·발표·생일·마감 등 카운트다운 */}
      <PlannerDday />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 미니 아이젠하워 매트릭스 — 글랜스용 */}
      <PlannerMatrixMini onTaskClick={onTaskClick} />
    </div>
  );
};

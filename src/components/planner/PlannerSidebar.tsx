/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ViewToggle, type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerUpNext } from './PlannerUpNext';

interface PlannerSidebarProps {
  anchorIso: string;
  view: PlannerView;
  onViewChange: (view: PlannerView) => void;
  /** 미니 월에서 날짜 클릭 시 — Day 뷰로 전환 + anchor 갱신을 부모가 처리. */
  onSelectDay: (dayIso: string) => void;
  /** 다가오는 일정 클릭 시 — 모달 등 외부 동작. */
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const PlannerSidebar = ({
  anchorIso,
  view,
  onViewChange,
  onSelectDay,
  onTaskClick,
}: PlannerSidebarProps) => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 상단 — 메인 링크 + 제목 + 뷰 토글 */}
      <div className="shrink-0 px-1">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.16em] mb-2"
          aria-label="메인으로"
        >
          <ChevronLeft className="h-3 w-3" />
          <span>메인</span>
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight leading-none mb-2">통합 플래너</h1>
        <ViewToggle value={view} onChange={onViewChange} />
      </div>

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 미니 월 캘린더 */}
      <PlannerMiniMonth anchorIso={anchorIso} onSelectDay={onSelectDay} />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 다가오는 일정 — 다음 7일 시간순 미니 list */}
      <PlannerUpNext onItemClick={onTaskClick} />
    </div>
  );
};

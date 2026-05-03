/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { ViewToggle, type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerDday } from './PlannerDday';

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
      {/* 제목 + 뷰 토글 */}
      <div className="shrink-0 px-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight leading-none truncate">통합 플래너</h1>
          <ViewToggle value={view} onChange={onViewChange} />
        </div>
      </div>

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 미니 월 캘린더 */}
      <PlannerMiniMonth anchorIso={anchorIso} onSelectDay={onSelectDay} />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* D-day — 시험·발표·생일·마감 등 카운트다운 */}
      <PlannerDday />
    </div>
  );
};

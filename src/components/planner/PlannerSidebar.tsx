/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerDday } from './PlannerDday';
import { HabitTodayWidget } from './HabitTodayWidget';

interface PlannerSidebarProps {
  anchorIso: string;
  view: PlannerView;
  /** 미니 월에서 날짜 클릭 시 — Day 뷰로 전환 + anchor 갱신을 부모가 처리. */
  onSelectDay: (dayIso: string) => void;
  /** 매트릭스 위젯에서 task 클릭 시 — 모달 오픈을 부모가 처리. */
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** 사이드바 "오늘의 습관" 헤더 클릭 — habits 풀뷰 점프. */
  onOpenHabits?: () => void;
}

export const PlannerSidebar = ({
  anchorIso,
  view,
  onSelectDay,
  onTaskClick,
  onOpenHabits,
}: PlannerSidebarProps) => {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* 제목·뷰 토글 제거됨 — 페이지 상단 mini nav 로 단일화 (Planner.tsx). */}

      {/* 미니 월 캘린더 */}
      <PlannerMiniMonth anchorIso={anchorIso} onSelectDay={onSelectDay} />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* D-day — 시험·발표·생일·마감 등 카운트다운 */}
      <PlannerDday />

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 오늘의 습관 — 인라인 체크 + 풀뷰 점프 */}
      <HabitTodayWidget onOpenAll={onOpenHabits} />
    </div>
  );
};

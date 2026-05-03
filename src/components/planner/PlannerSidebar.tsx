/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { useState } from 'react';
import { Grid2x2 } from 'lucide-react';
import { ViewToggle, type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerDday } from './PlannerDday';
import { PlannerMatrixMini } from './PlannerMatrixMini';
import { ModeLauncher } from './ModeLauncher';

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
  const [launcherOpen, setLauncherOpen] = useState(false);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 맨 위 — 모드 런처 버튼 (단독 행) */}
      <div className="shrink-0 px-1">
        <button
          type="button"
          onClick={() => setLauncherOpen(true)}
          aria-label="모드 목록 열기"
          title="모드 목록"
          className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-md border border-[hsl(var(--hairline))] bg-card text-foreground/75 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Grid2x2 className="h-4 w-4" />
          <span className="text-[12px] font-medium">모드</span>
        </button>
      </div>

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

      <div className="border-t border-[hsl(var(--hairline))] pt-3" />

      {/* 미니 아이젠하워 매트릭스 — 글랜스용 */}
      <PlannerMatrixMini onTaskClick={onTaskClick} />

      <ModeLauncher
        open={launcherOpen}
        view={view}
        onOpenChange={setLauncherOpen}
        onViewChange={onViewChange}
      />
    </div>
  );
};

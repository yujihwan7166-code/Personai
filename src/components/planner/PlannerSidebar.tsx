/**
 * 좌측 사이드바 — 뷰 무관 universal 영역.
 *
 * 1) 상단: < 메인 / 통합 플래너 제목 / 뷰 토글 (일/주/월/년)
 * 2) 본체: 미니 월 캘린더 (날짜 점프, 도트로 항목 분포)
 *
 * 추후: 오버듀, 다가오는 일정 위젯 추가 예정.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Compass, FileText, Home, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewToggle, type PlannerView } from './ViewToggle';
import { PlannerMiniMonth } from './PlannerMiniMonth';
import { PlannerDday } from './PlannerDday';
import { MemoDrawer } from './MemoDrawer';

interface PlannerSidebarProps {
  anchorIso: string;
  view: PlannerView;
  onViewChange: (view: PlannerView) => void;
  /** 미니 월에서 날짜 클릭 시 — Day 뷰로 전환 + anchor 갱신을 부모가 처리. */
  onSelectDay: (dayIso: string) => void;
}

type QuickNavItem =
  | { kind: 'route'; to: string; label: string; Icon: typeof FileText }
  | { kind: 'drawer'; drawer: 'memos'; label: string; Icon: typeof FileText };

const QUICK_NAV: QuickNavItem[] = [
  { kind: 'route', to: '/',         label: '홈',    Icon: Home },
  { kind: 'drawer', drawer: 'memos', label: '메모',  Icon: FileText },
  { kind: 'route', to: '/journal',  label: '저널',  Icon: BookOpen },
  { kind: 'route', to: '/wiki',     label: '위키',  Icon: Network },
  { kind: 'route', to: '/discover', label: '발견',  Icon: Compass },
];

export const PlannerSidebar = ({
  anchorIso,
  view,
  onViewChange,
  onSelectDay,
}: PlannerSidebarProps) => {
  const navigate = useNavigate();
  // 메모 등 floating drawer — 라우트 점프 대신 옆 panel 로 띄움.
  const [activeDrawer, setActiveDrawer] = useState<'memos' | null>(null);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 상단 — 제목 + 뷰 토글 한 줄 */}
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

      {/* 다른 라우트 quick nav — "통합 플래너" 답게 다른 도구로 빠른 진입. */}
      <nav className="px-1" aria-label="빠른 이동">
        <div className="px-1.5 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
          빠른 이동
        </div>
        <div className="grid grid-cols-2 gap-1">
          {QUICK_NAV.map((item) => {
            const key = item.kind === 'route' ? item.to : `drawer-${item.drawer}`;
            const onClick = () => {
              if (item.kind === 'route') navigate(item.to);
              else setActiveDrawer(item.drawer);
            };
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-md',
                  'text-[12px] font-medium text-foreground/80 hover:text-foreground hover:bg-accent',
                  'transition-colors',
                )}
              >
                <item.Icon className="h-3.5 w-3.5 text-foreground/55" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating drawers — 라우트 점프 없이 panel 로 참고. */}
      <MemoDrawer
        open={activeDrawer === 'memos'}
        onOpenChange={(o) => setActiveDrawer(o ? 'memos' : null)}
      />
    </div>
  );
};

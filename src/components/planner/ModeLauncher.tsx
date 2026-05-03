/**
 * 모드 런처 — 사이드바 맨 위 2×2 버튼 클릭 시 뜨는 플로팅 카드 그리드.
 *
 * 큰 카드(아이콘+제목+설명) 형태. 모드 선택 시 onViewChange + 닫힘.
 * Dialog 위에 띄워 일반 popover 보다 시각적 강조.
 */
import { Calendar, CalendarDays, CalendarRange, LayoutGrid, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import type { PlannerView } from './ViewToggle';

interface ModeLauncherProps {
  open: boolean;
  view: PlannerView;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: PlannerView) => void;
}

const MODES: Array<{ id: PlannerView; label: string; hint: string; Icon: typeof Calendar; tone: string }> = [
  { id: 'day',   label: '일',   hint: '오늘 시간표 + 할 일',     Icon: Calendar,      tone: 'from-rose-500/15  to-rose-500/0' },
  { id: 'week',  label: '주',   hint: '일주일 한눈에',           Icon: CalendarRange, tone: 'from-amber-500/15 to-amber-500/0' },
  { id: 'month', label: '월',   hint: '월 캘린더 그리드',         Icon: CalendarDays,  tone: 'from-emerald-500/15 to-emerald-500/0' },
  { id: 'year',  label: '년',   hint: '연 활동 히트맵',           Icon: LayoutGrid,    tone: 'from-blue-500/15 to-blue-500/0' },
  { id: 'goals', label: '목표', hint: '진행률 추적',              Icon: Target,        tone: 'from-violet-500/15 to-violet-500/0' },
];

export const ModeLauncher = ({ open, view, onOpenChange, onViewChange }: ModeLauncherProps) => {
  const select = (id: PlannerView) => {
    onViewChange(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" hideClose>
        <DialogTitle className="sr-only">모드 선택</DialogTitle>
        <DialogDescription className="sr-only">통합 플래너의 보기 모드를 선택합니다.</DialogDescription>
        <div className="px-5 pt-5 pb-3">
          <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-foreground/55 font-semibold">
            모드 선택
          </div>
          <div className="text-[15px] font-semibold tracking-tight mt-1">어떤 화면으로 볼까요?</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 pt-1">
          {MODES.map((m) => {
            const active = view === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => select(m.id)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-card text-left p-3 min-h-[96px]',
                  'transition-all hover:-translate-y-0.5 hover:shadow-md',
                  active
                    ? 'border-foreground ring-2 ring-foreground/15'
                    : 'border-[hsl(var(--hairline))] hover:border-foreground/30',
                )}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', m.tone)} aria-hidden />
                <div className="relative flex flex-col gap-1.5">
                  <m.Icon className="h-5 w-5 text-foreground/85" />
                  <div className="text-[14px] font-semibold leading-tight">{m.label}</div>
                  <div className="text-[11.5px] text-foreground/65 leading-tight">{m.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[hsl(var(--hairline))] text-[11px] text-foreground/55">
          <kbd className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 font-mono text-[10px]">D</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 font-mono text-[10px]">W</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 font-mono text-[10px]">M</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 font-mono text-[10px]">Y</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 font-mono text-[10px]">G</kbd>{' '}
          단축키로도 전환할 수 있어요.
        </div>
      </DialogContent>
    </Dialog>
  );
};

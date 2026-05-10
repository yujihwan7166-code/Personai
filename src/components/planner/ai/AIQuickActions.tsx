/**
 * 빠른 액션 — view 별 사전 정의 프롬프트 카드 그리드.
 *
 * 형태: 2-컬럼 카드 그리드 (icon + title + sub).
 * 빈 상태에서는 카드 그리드, 메시지 있을 때는 컴팩트 칩 모드(compact=true) 로 전환.
 */
import {
  ListOrdered, AlignJustify, Search, Plus, CheckCheck, Coffee, Sparkles,
  CalendarPlus, ClipboardList, Activity, BarChart3, Compass, Trophy,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIQuickAction } from '@/types/plannerAI';
import type { PlannerView } from '@/components/planner/ViewToggle';

interface QuickActionItem extends AIQuickAction {
  icon: LucideIcon;
  /** 한 줄 부가 설명 (카드 모드에서만 노출). */
  desc?: string;
  /** 색상 hint — accent 색 점으로 표시. */
  tint?: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose';
}

const ALL_ACTIONS: QuickActionItem[] = [
  // ── day ──
  { id: 'today-priority', icon: ListOrdered,  label: '오늘 우선순위',  desc: '뭐부터 할지 1·2·3', prompt: '오늘 뭐 먼저 하면 좋을까? 우선순위 1·2·3 으로 추천해줘.', tint: 'blue',    visibleOn: ['day'] },
  { id: 'today-summary',  icon: AlignJustify, label: '오늘 정리',      desc: '시간순 + 충돌 체크', prompt: '오늘 일정 시간순으로 정리해주고 충돌이나 빡빡한 구간 있으면 알려줘.', tint: 'emerald', visibleOn: ['day'] },
  { id: 'today-gaps',     icon: Search,       label: '빈 시간 찾기',   desc: '비어있는 구간',     prompt: '오늘 비어있는 시간대 어디 있어? HH:MM~HH:MM 으로 알려줘.', tint: 'violet',  visibleOn: ['day'] },
  { id: 'today-add-event', icon: CalendarPlus, label: '일정 추가',     desc: '예: 3시 회의 1시간', prompt: '오늘 오후 3시에 회의 1시간 추가해줘.', tint: 'amber',   visibleOn: ['day'] },
  { id: 'today-add-task',  icon: Plus,        label: '할 일 추가',    desc: '예: 약 사기',       prompt: '오늘 할 일로 "약 사기" 추가해줘.', tint: 'rose',    visibleOn: ['day'] },
  { id: 'today-break',    icon: Coffee,       label: '휴식 추천',     desc: '쉴 타이밍 제안',    prompt: '오늘 일정 보고 언제쯤 쉬는 게 좋을지 1-2개 추천해줘.', tint: 'amber',   visibleOn: ['day'] },

  // ── week ──
  { id: 'week-review',    icon: CheckCheck,   label: '이번 주 회고',  desc: '잘한 점 + 다음 주', prompt: '이번 주 어땠어? 잘한 점·아쉬운 점 짧게 짚고 다음 주에 한 가지 제안해줘.', tint: 'emerald', visibleOn: ['week'] },
  { id: 'week-plan',      icon: Compass,      label: '주간 계획',     desc: '큰 흐름 잡기',      prompt: '이번 주 큰 흐름 잡아줘. 어느 요일에 뭘 몰아주면 좋을지.', tint: 'blue',    visibleOn: ['week'] },
  { id: 'week-balance',   icon: Activity,     label: '워라밸 점검',   desc: '몰린 날 분산',      prompt: '이번 주 일정이 특정 요일에 너무 몰려있는지 봐줘. 분산 제안 있으면 알려줘.', tint: 'violet',  visibleOn: ['week'] },
  { id: 'week-gaps',      icon: Search,       label: '여유 시간',     desc: '큰 빈 구간 찾기',   prompt: '이번 주 비어있는 큰 시간대 있어? 새 일정 넣을 만한 자리 추천해줘.', tint: 'amber',   visibleOn: ['week'] },

  // ── month ──
  { id: 'month-pattern',  icon: BarChart3,    label: '이번 달 패턴',  desc: '흐름 + 개선점',     prompt: '이번 달 어떤 패턴이 보여? 좋은 흐름·고쳐야 할 흐름 각 1개씩.', tint: 'blue',    visibleOn: ['month'] },
  { id: 'month-busy',     icon: Activity,     label: '바쁜 주 찾기',  desc: '몰린 주차',         prompt: '이번 달에서 가장 바쁜 주가 어느 주야? 분산 제안 있으면 알려줘.', tint: 'rose',    visibleOn: ['month'] },

  // ── year ──
  { id: 'year-overview',  icon: Trophy,       label: '올해 흐름',     desc: '회고 + 남은 기간',  prompt: '올해 어떤 흐름이 보여? 회고 + 남은 기간 한 가지 제안.', tint: 'amber',   visibleOn: ['year'] },

  // ── habits ──
  { id: 'habits-coach',   icon: Sparkles,     label: '습관 코칭',     desc: '잘 안 되는 거',     prompt: '내 습관 중 잘 안 되는 거 있어? 다음 주에 어떻게 접근하면 좋을까.', tint: 'violet',  visibleOn: ['habits'] },
  { id: 'habits-streak',  icon: Trophy,       label: '연속 기록',     desc: 'streak 분석',       prompt: '내 습관 streak 어때? 가장 잘 유지되는 거랑 끊긴 거 짚어줘.', tint: 'emerald', visibleOn: ['habits'] },

  // ── goals ──
  { id: 'goals-status',   icon: Trophy,       label: '목표 점검',     desc: '진척 상태',         prompt: '내 목표들 진척이 어때? 가장 신경 써야 할 거 1-2개만 짚어줘.', tint: 'amber',   visibleOn: ['goals'] },
  { id: 'goals-next',     icon: ClipboardList, label: '다음 행동',    desc: '이번 주 할 일',     prompt: '목표 진척을 위해 이번 주에 할 만한 작은 행동 3개만 추천해줘.', tint: 'blue',    visibleOn: ['goals'] },
];

const TINT_DOT: Record<NonNullable<QuickActionItem['tint']>, string> = {
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-500',
  rose:    'bg-rose-500',
};

interface AIQuickActionsProps {
  view: PlannerView;
  onPick: (prompt: string) => void;
  disabled?: boolean;
  /** true = 칩 모드 (메시지 영역 하단). 기본은 카드 그리드. */
  compact?: boolean;
}

export const AIQuickActions = ({ view, onPick, disabled, compact = false }: AIQuickActionsProps) => {
  const actions = ALL_ACTIONS.filter((a) => !a.visibleOn || a.visibleOn.includes(view));
  if (actions.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.prompt)}
            disabled={disabled}
            className="inline-flex items-center h-7 px-2.5 rounded-full border hairline bg-card text-[12px] text-foreground/85 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {a.label}
          </button>
        ))}
      </div>
    );
  }

  // 카드 그리드 (빈 상태 — 메시지 0개일 때).
  return (
    <div className="w-full max-w-[320px] grid grid-cols-2 gap-1.5">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.prompt)}
            disabled={disabled}
            className={cn(
              'group relative flex flex-col items-start text-left gap-1 px-2.5 py-2.5 rounded-xl',
              'border hairline bg-card hover:bg-accent/40 hover:border-foreground/15',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-150',
            )}
          >
            <div className="flex items-center gap-1.5 w-full">
              <Icon className="h-3.5 w-3.5 text-foreground/70 shrink-0" strokeWidth={1.75} />
              {a.tint && (
                <span className={cn('h-1 w-1 rounded-full shrink-0 opacity-60', TINT_DOT[a.tint])} aria-hidden />
              )}
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="text-[12px] font-semibold text-foreground leading-tight">{a.label}</div>
            {a.desc && (
              <div className="text-[10.5px] text-muted-foreground leading-tight">{a.desc}</div>
            )}
          </button>
        );
      })}
    </div>
  );
};

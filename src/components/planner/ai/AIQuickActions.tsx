/**
 * 빠른 액션 — view 별 사전 정의 프롬프트 카드 그리드.
 *
 * 정책: 매일 쓸만한 "실제 가치" 있는 액션만. demo 같은 ('예: 3시 회의' 류) 최소화.
 * 형태: 2-컬럼 카드 그리드 (icon + title + sub).
 * compact=true 면 칩 모드 (메시지 영역 하단).
 */
import {
  AlertTriangle, Zap, Inbox, RotateCcw, Coffee, ListPlus,
  Scale, ListChecks, Repeat, CalendarRange,
  PieChart, Activity, Sparkles,
  ShieldAlert, TrendingUp, Clock,
  Target, Flame, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIQuickAction } from '@/types/plannerAI';
import type { PlannerView } from '@/components/planner/ViewToggle';

interface QuickActionItem extends AIQuickAction {
  icon: LucideIcon;
  desc?: string;
  tint?: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose';
  /** 강조 표시 — 가장 자주 쓰일 핵심 액션. */
  primary?: boolean;
}

const ALL_ACTIONS: QuickActionItem[] = [
  // ── DAY (6개) — 즉시성·구체성 높은 것 위주 ──
  {
    id: 'day-now',
    icon: Zap,
    label: '지금 뭐 할까?',
    desc: '다음 1-2시간 추천',
    prompt: '지금 시각 기준으로, 다음 1-2시간 동안 뭘 하면 좋을지 추천해줘. 일정·할 일·우선순위 종합해서.',
    tint: 'amber',
    primary: true,
    visibleOn: ['day'],
  },
  {
    id: 'day-risk',
    icon: AlertTriangle,
    label: '위험 신호 점검',
    desc: '충돌·과부하·마감',
    prompt: '오늘 일정에 충돌이나 빡빡한 구간 있어? 마감 임박한 할 일도 있으면 같이 알려줘.',
    tint: 'rose',
    primary: true,
    visibleOn: ['day'],
  },
  {
    id: 'day-fill',
    icon: ListPlus,
    label: '빈 시간 채우기',
    desc: '인박스 할 일 배치',
    prompt: '오늘 비어있는 시간대에 대기 중인 할 일 중 적절한 거 배치 제안해줘. 우선순위·길이 고려해서.',
    tint: 'blue',
    visibleOn: ['day'],
  },
  {
    id: 'day-overdue',
    icon: RotateCcw,
    label: '어제 미완료',
    desc: '오늘로 옮길 것',
    prompt: '어제 못 끝낸 할 일 있어? 오늘 할 만한 거 추려서 알려줘.',
    tint: 'violet',
    visibleOn: ['day'],
  },
  {
    id: 'day-rest',
    icon: Coffee,
    label: '쉴 타이밍',
    desc: '휴식·여유 점검',
    prompt: '오늘 일정 보고 충분히 쉬는 구간이 있는지 봐줘. 부족하면 휴식 슬롯 추천.',
    tint: 'emerald',
    visibleOn: ['day'],
  },
  {
    id: 'day-bulk',
    icon: ListChecks,
    label: '일괄 추가',
    desc: '여러 일정 한 번에',
    prompt: '오늘 추가할 일정·할 일을 자연어로 적을게. 카드로 정리해줘. (예: "9시 운동 1시간, 11시 회의, 점심 후 코딩 2시간")',
    tint: 'blue',
    visibleOn: ['day'],
  },

  // ── WEEK (5개) ──
  {
    id: 'week-balance',
    icon: Scale,
    label: '요일 분배',
    desc: '몰린 요일 + 분산',
    prompt: '이번 주 일정이 어느 요일에 몰려있는지 봐줘. 분산 가능한 항목 있으면 옮길 곳 제안.',
    tint: 'blue',
    primary: true,
    visibleOn: ['week'],
  },
  {
    id: 'week-cleanup',
    icon: ShieldAlert,
    label: '미완료 위험',
    desc: '못 끝낼 가능성',
    prompt: '이번 주 안에 못 끝낼 가능성이 큰 할 일 있어? 우선순위 재조정 제안해줘.',
    tint: 'rose',
    visibleOn: ['week'],
  },
  {
    id: 'week-recurring',
    icon: Repeat,
    label: '반복 점검',
    desc: '여전히 의미 있나',
    prompt: '이번 주 반복 일정 중 최근에 잘 안 지켜졌거나 의미 흐려진 거 있는지 봐줘.',
    tint: 'amber',
    visibleOn: ['week'],
  },
  {
    id: 'week-next',
    icon: CalendarRange,
    label: '다음 주 미리',
    desc: '준비할 것',
    prompt: '다음 주에 미리 봐야 할 큰 일정·마감 있어? 이번 주에 준비해둘 거 추천.',
    tint: 'violet',
    visibleOn: ['week'],
  },
  {
    id: 'week-review',
    icon: TrendingUp,
    label: '주간 회고',
    desc: '잘된·아쉬운',
    prompt: '이번 주 어땠어? 잘된 거 1개, 아쉬운 거 1개, 다음 주 한 가지 제안. 짧게.',
    tint: 'emerald',
    visibleOn: ['week'],
  },

  // ── MONTH (4개) ──
  {
    id: 'month-domains',
    icon: PieChart,
    label: '영역별 시간',
    desc: '일·운동·휴식 비율',
    prompt: '이번 달 어떤 영역(일/운동/공부/사적/휴식 등)에 시간을 많이 썼어? 비율 짚어주고 균형 평가.',
    tint: 'blue',
    primary: true,
    visibleOn: ['month'],
  },
  {
    id: 'month-busy',
    icon: Activity,
    label: '바쁜 주차',
    desc: '몰림 분석',
    prompt: '이번 달에서 가장 바쁜 주가 어느 주야? 다음 달에 분산할 만한 패턴 있으면 알려줘.',
    tint: 'amber',
    visibleOn: ['month'],
  },
  {
    id: 'month-pattern',
    icon: Sparkles,
    label: '숨은 패턴',
    desc: '발견한 흐름',
    prompt: '이번 달 데이터에서 평소엔 못 봤던 흥미로운 패턴 1-2개 찾아줘.',
    tint: 'violet',
    visibleOn: ['month'],
  },
  {
    id: 'month-missing',
    icon: ShieldAlert,
    label: '빠진 영역',
    desc: '소홀한 부분',
    prompt: '이번 달에 비교적 소홀했던 영역(예: 운동·휴식·관계 등) 있어? 다음 달에 챙길 거 추천.',
    tint: 'rose',
    visibleOn: ['month'],
  },

  // ── YEAR (3개) ──
  {
    id: 'year-quarter',
    icon: PieChart,
    label: '분기 흐름',
    desc: '4분기 비교',
    prompt: '올해 분기별로 어떻게 달랐어? 활동량·테마 변화 짧게.',
    tint: 'blue',
    visibleOn: ['year'],
  },
  {
    id: 'year-review',
    icon: TrendingUp,
    label: '올해 회고',
    desc: '큰 흐름',
    prompt: '올해 한 해 큰 흐름 요약해줘. 잘한 1개·아쉬운 1개·남은 기간 한 가지 제안.',
    tint: 'emerald',
    primary: true,
    visibleOn: ['year'],
  },
  {
    id: 'year-pace',
    icon: Activity,
    label: '페이스 점검',
    desc: '남은 기간 속도',
    prompt: '올해 페이스 어때? 지금 속도면 연말까지 어떤 그림인지 짚어줘.',
    tint: 'amber',
    visibleOn: ['year'],
  },

  // ── HABITS (3개) ──
  {
    id: 'habits-risk',
    icon: Flame,
    label: 'streak 위험',
    desc: '끊길 위기',
    prompt: '오늘·내일 안 하면 streak 끊길 위험 있는 습관 있어? 우선순위로 알려줘.',
    tint: 'rose',
    primary: true,
    visibleOn: ['habits'],
  },
  {
    id: 'habits-slot',
    icon: Clock,
    label: '오늘 어디 끼울까',
    desc: '시간 슬롯 제안',
    prompt: '오늘 안 한 습관들 빈 시간에 어디 끼울 수 있어? 시간대 추천해줘.',
    tint: 'blue',
    visibleOn: ['habits'],
  },
  {
    id: 'habits-best',
    icon: TrendingUp,
    label: '잘 되는 습관',
    desc: '강한 루틴 발견',
    prompt: '내 습관 중 가장 안정적으로 잘 되는 거 1-2개 짚어주고, 약한 습관에 응용할 만한 패턴 있으면 알려줘.',
    tint: 'emerald',
    visibleOn: ['habits'],
  },

  // ── GOALS (3개) ──
  {
    id: 'goals-stalled',
    icon: ShieldAlert,
    label: '정체된 목표',
    desc: '진척 없음',
    prompt: '최근에 진척이 거의 없는 목표 있어? 이유 추측이랑 다음 작은 행동 1개 제안.',
    tint: 'rose',
    primary: true,
    visibleOn: ['goals'],
  },
  {
    id: 'goals-time',
    icon: PieChart,
    label: '목표별 시간',
    desc: '이번 주 투입',
    prompt: '이번 주 각 목표에 시간 얼마나 투입했어? 균형 평가.',
    tint: 'blue',
    visibleOn: ['goals'],
  },
  {
    id: 'goals-next',
    icon: Target,
    label: '이번 주 행동',
    desc: '작은 다음 단계',
    prompt: '목표 진척을 위해 이번 주에 할 만한 작은 행동 3개만 추천해줘.',
    tint: 'violet',
    visibleOn: ['goals'],
  },
];

const TINT_DOT: Record<NonNullable<QuickActionItem['tint']>, string> = {
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-500',
  rose:    'bg-rose-500',
};

const TINT_RING: Record<NonNullable<QuickActionItem['tint']>, string> = {
  blue:    'group-hover:ring-blue-400/30',
  amber:   'group-hover:ring-amber-400/30',
  emerald: 'group-hover:ring-emerald-400/30',
  violet:  'group-hover:ring-violet-400/30',
  rose:    'group-hover:ring-rose-400/30',
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

  // 카드 그리드 (빈 상태).
  return (
    <div className="w-full max-w-[320px] grid grid-cols-2 gap-1.5">
      {actions.map((a) => {
        const Icon = a.icon;
        const tint = a.tint ?? 'blue';
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.prompt)}
            disabled={disabled}
            className={cn(
              'group relative flex flex-col items-start text-left gap-1 px-2.5 py-2.5 rounded-xl',
              'border hairline bg-card hover:bg-accent/40 hover:border-foreground/15',
              'ring-0 ring-inset hover:ring-1',
              TINT_RING[tint],
              a.primary && 'border-foreground/15 bg-accent/20',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-150',
            )}
          >
            <div className="flex items-center gap-1.5 w-full">
              <Icon className={cn(
                'h-3.5 w-3.5 shrink-0',
                a.primary ? 'text-foreground/85' : 'text-foreground/65',
              )} strokeWidth={1.75} />
              <span className={cn('h-1 w-1 rounded-full shrink-0', TINT_DOT[tint], a.primary ? 'opacity-90' : 'opacity-55')} aria-hidden />
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className={cn(
              'text-[12px] leading-tight',
              a.primary ? 'font-bold text-foreground' : 'font-semibold text-foreground',
            )}>
              {a.label}
            </div>
            {a.desc && (
              <div className="text-[10.5px] text-muted-foreground leading-tight">{a.desc}</div>
            )}
          </button>
        );
      })}
    </div>
  );
};

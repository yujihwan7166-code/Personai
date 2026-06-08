/**
 * 빠른 액션 — view 별 사전 정의 프롬프트 카드 그리드.
 *
 * 정책: 매일 쓸만한 "실제 가치" 있는 액션만. demo 같은 ('예: 3시 회의' 류) 최소화.
 * 형태: 2-컬럼 카드 그리드 (icon + title + sub).
 * compact=true 면 칩 모드 (메시지 영역 하단).
 */
import {
  AlertTriangle, Zap, RotateCcw, Coffee, ListPlus,
  Scale, ListChecks, Repeat, CalendarRange,
  PieChart, Activity, Sparkles,
  ShieldAlert, TrendingUp, Clock, ArrowRight,
  Flame, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PAGE_AI_TONE_DOT,
  PAGE_AI_TONE_ICON,
  type PageAiTone,
} from '@/components/PageAiTokens';
import { PageAiPromptSet } from '@/components/PageAiScaffold';
import type { AIQuickAction } from '@/types/plannerAI';
import type { PlannerView } from '@/components/planner/ViewToggle';

interface QuickActionItem extends AIQuickAction {
  icon: LucideIcon;
  desc?: string;
  tint?: PageAiTone;
  /** 강조 표시 — 가장 자주 쓰일 핵심 액션. */
  primary?: boolean;
}

const ALL_ACTIONS: QuickActionItem[] = [
  // ── DAY (6개) — 즉시성·구체성 높은 것 위주 ──
  {
    id: 'day-now',
    icon: Zap,
    label: '다음 행동 정하기',
    desc: '지금부터 1-2시간 안에 할 일 하나를 고릅니다',
    prompt: '지금 시각 기준으로 다음 1-2시간 동안 가장 먼저 할 일을 골라줘. 일정 충돌, 할 일 우선순위, 걸리는 시간, 에너지 부담을 같이 보고 이유를 짧게 설명해줘.',
    tint: 'amber',
    primary: true,
    visibleOn: ['day'],
  },
  {
    id: 'day-risk',
    icon: AlertTriangle,
    label: '오늘 막힐 곳 찾기',
    desc: '충돌, 과부하, 마감 임박 항목을 먼저 확인합니다',
    prompt: '오늘 일정과 할 일에서 막힐 가능성이 큰 지점을 찾아줘. 일정 충돌, 너무 붙어 있는 구간, 마감 임박, 우선순위가 높은데 시간이 없는 항목을 나눠서 알려줘.',
    tint: 'rose',
    primary: true,
    visibleOn: ['day'],
  },
  {
    id: 'day-fill',
    icon: ListPlus,
    label: '빈 시간에 배치',
    desc: '남는 시간에 넣을 만한 할 일을 추천합니다',
    prompt: '오늘 비어 있는 시간대에 넣을 만한 할 일을 추천해줘. 각 추천은 시간대, 예상 길이, 왜 그 시간에 맞는지, 부담이 크면 쪼개는 방법까지 함께 알려줘.',
    tint: 'blue',
    visibleOn: ['day'],
  },
  {
    id: 'day-overdue',
    icon: RotateCcw,
    label: '미룬 일 회수',
    desc: '어제나 이전에 남은 일을 오늘 기준으로 재정리합니다',
    prompt: '이전 날짜에서 끝내지 못한 할 일 중 오늘로 가져올 만한 것을 골라줘. 그대로 가져올 것, 쪼갤 것, 버려도 되는 것을 구분해서 짧게 제안해줘.',
    tint: 'violet',
    visibleOn: ['day'],
  },
  {
    id: 'day-rest',
    icon: Coffee,
    label: '회복 시간 확인',
    desc: '너무 빡빡한 하루인지 보고 쉴 구간을 잡습니다',
    prompt: '오늘 일정이 너무 빡빡한지 확인해줘. 쉬는 구간이 부족하면 현실적으로 넣을 수 있는 휴식 슬롯과 줄이면 좋은 항목을 제안해줘.',
    tint: 'emerald',
    visibleOn: ['day'],
  },
  {
    id: 'day-bulk',
    icon: ListChecks,
    label: '여러 일 정리',
    desc: '말로 적은 일들을 일정/할 일 후보로 나눕니다',
    prompt: '내가 자연어로 적은 여러 일정과 할 일을 정리해줘. 시간 있는 것은 일정으로, 시간 없는 것은 할 일로 나누고, 애매한 항목은 확인 질문으로 남겨줘.',
    tint: 'blue',
    visibleOn: ['day'],
  },

  // ── WEEK (5개) ──
  {
    id: 'week-balance',
    icon: Scale,
    label: '몰린 날 분산',
    desc: '이번 주에 과하게 몰린 요일을 찾아 옮길 후보를 냅니다',
    prompt: '이번 주 일정과 할 일이 어느 요일에 몰려 있는지 보고, 옮기면 좋은 항목과 옮길 날짜 후보를 제안해줘. 시간이 있는 일정은 같은 시간을 유지할 수 있는지도 봐줘.',
    tint: 'blue',
    primary: true,
    visibleOn: ['week'],
  },
  {
    id: 'week-cleanup',
    icon: ShieldAlert,
    label: '이번 주 위험 작업',
    desc: '못 끝낼 가능성이 큰 할 일을 먼저 드러냅니다',
    prompt: '이번 주 안에 못 끝낼 가능성이 큰 할 일을 찾아줘. 왜 위험한지, 줄일지 미룰지 먼저 할지 판단해서 우선순위 재조정안을 줘.',
    tint: 'rose',
    visibleOn: ['week'],
  },
  {
    id: 'week-recurring',
    icon: Repeat,
    label: '반복 일정 정리',
    desc: '반복 일정이 아직 필요한지 점검합니다',
    prompt: '이번 주 반복 일정이나 반복되는 할 일 중 유지할 것, 줄일 것, 시간대를 바꿀 것을 찾아줘. 최근 흐름 기준으로 판단해줘.',
    tint: 'amber',
    visibleOn: ['week'],
  },
  {
    id: 'week-next',
    icon: CalendarRange,
    label: '다음 주 대비',
    desc: '다음 주 큰 일정 전에 이번 주 준비할 일을 찾습니다',
    prompt: '다음 주에 부담이 될 일정이나 마감이 있는지 보고, 이번 주에 미리 준비해두면 좋은 일을 2-3개 제안해줘.',
    tint: 'violet',
    visibleOn: ['week'],
  },
  {
    id: 'week-review',
    icon: TrendingUp,
    label: '주간 회고 초안',
    desc: '잘된 점, 아쉬운 점, 다음 주 조정안을 만듭니다',
    prompt: '이번 주 일정과 할 일을 바탕으로 주간 회고 초안을 써줘. 잘된 점 1개, 아쉬운 점 1개, 다음 주 조정안 1개로 짧게 정리해줘.',
    tint: 'emerald',
    visibleOn: ['week'],
  },

  // ── MONTH (4개) ──
  {
    id: 'month-domains',
    icon: PieChart,
    label: '월간 시간 비율',
    desc: '일, 공부, 운동, 휴식이 어디에 쏠렸는지 봅니다',
    prompt: '이번 달 일정과 할 일을 보고 시간과 관심이 어떤 영역에 쏠렸는지 분석해줘. 일/공부/운동/관계/휴식처럼 나누고, 균형이 무너진 부분을 짧게 짚어줘.',
    tint: 'blue',
    primary: true,
    visibleOn: ['month'],
  },
  {
    id: 'month-busy',
    icon: Activity,
    label: '바쁜 주차 찾기',
    desc: '월 안에서 몰린 주와 한가한 주를 비교합니다',
    prompt: '이번 달에서 가장 바쁜 주차와 가장 여유로운 주차를 찾아줘. 다음 달에 반복되면 부담이 될 패턴과 분산 방법도 제안해줘.',
    tint: 'amber',
    visibleOn: ['month'],
  },
  {
    id: 'month-pattern',
    icon: Sparkles,
    label: '반복 패턴 발견',
    desc: '자주 반복되는 시간대나 업무 흐름을 찾습니다',
    prompt: '이번 달 데이터에서 반복되는 패턴을 찾아줘. 자주 바쁜 요일, 비슷한 시간대, 미루는 항목 유형, 회복 시간이 부족한 구간처럼 실제로 조정할 수 있는 관찰을 2개만 알려줘.',
    tint: 'violet',
    visibleOn: ['month'],
  },
  {
    id: 'month-missing',
    icon: ShieldAlert,
    label: '소홀한 영역 찾기',
    desc: '이번 달 거의 챙기지 못한 영역을 드러냅니다',
    prompt: '이번 달에 거의 챙기지 못한 영역이 있는지 찾아줘. 운동, 휴식, 관계, 공부, 정리처럼 빠진 부분을 보고 다음 달에 넣을 작은 행동을 제안해줘.',
    tint: 'rose',
    visibleOn: ['month'],
  },

  // ── YEAR (3개) ──
  {
    id: 'year-quarter',
    icon: PieChart,
    label: '분기별 변화 보기',
    desc: '올해가 어떤 흐름으로 바뀌었는지 비교합니다',
    prompt: '올해를 분기별로 나눠서 흐름을 비교해줘. 활동량, 반복된 주제, 바쁜 시기, 비어 있던 시기를 짧게 정리하고 눈에 띄는 변화 2개를 알려줘.',
    tint: 'blue',
    visibleOn: ['year'],
  },
  {
    id: 'year-review',
    icon: TrendingUp,
    label: '올해 회고 초안',
    desc: '잘한 것, 아쉬운 것, 남은 기간 조정안을 만듭니다',
    prompt: '올해 일정과 할 일을 바탕으로 회고 초안을 만들어줘. 잘한 것 2개, 아쉬운 것 1개, 남은 기간 조정안 1개로 간결하게 정리해줘.',
    tint: 'emerald',
    primary: true,
    visibleOn: ['year'],
  },
  {
    id: 'year-pace',
    icon: Activity,
    label: '남은 기간 페이스',
    desc: '지금 속도로 연말까지 무리가 없는지 봅니다',
    prompt: '올해 현재 페이스를 보고 남은 기간에 과부하가 생길지 점검해줘. 유지할 것, 줄일 것, 앞당겨야 할 것을 나눠서 제안해줘.',
    tint: 'amber',
    visibleOn: ['year'],
  },

  // ── HABITS (3개) ──
  {
    id: 'habits-risk',
    icon: Flame,
    label: '오늘 끊길 습관',
    desc: '지금 챙기지 않으면 흐름이 끊기는 습관을 찾습니다',
    prompt: '오늘이나 내일 안 하면 흐름이 끊길 위험이 있는 습관을 찾아줘. 가장 먼저 챙길 것부터 우선순위로 알려줘.',
    tint: 'rose',
    primary: true,
    visibleOn: ['habits'],
  },
  {
    id: 'habits-slot',
    icon: Clock,
    label: '빈 시간에 끼우기',
    desc: '오늘 남은 시간에 습관을 넣을 자리를 찾습니다',
    prompt: '오늘 아직 안 한 습관을 남은 빈 시간에 어디 넣을 수 있는지 추천해줘. 부담이 적은 순서와 예상 소요시간도 함께 알려줘.',
    tint: 'blue',
    visibleOn: ['habits'],
  },
  {
    id: 'habits-best',
    icon: TrendingUp,
    label: '잘 되는 패턴 복제',
    desc: '성공한 습관의 조건을 약한 습관에 옮깁니다',
    prompt: '내 습관 중 안정적으로 잘 되는 것의 공통점을 찾아줘. 그 패턴을 잘 안 되는 습관에 어떻게 적용할지 작게 제안해줘.',
    tint: 'emerald',
    visibleOn: ['habits'],
  },

];

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

  const primaryActions = actions.slice(0, 4);
  const secondaryActions = actions.slice(4);

  // 빈 상태에서는 메모/위키 AI와 같은 세로 리듬을 유지한다.
  return (
    <PageAiPromptSet label="플래너 추천 요청" className="gap-2">
      {primaryActions.map((a) => {
        const Icon = a.icon;
        const tint = a.tint ?? 'blue';
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.prompt)}
            disabled={disabled}
            title={`${a.label} - ${a.desc ?? ''}`}
            aria-label={`${a.label}${a.desc ? ` - ${a.desc}` : ''}`}
            data-page-ai-quick-action
            className={cn(
              'group grid w-full grid-cols-[28px_minmax(0,1fr)_16px] items-center gap-2 rounded-[12px] border bg-card px-2.5 py-2 text-left shadow-[0_1px_0_hsl(0_0%_100%/0.6)_inset]',
              'border-foreground/10 hover:border-foreground/18 hover:bg-accent/35 hover:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40',
              a.primary && 'border-primary/25 bg-primary/[0.035]',
            )}
          >
            <span className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[9px]',
              PAGE_AI_TONE_ICON[tint],
            )}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold leading-4 text-foreground">
                  {a.label}
                </span>
                {a.primary && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-bold leading-none text-primary">
                    추천
                  </span>
                )}
              </span>
              {a.desc && (
                <span className="mt-0.5 block truncate text-[11.5px] font-medium leading-4 text-muted-foreground">
                  {a.desc}
                </span>
              )}
            </span>
            <span className="flex items-center justify-end gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full opacity-75', PAGE_AI_TONE_DOT[tint])} aria-hidden />
              <ArrowRight className="h-3 w-3 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/65" />
            </span>
          </button>
        );
      })}
      {secondaryActions.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-1.5 px-0.5">
          {secondaryActions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.prompt)}
              disabled={disabled}
              className="inline-flex h-7 items-center rounded-full border border-foreground/10 bg-card px-2.5 text-[11.5px] font-semibold text-foreground/75 transition-colors hover:border-foreground/20 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </PageAiPromptSet>
  );
};

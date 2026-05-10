/**
 * 빠른 액션 — view 별 사전 정의 프롬프트 칩.
 *
 * 클릭 시 입력창 거치지 않고 바로 send.
 */
import type { AIQuickAction } from '@/types/plannerAI';
import type { PlannerView } from '@/components/planner/ViewToggle';

const ALL_ACTIONS: AIQuickAction[] = [
  { id: 'today-priority', label: '오늘 뭐 먼저 해?', prompt: '오늘 뭐 먼저 하면 좋을까? 우선순위 추천해줘.', visibleOn: ['day'] },
  { id: 'today-summary',  label: '오늘 정리',        prompt: '오늘 일정 시간순으로 정리해주고 충돌이나 빡빡한 구간 있으면 알려줘.', visibleOn: ['day'] },
  { id: 'today-gaps',     label: '빈 시간 찾기',     prompt: '오늘 비어있는 시간대 어디 있어? 시간 구간으로 알려줘.', visibleOn: ['day'] },
  { id: 'week-review',    label: '이번 주 회고',     prompt: '이번 주 어땠어? 잘한 점·아쉬운 점 짧게 짚고 다음 주에 한 가지 제안해줘.', visibleOn: ['week'] },
  { id: 'week-plan',      label: '주간 계획 짜기',   prompt: '이번 주 큰 흐름 잡아줘. 어느 요일에 뭘 몰아주면 좋을지.', visibleOn: ['week'] },
  { id: 'month-pattern',  label: '이번 달 패턴',     prompt: '이번 달 어떤 패턴이 보여? 좋은 흐름·고쳐야 할 흐름 각 1개씩.', visibleOn: ['month'] },
  { id: 'habits-coach',   label: '습관 코칭',        prompt: '내 습관 중 잘 안 되는 거 있어? 다음 주에 어떻게 접근하면 좋을까.', visibleOn: ['habits'] },
];

interface AIQuickActionsProps {
  view: PlannerView;
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export const AIQuickActions = ({ view, onPick, disabled }: AIQuickActionsProps) => {
  const actions = ALL_ACTIONS.filter((a) => !a.visibleOn || a.visibleOn.includes(view));
  if (actions.length === 0) return null;

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
};

/**
 * AI 가 제안한 액션 카드 — 메시지 안에 인라인.
 *
 * 상태:
 * - pending: [확인] [취소] 버튼
 * - applied: 회색 + ✓ 추가됨 + [되돌리기]
 * - canceled: 회색 + 취소됨
 */
import { Calendar, CheckSquare, Inbox as InboxIcon, Check, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIActionInstance } from '@/types/plannerAI';

const ICONS = {
  add_event: Calendar,
  add_scheduled_task: CheckSquare,
  add_inbox_task: InboxIcon,
} as const;

const TYPE_LABELS = {
  add_event: '일정 추가',
  add_scheduled_task: '시간 잡힌 할 일 추가',
  add_inbox_task: '할 일 추가',
} as const;

const fmtRange = (startIso: string, endIso: string): string => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const date = s.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  const sh = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
  const eh = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
  return `${date} ${sh}~${eh}`;
};

const fmtPlannedFor = (plannedFor?: string): string | null => {
  if (!plannedFor) return null;
  const d = new Date(`${plannedFor}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
};

interface AIActionCardProps {
  instance: AIActionInstance;
  onApply: () => void;
  onCancel: () => void;
  onUndo: () => void;
}

export const AIActionCard = ({ instance, onApply, onCancel, onUndo }: AIActionCardProps) => {
  const { action, status } = instance;
  const Icon = ICONS[action.type];
  const typeLabel = TYPE_LABELS[action.type];

  const meta = action.type === 'add_inbox_task'
    ? fmtPlannedFor(action.plannedFor) ?? '시간 미배정'
    : fmtRange(action.startAt, action.endAt);

  return (
    <div className={cn(
      'mt-2 rounded-xl border hairline px-3 py-2.5 text-[12.5px]',
      status === 'pending' && 'bg-card',
      status === 'applied' && 'bg-emerald-50/60 border-emerald-200/60',
      status === 'canceled' && 'bg-muted/40 opacity-60',
    )}>
      <div className="flex items-start gap-2">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {typeLabel}
          </div>
          <div className="text-[13px] font-semibold text-foreground truncate mt-0.5">
            {action.title}
          </div>
          <div className="text-[11.5px] text-muted-foreground tabular-nums mt-0.5">
            {meta}
            {action.type !== 'add_event' && 'priority' in action && action.priority ? ` · 우선순위 ${action.priority}` : ''}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      {status === 'pending' && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
            추가
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border hairline text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3 w-3" />
            취소
          </button>
        </div>
      )}
      {status === 'applied' && (
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            추가됨
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            되돌리기
          </button>
        </div>
      )}
      {status === 'canceled' && (
        <div className="mt-2 text-[11.5px] text-muted-foreground">취소됨</div>
      )}
    </div>
  );
};

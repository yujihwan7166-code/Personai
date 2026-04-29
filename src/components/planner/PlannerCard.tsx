/**
 * 한 항목(Event 또는 Task) 표시 — variant 2종.
 *
 * - inbox: 시간 미배정 할일 (체크박스 + 깃발 + 제목 + 노트dot + 핀 + 삭제)
 * - block: 시간표 위 시간 블록 (시간칩 + 제목 + 우선순위 dot)
 *
 * TickTick 패턴:
 * - 깃발 = priority 1~3 시각화
 * - 핀 = 인박스 상단 고정 토글
 * - 노트 점(FileText) = note 있음 표시
 */
import { Check, X, Flag, Pin, FileText, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Priority } from '@/types/planner';
import { PRIORITY_COLORS } from '@/types/planner';

interface InboxCardProps {
  variant: 'inbox';
  title: string;
  done: boolean;
  onToggle: () => void;
  onClick?: () => void;
  /** hover 시 우측에 삭제 X 아이콘 노출. */
  onDelete?: () => void;
  /** 핀 토글 — 있으면 우측에 핀 아이콘 노출. */
  onTogglePin?: () => void;
  priority?: Priority;
  pinned?: boolean;
  hasNote?: boolean;
  /** 취소됨 (Things3 Cancel) — done 과 시각 구분. */
  canceled?: boolean;
}

interface BlockCardProps {
  variant: 'block';
  title: string;
  /** "14:00" 형식. */
  startLabel: string;
  /** Event 면 색 띠, Task 면 회색. */
  kind: 'event' | 'task';
  done?: boolean;
  color?: string;
  onClick?: () => void;
  priority?: Priority;
  hasNote?: boolean;
  canceled?: boolean;
}

type PlannerCardProps = InboxCardProps | BlockCardProps;

export const PlannerCard = (props: PlannerCardProps) => {
  if (props.variant === 'inbox') {
    const { title, done, onToggle, onClick, onDelete, onTogglePin, priority, pinned, hasNote, canceled } = props;
    const showFlag = (priority ?? 0) > 0;
    const dim = done || canceled;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${title}${done ? ' (완료됨)' : ''}${canceled ? ' (취소됨)' : ''}${pinned ? ' (고정됨)' : ''} — 클릭해서 시간 배정`}
        className={cn(
          'group flex items-center gap-2.5 px-2 py-1.5 rounded-md',
          'hover:bg-accent cursor-pointer transition-colors',
          'focus:outline-none focus:bg-accent',
          canceled && 'opacity-60',
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {canceled ? (
          <span
            className="flex h-[14px] w-[14px] items-center justify-center rounded-[3px] shrink-0 text-muted-foreground"
            aria-label="취소됨"
          >
            <Ban className="h-3 w-3" strokeWidth={2.5} />
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              'flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border transition-all shrink-0',
              done
                ? 'bg-foreground border-foreground text-background'
                : 'border-[hsl(var(--hairline))] hover:border-foreground/50 hover:scale-110',
            )}
            aria-label={done ? '완료 취소' : '완료'}
          >
            {done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
          </button>
        )}
        {showFlag && (
          <Flag
            className="h-3 w-3 shrink-0"
            style={{ color: PRIORITY_COLORS[priority as Priority], fill: PRIORITY_COLORS[priority as Priority] }}
            aria-hidden
          />
        )}
        <span
          className={cn(
            'text-[13.5px] leading-tight truncate flex-1 text-foreground',
            dim && 'line-through text-muted-foreground',
          )}
        >
          {title}
        </span>
        {hasNote && (
          <FileText className="h-3 w-3 text-muted-foreground/70 shrink-0" aria-label="노트 있음" />
        )}
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            aria-label={pinned ? '고정 해제' : '고정'}
            title={pinned ? '고정 해제' : '고정'}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded shrink-0 transition-all',
              pinned
                ? 'opacity-100 text-foreground'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Pin className={cn('h-3 w-3', pinned && 'fill-current')} strokeWidth={2.2} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="삭제"
            title="삭제"
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded shrink-0',
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
              'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all',
            )}
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  }

  // variant === 'block'
  const { title, startLabel, kind, done, color, onClick, priority, hasNote, canceled } = props;
  const stripeColor = color ?? (kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(var(--muted-foreground) / 0.6)');
  const showFlag = (priority ?? 0) > 0;
  const dim = done || canceled;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${kind === 'event' ? '일정' : '할 일'} ${startLabel} ${title}${done ? ' (완료됨)' : ''}${canceled ? ' (취소됨)' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group flex items-stretch gap-2.5 pr-2.5 py-2 rounded-lg cursor-pointer overflow-hidden',
        'border border-[hsl(var(--hairline))] bg-card',
        'hover:border-foreground/20 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.1)] transition-all',
        'focus:outline-none focus:border-foreground/40',
        dim && 'opacity-50',
      )}
    >
      <span
        className="w-[3px] self-stretch shrink-0"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 py-px">
        <div className="flex items-center gap-1">
          <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground tracking-wide font-semibold">
            {startLabel}
          </span>
          {showFlag && (
            <Flag
              className="h-2.5 w-2.5"
              style={{ color: PRIORITY_COLORS[priority as Priority], fill: PRIORITY_COLORS[priority as Priority] }}
              aria-hidden
            />
          )}
          {hasNote && (
            <FileText className="h-2.5 w-2.5 text-muted-foreground/70" aria-label="노트 있음" />
          )}
        </div>
        <p className={cn(
          'text-[13px] leading-snug mt-0.5 truncate text-foreground font-medium',
          dim && 'line-through',
        )}>
          {title}
        </p>
      </div>
    </div>
  );
};

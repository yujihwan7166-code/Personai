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
import { Check, X, Flag, Pin, FileText, Ban, RotateCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Priority, Subtask } from '@/types/planner';
import { PRIORITY_COLORS } from '@/types/planner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SubtaskList, SubtaskProgress } from './SubtaskList';
import { StreakIndicator } from './StreakIndicator';
import { tagColor } from '@/lib/planner/tagColor';

interface MetaChip {
  label: string;
  color?: string;
}

const MetaChips = ({ items, compact }: { items?: MetaChip[]; compact?: boolean }) => {
  if (!items || items.length === 0) return null;
  const limit = compact ? 1 : 2;
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', compact ? 'mt-1' : 'mt-1.5')}>
      {items.slice(0, limit).map((item) => (
        <span
          key={item.label}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded border border-[hsl(var(--hairline))] bg-background/70 text-muted-foreground',
            compact ? 'px-1 py-0.5 text-[9.5px]' : 'px-1.5 py-0.5 text-[10px]',
          )}
          title={item.label}
        >
          {item.color && (
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
          )}
          <span className="truncate">{item.label}</span>
        </span>
      ))}
      {items.length > limit && (
        <span className="text-[10px] tabular-nums text-muted-foreground">+{items.length - limit}</span>
      )}
    </div>
  );
};

/** 태그 chip — Inbox/Block 양쪽에서 재사용. */
const TagChip = ({ tag, onClick, compact }: { tag: string; onClick?: () => void; compact?: boolean }) => {
  const { bg, text } = tagColor(tag);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'inline-flex items-center rounded font-medium leading-none shrink-0 transition-opacity hover:opacity-80',
        compact ? 'px-1 py-0.5 text-[9.5px]' : 'px-1.5 py-0.5 text-[10px]',
      )}
      style={{ backgroundColor: bg, color: text }}
      title={`#${tag}`}
    >
      #{tag}
    </button>
  );
};

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
  /** 노트 본문 — 있으면 hover 시 Tooltip 으로 미리보기 (TickTick 패턴). */
  note?: string;
  /** 취소됨 (Things3 Cancel) — done 과 시각 구분. */
  canceled?: boolean;
  /** 반복 일정/할일 — 🔁 아이콘 표시 (Apple Calendar 패턴). */
  recurring?: boolean;
  /** 서브태스크 — 있으면 진행률 + chevron 펼침 가능. */
  subtasks?: Subtask[];
  onToggleSubtask?: (subtaskId: string) => void;
  onAddSubtask?: (text: string) => void;
  onRemoveSubtask?: (subtaskId: string) => void;
  onUpdateSubtask?: (subtaskId: string, text: string) => void;
  /** 태그 — 첫 2개만 chip 으로 표시. 나머지는 +N. */
  tags?: string[];
  meta?: MetaChip[];
  onTagClick?: (tag: string) => void;
  /** Streak (반복 시리즈 연속 완료 수). 0 이면 표시 X. */
  streakCurrent?: number;
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
  /** 반복 일정/할일 — 🔁 아이콘 표시. */
  recurring?: boolean;
  /** 서브태스크 — 있으면 진행률 표시. */
  subtasks?: Subtask[];
  /** 태그 — 첫 1개만 표시 (공간 적음). */
  tags?: string[];
  /** Streak (반복 시리즈 연속 완료 수). */
  streakCurrent?: number;
}

type PlannerCardProps = (InboxCardProps | BlockCardProps) & { meta?: MetaChip[] };

/** Inbox variant — 별도 컴포넌트로 추출 (useState 가 hooks 규칙에 맞도록). */
const InboxCardInner = (props: InboxCardProps) => {
  const {
    title, done, onToggle, onClick, onDelete, onTogglePin, priority, pinned, hasNote, note, canceled, recurring,
    subtasks, onToggleSubtask, onAddSubtask, onRemoveSubtask, onUpdateSubtask,
    tags, meta, onTagClick, streakCurrent,
  } = props;
  const showFlag = (priority ?? 0) > 0;
  const dim = done || canceled;
  const noteText = note?.trim() ?? '';
  const showNoteTooltip = hasNote && noteText.length > 0;
  const hasSubtasks = subtasks && subtasks.length > 0;
  const [expanded, setExpanded] = useState(false);
  return (
      <div className="rounded-md overflow-hidden">
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
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[13.5px] leading-tight truncate text-foreground',
              dim && 'line-through text-muted-foreground',
            )}
          >
            {title}
          </span>
          <MetaChips items={meta} />
        </span>
        {tags && tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} tag={tag} onClick={() => onTagClick?.(tag)} />
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">+{tags.length - 2}</span>
            )}
          </div>
        )}
        {hasSubtasks && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? '서브태스크 접기' : '서브태스크 펼치기'}
            className="flex items-center gap-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <SubtaskProgress subtasks={subtasks!} compact />
          </button>
        )}
        {recurring && (
          <RotateCw
            className="h-3 w-3 shrink-0 text-muted-foreground/70"
            aria-label="반복"
            strokeWidth={2}
          />
        )}
        {streakCurrent !== undefined && streakCurrent > 0 && (
          <StreakIndicator current={streakCurrent} compact />
        )}
        {hasNote && (
          showNoteTooltip ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className="shrink-0" tabIndex={-1}>
                  <FileText className="h-3 w-3 text-muted-foreground/70" aria-label="노트 있음" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" className="max-w-xs">
                <p className="text-[11.5px] leading-snug whitespace-pre-wrap line-clamp-6">
                  {noteText}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <FileText className="h-3 w-3 text-muted-foreground/70 shrink-0" aria-label="노트 있음" />
          )
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

      {/* 서브태스크 펼침 영역 */}
      {hasSubtasks && expanded && (
        <div className="ml-5 mt-1 mb-1 pl-2 border-l border-[hsl(var(--hairline))]" onClick={(e) => e.stopPropagation()}>
          <SubtaskList
            subtasks={subtasks!}
            onToggle={(id) => onToggleSubtask?.(id)}
            onAdd={(text) => onAddSubtask?.(text)}
            onRemove={(id) => onRemoveSubtask?.(id)}
            onUpdate={onUpdateSubtask ? (id, text) => onUpdateSubtask(id, text) : undefined}
            mode="inline"
          />
        </div>
      )}
      </div>
    );
};

export const PlannerCard = (props: PlannerCardProps) => {
  if (props.variant === 'inbox') {
    return <InboxCardInner {...props} />;
  }

  // variant === 'block'
  const { title, startLabel, kind, done, color, onClick, priority, hasNote, canceled, recurring, subtasks, tags, meta, streakCurrent } = props;
  const accent = color ?? (kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(var(--muted-foreground) / 0.7)');
  // 파스텔 풀 블록 — 색을 배경에 22% 섞고, 보더는 38% 로 약간 진하게.
  const blockBg = `color-mix(in oklab, ${accent} 22%, hsl(var(--background)))`;
  const blockBorder = `color-mix(in oklab, ${accent} 38%, hsl(var(--background)))`;
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
      style={{ backgroundColor: blockBg, borderColor: blockBorder }}
      className={cn(
        'group flex items-stretch gap-2 px-2.5 py-1.5 rounded-md cursor-pointer overflow-hidden',
        'border hover:brightness-[1.04] hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.1)] transition-all',
        'focus:outline-none focus:ring-1 focus:ring-foreground/40',
        dim && 'opacity-50',
      )}
    >
      <div className="min-w-0 flex-1 py-px">
        <div className="flex items-center gap-1">
          <span className="text-[10.5px] font-mono tabular-nums text-foreground/65 tracking-wide font-semibold">
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
          {recurring && (
            <RotateCw className="h-2.5 w-2.5 text-muted-foreground/70" aria-label="반복" strokeWidth={2} />
          )}
          {subtasks && subtasks.length > 0 && <SubtaskProgress subtasks={subtasks} compact />}
          {tags && tags.length > 0 && <TagChip tag={tags[0]} compact />}
          {streakCurrent !== undefined && streakCurrent > 0 && (
            <StreakIndicator current={streakCurrent} compact />
          )}
        </div>
        <p className={cn(
          'text-[13px] leading-snug mt-0.5 truncate text-foreground font-medium',
          dim && 'line-through',
        )}>
          {title}
        </p>
        <MetaChips items={meta} compact />
      </div>
    </div>
  );
};

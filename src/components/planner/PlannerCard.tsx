/**
 * 한 항목(Event 또는 Task) 표시 — variant 2종.
 *
 * - inbox: 시간 미배정 할일 (체크박스 + 깃발 + 제목 + 노트dot + 편집/색/삭제)
 * - block: 시간표 위 시간 블록 (시간칩 + 제목 + 우선순위 dot)
 *
 * TickTick 패턴:
 * - 깃발 = priority 1~3 시각화
 * - 노트 점(FileText) = note 있음 표시
 */
import { Check, Flag, FileText, Ban, RotateCw, ChevronDown, ChevronRight, Palette, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Priority, Subtask, TaskListColor } from '@/types/planner';
import { PRIORITY_COLORS, TASK_LIST_COLORS } from '@/types/planner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
            'inline-flex max-w-full items-center gap-1 rounded border border-foreground/20 bg-background/70 text-muted-foreground',
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

const itemActionStripClass =
  'ml-auto flex h-6 shrink-0 items-center gap-0.5 rounded-lg p-0.5 transition-all';

const itemActionButtonClass =
  'inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground';

const COLOR_OPTIONS: ReadonlyArray<{ value: TaskListColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'teal', label: '청록' },
  { value: 'green', label: '초록' },
  { value: 'amber', label: '노랑' },
  { value: 'orange', label: '주황' },
  { value: 'rose', label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'cyan', label: '하늘' },
];

const InboxColorPicker = ({
  color,
  onColorChange,
}: {
  color?: TaskListColor;
  onColorChange: (color?: TaskListColor) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        aria-label="색 변경"
        title="색 변경"
        className={itemActionButtonClass}
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[160px] p-1.5">
      <div className="grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onColorChange(undefined);
          }}
          aria-label="기본"
          title="기본"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
            !color ? 'border-foreground/50 bg-accent' : 'border-foreground/15 hover:border-foreground/35',
          )}
        >
          <span className="h-3.5 w-3.5 rounded-full border border-foreground/25 bg-card" aria-hidden />
        </button>
        {COLOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onColorChange(option.value);
            }}
            aria-label={option.label}
            title={option.label}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
              color === option.value ? 'border-foreground/50 bg-accent' : 'border-foreground/15 hover:border-foreground/35',
            )}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: TASK_LIST_COLORS[option.value].stripe }} aria-hidden />
          </button>
        ))}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface InboxCardProps {
  variant: 'inbox';
  title: string;
  done: boolean;
  onToggle: () => void;
  onClick?: () => void;
  /** hover 액션의 편집 버튼. 없으면 onClick 을 사용한다. */
  onEdit?: () => void;
  /** hover 액션의 색 변경. */
  onColorChange?: (color?: TaskListColor) => void;
  color?: TaskListColor;
  /** hover 액션의 삭제 버튼. */
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  /** 우클릭 메뉴 등 외부 사용처 호환용. hover 액션에는 표시하지 않는다. */
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
  /** "14:00 ~ 15:00" 형식. */
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
  /** 길이 라벨 — "30분" / "1시간 10분" 등. 시간 옆에 작게. */
  durationLabel?: string;
  /** 같은 일에 다른 항목과 시간 겹침. */
  overlapping?: boolean;
  hideLeftAccent?: boolean;
}

type PlannerCardProps = (InboxCardProps | BlockCardProps) & { meta?: MetaChip[] };

/** Inbox variant — 별도 컴포넌트로 추출 (useState 가 hooks 규칙에 맞도록). */
const InboxCardInner = (props: InboxCardProps) => {
  const {
    title, done, onToggle, onClick, onEdit, onColorChange, color, onDelete, onMoveUp, onMoveDown, moveUpDisabled, moveDownDisabled, priority, pinned, hasNote, note, canceled, recurring,
    subtasks, onToggleSubtask, onAddSubtask, onRemoveSubtask, onUpdateSubtask,
    tags, meta, onTagClick, streakCurrent,
  } = props;
  const showFlag = (priority ?? 0) > 0;
  const dim = done || canceled;
  const noteText = note?.trim() ?? '';
  const showNoteTooltip = hasNote && noteText.length > 0;
  const hasSubtasks = subtasks && subtasks.length > 0;
  const hasActions = Boolean(onMoveUp || onMoveDown || onEdit || onClick || onColorChange || onDelete);
  const handleEdit = onEdit ?? onClick;
  const [expanded, setExpanded] = useState(false);
  const accent = color ? TASK_LIST_COLORS[color].stripe : undefined;
  const priorityColor = showFlag ? PRIORITY_COLORS[priority as Priority] : undefined;
  const checkboxAccentStyle = accent
    ? ({
        borderColor: `color-mix(in oklab, ${accent} 76%, hsl(var(--background)))`,
        backgroundColor: done ? accent : 'transparent',
      })
    : undefined;
  return (
      <div className="rounded-md overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${title}${done ? ' (완료됨)' : ''}${canceled ? ' (취소됨)' : ''}${pinned ? ' (고정됨)' : ''} — 클릭해서 편집`}
        className={cn(
          'group flex items-center gap-2 px-1.5 py-1.5 rounded-md',
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
              'flex h-[15px] w-[15px] items-center justify-center rounded-[4px] border-[1.5px] transition-all shrink-0',
              done
                ? 'bg-foreground border-foreground text-background'
                : 'border-foreground/32 hover:border-foreground/60 hover:scale-110',
            )}
            style={checkboxAccentStyle}
            aria-label={done ? '완료 취소' : '완료'}
          >
            {done && <Check className="h-2.5 w-2.5" strokeWidth={3.25} />}
          </button>
        )}
        {showFlag && (
          <Flag
            className="h-3 w-3 shrink-0"
            style={priorityColor ? { color: priorityColor, fill: priorityColor, stroke: priorityColor } : undefined}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
               'block text-[14px] font-medium leading-tight truncate text-foreground',
               dim && 'line-through text-foreground/50',
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
        {hasActions && (
          <span
            className={cn(
              itemActionStripClass,
              'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(onMoveUp || onMoveDown) && (
              <span className="mr-0.5 inline-flex items-center gap-0.5 border-r border-foreground/10 pr-0.5">
                {onMoveUp && (
                  <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={moveUpDisabled}
                    aria-label={`${title} 위로 이동`}
                    title={`${title} 위로 이동`}
                    className={cn(itemActionButtonClass, 'disabled:pointer-events-none disabled:opacity-30')}
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                )}
                {onMoveDown && (
                  <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={moveDownDisabled}
                    aria-label={`${title} 아래로 이동`}
                    title={`${title} 아래로 이동`}
                    className={cn(itemActionButtonClass, 'disabled:pointer-events-none disabled:opacity-30')}
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </span>
            )}
            {handleEdit && (
              <button
                type="button"
                onClick={handleEdit}
                aria-label="편집"
                title="편집"
                className={itemActionButtonClass}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            )}
            {onColorChange && (
              <InboxColorPicker color={color} onColorChange={onColorChange} />
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="삭제"
                title="삭제"
                className={cn(itemActionButtonClass, 'hover:bg-rose-500/10 hover:text-rose-500')}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            )}
          </span>
        )}
      </div>

      {/* 서브태스크 펼침 영역 */}
      {hasSubtasks && expanded && (
        <div className="ml-5 mt-1 mb-1 pl-2 border-l border-foreground/20" onClick={(e) => e.stopPropagation()}>
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
  const { title, startLabel, kind, done, color, onClick, priority, hasNote, canceled, recurring, subtasks, tags, meta, streakCurrent, durationLabel, overlapping, hideLeftAccent } = props;
  const accent = color ?? (kind === 'event' ? 'hsl(217 82% 58%)' : 'hsl(258 78% 58%)');
  // Semi-transparent blocks keep nearby grid lines readable while preserving the item color.
  const blockBg = `color-mix(in oklab, ${accent} 16%, hsl(var(--background)))`;
  const blockBorder = `color-mix(in oklab, ${accent} 46%, hsl(var(--background)))`;
  const showFlag = (priority ?? 0) > 0;
  const dim = done || canceled;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${kind === 'event' ? '일정' : '할 일'} ${startLabel} ${title}${done ? ' (완료됨)' : ''}${canceled ? ' (취소됨)' : ''}${overlapping ? ' (다른 항목과 시간 겹침)' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        backgroundColor: blockBg,
        borderColor: blockBorder,
        borderLeftColor: hideLeftAccent ? 'transparent' : blockBorder,
        boxShadow: overlapping
          ? '0 0 0 1px color-mix(in oklab, hsl(347 84% 58%) 34%, transparent)'
          : undefined,
      }}
      className={cn(
        'group relative flex items-stretch gap-2 overflow-hidden rounded-md px-2.5 py-1.5 cursor-pointer',
        'border hover:brightness-[1.025] transition-all',
        'focus:outline-none focus:ring-1 focus:ring-foreground/40',
        dim && 'opacity-50',
      )}
    >
      {overlapping && (
        <span
          aria-hidden
          title="다른 항목과 시간 겹침"
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500/75"
        />
      )}
      <div className="min-w-0 flex-1 py-px">
        <div className="flex min-w-0 items-center gap-1.5 pr-2">
          <span className="min-w-0 truncate text-[12px] font-semibold leading-none tabular-nums tracking-normal text-foreground/82">
            {startLabel}
          </span>
          {durationLabel && (
            <span className="shrink-0 text-[12px] font-semibold leading-none tabular-nums text-foreground/62">· {durationLabel}</span>
          )}
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

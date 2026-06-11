import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Flag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  DEFAULT_INLINE_QUICK_ADD_DURATION_MIN,
  buildInlineQuickAddTaskInput,
} from '@/lib/planner/inlineQuickAdd';
import { taskStore } from '@/services/planner/taskStore';
import {
  PLANNER_LIST_CHANGED,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_LIST_COLORS,
  type Priority,
  type TaskListColor,
} from '@/types/planner';

interface InlineQuickAddProps {
  startIso: string;
  durationMin?: number;
  style: React.CSSProperties;
  onClose: () => void;
}

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

const formatHm = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const InlineQuickAdd = ({ startIso, durationMin, style, onClose }: InlineQuickAddProps) => {
  const [value, setValue] = useState('');
  const [selectedColor, setSelectedColor] = useState<TaskListColor | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<Priority>(0);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const focusTitle = () => {
    const title = titleRef.current;
    if (!title) return;
    title.focus({ preventScroll: true });
    const caret = title.value.length;
    title.setSelectionRange(caret, caret);
  };

  const focusTitleSoon = () => {
    focusTitle();
    window.requestAnimationFrame(focusTitle);
    window.setTimeout(focusTitle, 0);
  };

  useEffect(() => {
    focusTitleSoon();
  }, []);

  useEffect(() => {
    let listening = false;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || wrapperRef.current?.contains(target)) return;
      onClose();
    };

    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown);
      listening = true;
    }, 50);

    return () => {
      window.clearTimeout(id);
      if (listening) window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    taskStore.add(buildInlineQuickAddTaskInput(trimmed, startIso, durationMin, {
      color: selectedColor,
      priority: priorityTouched ? selectedPriority : undefined,
    }));
    window.dispatchEvent(new Event(PLANNER_LIST_CHANGED));
    notify.success('일정 추가됨', { duration: 1200 });
    onClose();
  };

  const preventToolbarFocus = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleWrapperPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleWrapperClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) return;
    focusTitleSoon();
  };

  const endIsoPreview = (() => {
    const fallbackDuration = durationMin ?? DEFAULT_INLINE_QUICK_ADD_DURATION_MIN;
    return new Date(new Date(startIso).getTime() + fallbackDuration * 60_000).toISOString();
  })();

  const accentColor = selectedColor ? TASK_LIST_COLORS[selectedColor].stripe : 'hsl(var(--primary))';

  return (
    <div
      ref={wrapperRef}
      data-inline-quick-add="true"
      role="group"
      aria-label="인라인 일정 빠른 추가"
      className={cn(
        'absolute left-2 z-30 w-[calc(100%_-_16px)] max-w-[420px] overflow-hidden rounded-md',
        'border border-primary/30 bg-card shadow-xl ring-1 ring-primary/15',
        'flex flex-col',
      )}
      style={style}
      onPointerDown={handleWrapperPointerDown}
      onClick={handleWrapperClick}
    >
      <div className="flex h-full min-h-0 items-stretch">
        <span className="w-[3px] shrink-0" style={{ backgroundColor: accentColor }} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col px-2.5 py-1.5">
          <div className="mb-0.5 flex items-center gap-1.5">
            <CalendarDays
              className="h-3 w-3 shrink-0"
              style={{ color: accentColor }}
              strokeWidth={2.25}
              aria-hidden
            />
            <span className="text-[10.5px] font-mono font-semibold tabular-nums tracking-wide text-foreground/70">
              {formatHm(startIso)} ~ {formatHm(endIsoPreview)}
            </span>
            <div className="ml-auto flex min-w-0 items-center justify-end gap-1">
              <div className="flex items-center gap-0.5">
                {COLOR_OPTIONS.map((option) => {
                  const active = selectedColor === option.value;
                  const stripe = TASK_LIST_COLORS[option.value].stripe;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      tabIndex={-1}
                      title={active ? `${option.label} 해제` : option.label}
                      aria-label={active ? `${option.label} 해제` : option.label}
                      aria-pressed={active}
                      onPointerDown={preventToolbarFocus}
                      onMouseDown={preventToolbarFocus}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedColor(active ? undefined : option.value);
                        focusTitleSoon();
                      }}
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-110',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                        active ? 'border-foreground/65 ring-2 ring-foreground/10' : 'border-foreground/15',
                      )}
                      style={{ backgroundColor: stripe }}
                    />
                  );
                })}
              </div>
              <div className="ml-1 flex items-center gap-0.5 border-l border-foreground/10 pl-1">
                {([0, 1, 2, 3] as Priority[]).map((priority) => {
                  const active = selectedPriority === priority && (priorityTouched || priority > 0);
                  return (
                    <button
                      key={priority}
                      type="button"
                      tabIndex={-1}
                      title={PRIORITY_LABELS[priority]}
                      aria-label={PRIORITY_LABELS[priority]}
                      aria-pressed={active}
                      onPointerDown={preventToolbarFocus}
                      onMouseDown={preventToolbarFocus}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPriorityTouched(true);
                        setSelectedPriority(priority);
                        focusTitleSoon();
                      }}
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground/45 transition-colors',
                        'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                        active && 'bg-accent text-foreground',
                      )}
                    >
                      <Flag
                        className="h-3 w-3"
                        style={priority > 0 ? { color: PRIORITY_COLORS[priority], fill: PRIORITY_COLORS[priority] } : undefined}
                        strokeWidth={2.1}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              aria-label="취소"
              title="취소 (Esc)"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <textarea
            ref={titleRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="일정 제목  (예: 회의 1시간)"
            aria-label="새 일정 제목"
            rows={1}
            className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-tight text-foreground outline-none placeholder:text-foreground/40 focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
};

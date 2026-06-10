/**
 * 시간표 빈 슬롯에 떠오르는 인라인 input — Apple Calendar 패턴.
 *
 * 빈 슬롯 클릭 → 그 자리에 input 등장 → 제목만 받음 → Enter 시 즉시 생성.
 * 시간 / 길이 / 우선순위 등 깊은 편집은 더블클릭 / 우클릭 → 모달.
 *
 * 타임라인은 시간 블록 = "일정" 으로 고정 (할 일은 좌측 컬럼에서 생성).
 * 자연어 동시 지원: "회의 1시간" 입력 시 자동 길이 60분.
 */
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Flag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import {
  DEFAULT_INLINE_QUICK_ADD_DURATION_MIN,
  buildInlineQuickAddTaskInput,
} from '@/lib/planner/inlineQuickAdd';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_LIST_COLORS,
  type Priority,
  type TaskListColor,
} from '@/types/planner';

interface InlineQuickAddProps {
  /** 슬롯의 시작 ISO. */
  startIso: string;
  /** 사용자 지정 길이(분). drag-to-create 로 들어왔을 때 그 길이. 미지정 시 30분. */
  durationMin?: number;
  /** 절대 좌표 + 크기 (시간표 안 위치). */
  style: React.CSSProperties;
  /** 닫기. */
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
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const InlineQuickAdd = ({ startIso, durationMin, style, onClose }: InlineQuickAddProps) => {
  const [value, setValue] = useState('');
  const [selectedColor, setSelectedColor] = useState<TaskListColor | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<Priority>(0);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusTitleInput = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const keepTitleInputFocused = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // 외부 클릭 / ESC 시 닫기.
  // 이전: input.parentElement 만 체크해서 wrapper 의 다른 자식(X 버튼 등) 클릭하면 잘못 닫힘.
  // 수정: wrapper ref 로 정확히 wrapper 트리 전체 contain 체크.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(target)) {
        onClose();
      }
    };
    const id = window.setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('mousedown', handleClick);
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
    notify.success('일정 추가됐어요', { duration: 1200 });
    onClose();
  };

  // 종료 시각 — 라벨 표시용 (자연어에 길이 명시 없으면 fallback).
  const endIsoPreview = (() => {
    const fallbackDuration = durationMin ?? DEFAULT_INLINE_QUICK_ADD_DURATION_MIN;
    return new Date(new Date(startIso).getTime() + fallbackDuration * 60_000).toISOString();
  })();
  const accentColor = selectedColor ? TASK_LIST_COLORS[selectedColor].stripe : 'hsl(var(--primary))';

  return (
    <div
      ref={wrapperRef}
      role="group"
      aria-label="인라인 일정 빠른 추가"
      className={cn(
        'absolute left-2 z-30 w-[calc(100%_-_16px)] max-w-[420px] rounded-md overflow-hidden',
        'border border-primary/30 bg-card shadow-xl ring-1 ring-primary/15',
        'flex flex-col',
      )}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-stretch h-full">
        {/* 좌측 색 stripe — 일정 시각화. */}
        <span className="w-[3px] shrink-0" style={{ backgroundColor: accentColor }} aria-hidden />
        <div className="flex-1 min-w-0 flex flex-col py-1.5 pr-2 pl-2.5">
          {/* 헤더 — 일정 라벨 + 시간 범위 + 닫기 */}
          <div className="mb-0.5 flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 shrink-0" style={{ color: accentColor }} strokeWidth={2.25} aria-hidden />
            <span className="text-[10.5px] font-mono tabular-nums tracking-wide text-foreground/70 font-semibold">
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
                      title={active ? `${option.label} 해제` : option.label}
                      aria-label={active ? `${option.label} 해제` : option.label}
                      aria-pressed={active}
                      onPointerDown={keepTitleInputFocused}
                      onMouseDown={keepTitleInputFocused}
                      onClick={() => {
                        setSelectedColor(active ? undefined : option.value);
                        focusTitleInput();
                      }}
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
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
                      title={PRIORITY_LABELS[priority]}
                      aria-label={PRIORITY_LABELS[priority]}
                      aria-pressed={active}
                      onPointerDown={keepTitleInputFocused}
                      onMouseDown={keepTitleInputFocused}
                      onClick={() => {
                        setPriorityTouched(true);
                        setSelectedPriority(priority);
                        focusTitleInput();
                      }}
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground/45 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
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
              onClick={onClose}
              aria-label="취소"
              title="취소 (Esc)"
              className="h-5 w-5 inline-flex items-center justify-center rounded text-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="일정 제목  (예: 회의 1시간)"
            aria-label="새 일정 제목"
            className="w-full min-w-0 bg-transparent text-[13px] leading-tight text-foreground placeholder:text-foreground/40 outline-none focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
};

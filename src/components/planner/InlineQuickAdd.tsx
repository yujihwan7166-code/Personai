/**
 * 시간표 빈 슬롯에 떠오르는 인라인 input — Apple Calendar 패턴.
 *
 * 빈 슬롯 클릭 → 그 자리에 input 등장 → 제목만 받음 → Enter 시 즉시 생성.
 * 시간 / 길이 / 우선순위 등 깊은 편집은 더블클릭 / 우클릭 → 모달.
 *
 * 자연어 동시 지원: "회의 1시간" 입력 시 자동 길이 60분.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { notify } from '@/lib/notify';
import { parseNaturalLanguage } from '@/lib/planner/parseNaturalLanguage';
import type { PlannerTask } from '@/types/planner';

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

/** 기본 길이 — 30분. 자연어로 다른 길이 지정 가능. */
const DEFAULT_DURATION_MIN = 30;

export const InlineQuickAdd = ({ startIso, durationMin, style, onClose }: InlineQuickAddProps) => {
  const [value, setValue] = useState('');
  const [asEvent, setAsEvent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 외부 클릭 / ESC 시 닫기.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!inputRef.current?.parentElement?.contains(target)) {
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
    // 자연어 파싱 — 시간/길이/반복/태그/우선순위 추출.
    const slotBase = new Date(startIso);
    const parsed = parseNaturalLanguage(trimmed, slotBase);

    // 자연어가 startAt 을 안 줬으면 슬롯 시간 그대로.
    const startAt = parsed.startAt ?? startIso;
    const fallbackDuration = durationMin ?? DEFAULT_DURATION_MIN;
    const endAt =
      parsed.endAt ??
      new Date(new Date(startAt).getTime() + fallbackDuration * 60_000).toISOString();

    if (asEvent) {
      eventStore.add({
        title: parsed.cleanTitle || trimmed,
        startAt,
        endAt,
        source: 'user',
        recurrence: parsed.recurrence,
      });
    } else {
      const task: Omit<PlannerTask, 'id' | 'createdAt' | 'done'> = {
        title: parsed.cleanTitle || trimmed,
        startAt,
        endAt,
        priority: parsed.priority,
        recurrence: parsed.recurrence,
        tags: parsed.tags,
      };
      taskStore.add(task);
    }
    notify.success(asEvent ? '일정 추가됐어요' : '할 일 추가됐어요', { duration: 1200 });
    onClose();
  };

  return (
    <div
      className={cn(
        'absolute left-2 z-30 w-[calc(100%_-_16px)] max-w-[420px] rounded-md overflow-hidden',
        'border border-foreground/20 bg-card shadow-xl',
        'flex flex-col',
      )}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-stretch h-full">
        <span className="w-[3px] shrink-0 bg-foreground" aria-hidden />
        <div className="flex-1 min-w-0 flex flex-col py-2 pr-2 pl-2">
          <div className="flex items-center gap-1.5 mb-1">
            <button
              type="button"
              onClick={() => setAsEvent(false)}
              className={cn(
                'h-5 px-1.5 text-[10px] font-mono uppercase tracking-wide rounded transition-colors',
                !asEvent ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              할 일
            </button>
            <button
              type="button"
              onClick={() => setAsEvent(true)}
              className={cn(
                'h-5 px-1.5 text-[10px] font-mono uppercase tracking-wide rounded transition-colors',
                asEvent ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              일정
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {new Date(startIso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="취소"
              className="text-muted-foreground hover:text-foreground"
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
            placeholder="제목  (예: 회의 1시간)"
            className="w-full min-w-0 bg-transparent text-[13px] leading-tight text-foreground placeholder:text-muted-foreground/70 outline-none focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
};

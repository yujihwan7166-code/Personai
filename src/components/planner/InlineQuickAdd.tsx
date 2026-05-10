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
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { parseNaturalLanguage } from '@/lib/planner/parseNaturalLanguage';

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

const formatHm = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export const InlineQuickAdd = ({ startIso, durationMin, style, onClose }: InlineQuickAddProps) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    // 자연어 파싱 — 시간/길이/반복/태그 추출.
    const slotBase = new Date(startIso);
    const parsed = parseNaturalLanguage(trimmed, slotBase);

    // 자연어가 startAt 을 안 줬으면 슬롯 시간 그대로.
    const startAt = parsed.startAt ?? startIso;
    const fallbackDuration = durationMin ?? DEFAULT_DURATION_MIN;
    const endAt =
      parsed.endAt ??
      new Date(new Date(startAt).getTime() + fallbackDuration * 60_000).toISOString();

    // 시간 잡힌 task (= "일정") — 설계 의도: 모든 user 항목은 task, eventStore 는 외부 통합용.
    taskStore.add({
      title: parsed.cleanTitle || trimmed,
      startAt,
      endAt,
      recurrence: parsed.recurrence,
      tags: parsed.tags,
      priority: parsed.priority,
    });
    notify.success('일정 추가됐어요', { duration: 1200 });
    onClose();
  };

  // 종료 시각 — 라벨 표시용 (자연어에 길이 명시 없으면 fallback).
  const endIsoPreview = (() => {
    const fallbackDuration = durationMin ?? DEFAULT_DURATION_MIN;
    return new Date(new Date(startIso).getTime() + fallbackDuration * 60_000).toISOString();
  })();

  return (
    <div
      ref={wrapperRef}
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
        <span className="w-[3px] shrink-0 bg-primary" aria-hidden />
        <div className="flex-1 min-w-0 flex flex-col py-1.5 pr-2 pl-2.5">
          {/* 헤더 — 일정 라벨 + 시간 범위 + 닫기 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <CalendarDays className="h-3 w-3 text-primary shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[10.5px] font-mono tabular-nums tracking-wide text-foreground/70 font-semibold">
              {formatHm(startIso)} ~ {formatHm(endIsoPreview)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="취소"
              title="취소 (Esc)"
              className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
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
            className="w-full min-w-0 bg-transparent text-[13px] leading-tight text-foreground placeholder:text-foreground/40 outline-none focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
};

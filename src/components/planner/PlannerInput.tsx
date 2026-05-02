/**
 * 빠른 추가 입력 — Enter 시 onSubmit. 자연어 파싱 미리보기 포함.
 *
 * 패턴:
 * - 입력하면서 실시간 파싱 → 우측에 작은 칩으로 미리보기
 * - Enter 시 파싱 결과를 onSubmit 으로 전달
 * - "내일 오후 3시 회의 1시간" → 자동 시간 배정
 * - "매주 월요일 운동" → 반복 시리즈
 *
 * variant:
 * - 'default'   — 점선/투명 (사이드바 빠른 추가용, 가벼움)
 * - 'prominent' — 실선/배경 + 좌측 + 아이콘 (day 뷰 공통 추가, 부각)
 */
import { useState, useMemo, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseNaturalLanguage, formatParsedPreview, type ParsedInput } from '@/lib/planner/parseNaturalLanguage';

interface PlannerInputProps {
  placeholder?: string;
  onSubmit: (title: string, parsed: ParsedInput) => void;
  /** 외부에서 포커스 제어 ref (단축키 'n' 진입 등). */
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  /** 파싱 미리보기 칩 숨기기 (예: 좁은 컬럼). */
  hidePreview?: boolean;
  /** 시각 강도 — 'prominent' 면 부각된 스타일. 기본 default. */
  variant?: 'default' | 'prominent';
  /** + 아이콘 클릭 핸들러 — 있으면 + 가 버튼으로 동작 (상세 추가 모달 등).
   *  지정 안 하면 + 는 단순 시각 prefix (input focus 만). */
  onPlus?: () => void;
}

export const PlannerInput = ({
  placeholder = '+ 빠른 추가',
  onSubmit,
  inputRef,
  className,
  hidePreview,
  variant = 'default',
  onPlus,
}: PlannerInputProps) => {
  const [value, setValue] = useState('');

  const parsed = useMemo(() => parseNaturalLanguage(value), [value]);
  const previewText = useMemo(() => formatParsedPreview(parsed), [parsed]);
  const hasMeta =
    parsed.startAt || parsed.recurrence || parsed.priority || parsed.goalTitle || (parsed.tags && parsed.tags.length > 0);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return;
      onSubmit(parsed.cleanTitle || trimmed, parsed);
      setValue('');
    } else if (e.key === 'Escape') {
      setValue('');
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const isProminent = variant === 'prominent';

  return (
    <div className={cn('relative', className)}>
      {isProminent && (
        onPlus ? (
          <button
            type="button"
            onClick={onPlus}
            aria-label="상세 추가"
            title="상세 추가 (제목·시간·우선순위 등 직접 채우기)"
            className="absolute left-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-foreground/70 hover:bg-foreground hover:text-background transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <Plus
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/55"
            aria-hidden
          />
        )
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={cn(
          'w-full text-foreground rounded-md transition-colors',
          isProminent
            ? [
                'pl-8 pr-3 py-2 text-[14px] leading-tight font-medium',
                'bg-accent/40 border border-[hsl(var(--hairline))]',
                'placeholder:text-foreground/55 placeholder:font-normal',
                'hover:bg-accent/60 hover:border-foreground/30',
                'focus:bg-background focus:border-foreground/55 focus:outline-none focus:ring-2 focus:ring-foreground/10',
              ]
            : [
                'px-2.5 py-2 text-[13.5px] leading-tight',
                'bg-transparent border border-dashed border-[hsl(var(--hairline))]',
                'placeholder:text-muted-foreground',
                'hover:border-solid hover:border-foreground/30 hover:bg-accent/40',
                'focus:border-solid focus:border-foreground/50 focus:bg-accent/40 focus:outline-none',
              ],
        )}
      />
      {/* 파싱 미리보기 — 입력 아래 inline */}
      {!hidePreview && hasMeta && previewText && (
        <div className="mt-1 px-2 flex items-center gap-1.5 text-[10.5px] font-medium text-primary/80 leading-tight">
          <span aria-hidden>↳</span>
          <span className="truncate">{previewText}</span>
        </div>
      )}
    </div>
  );
};

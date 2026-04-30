/**
 * 빠른 추가 입력 — Enter 시 onSubmit. 자연어 파싱 미리보기 포함.
 *
 * 패턴:
 * - 입력하면서 실시간 파싱 → 우측에 작은 칩으로 미리보기
 * - Enter 시 파싱 결과를 onSubmit 으로 전달
 * - "내일 오후 3시 회의 1시간" → 자동 시간 배정
 * - "매주 월요일 운동" → 반복 시리즈
 *
 * 인식 못 하면 그냥 제목으로만. 사용자에게 부담 없는 progressive enhancement.
 */
import { useState, useMemo, KeyboardEvent } from 'react';
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
}

export const PlannerInput = ({
  placeholder = '+ 빠른 추가',
  onSubmit,
  inputRef,
  className,
  hidePreview,
}: PlannerInputProps) => {
  const [value, setValue] = useState('');

  const parsed = useMemo(() => parseNaturalLanguage(value), [value]);
  const previewText = useMemo(() => formatParsedPreview(parsed), [parsed]);
  const hasMeta =
    parsed.startAt || parsed.recurrence || parsed.priority || (parsed.tags && parsed.tags.length > 0);

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

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={cn(
          'w-full px-2.5 py-2 text-[13.5px] leading-tight text-foreground',
          'bg-transparent border border-dashed border-[hsl(var(--hairline))] rounded-md',
          'placeholder:text-muted-foreground',
          'hover:border-solid hover:border-foreground/30 hover:bg-accent/40',
          'focus:border-solid focus:border-foreground/50 focus:bg-accent/40 focus:outline-none',
          'transition-colors',
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

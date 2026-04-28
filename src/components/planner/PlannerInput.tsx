/**
 * 빠른 추가 입력 — Enter 시 onSubmit. 비어있으면 무시.
 *
 * Phase 1 = 단순 텍스트 입력. Phase 4 에서 슬래시 명령(/2pm 등) 추가 예정.
 */
import { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface PlannerInputProps {
  placeholder?: string;
  onSubmit: (title: string) => void;
  /** 외부에서 포커스 제어 ref (단축키 'n' 진입 등). */
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
}

export const PlannerInput = ({ placeholder = '+ 빠른 추가', onSubmit, inputRef, className }: PlannerInputProps) => {
  const [value, setValue] = useState('');

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return;
      onSubmit(trimmed);
      setValue('');
    } else if (e.key === 'Escape') {
      setValue('');
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      className={cn(
        'w-full px-2.5 py-1.5 text-[13px] leading-tight',
        'bg-transparent border border-transparent rounded-md',
        'placeholder:text-muted-foreground/60',
        'hover:border-[hsl(var(--hairline))] focus:border-[hsl(var(--hairline))]',
        'focus:bg-[hsl(var(--card))] focus:outline-none',
        'transition-colors',
        className,
      )}
    />
  );
};

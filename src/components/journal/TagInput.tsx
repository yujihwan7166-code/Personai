/**
 * 태그 입력 — 칩 형태 (Things3/TickTick 패턴).
 *
 * 사용자가 직접 추가 (자동 추출과 합쳐짐).
 * Enter / 쉼표 / 공백 = 태그 확정.
 */
import { useState, useRef, KeyboardEvent } from 'react';
import { X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** 자주 쓴 태그 자동완성 후보 */
  suggestions?: string[];
  className?: string;
}

const normalize = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '');

export const TagInput = ({ value, onChange, suggestions = [], className }: TagInputProps) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const norm = normalize(raw);
    if (norm.length === 0) return;
    if (value.includes(norm)) return;
    onChange([...value, norm]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || (e.key === ' ' && draft.trim().length > 0)) {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => draft.length === 0 || s.includes(normalize(draft)))
    .slice(0, 5);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 min-h-[36px] rounded-md border border-[hsl(var(--hairline))] bg-card focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15 transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 h-6 rounded text-[11.5px] font-medium bg-accent text-foreground"
          >
            <Hash className="h-3 w-3 text-muted-foreground" />
            {t}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(t); }}
              aria-label={`#${t} 제거`}
              className="ml-0.5 text-muted-foreground hover:text-rose-500 transition-colors"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim().length > 0 && addTag(draft)}
          placeholder={value.length === 0 ? '+ 태그 (예: 운동, 독서)' : '태그 추가'}
          className="flex-1 min-w-[100px] bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-0.5 px-2 h-6 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Hash className="h-2.5 w-2.5" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

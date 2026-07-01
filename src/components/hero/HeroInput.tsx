/**
 * Genspark-스타일 히어로 입력창.
 *
 * 레이아웃:
 *   ┌─ [칩 스트립: 상단 border 관통] ─┐
 *   │  플레이스홀더 텍스트             │
 *   │                                 │
 *   │  📎 🖼️ 🎙️            [↑ send]  │
 *   └─────────────────────────────────┘
 *
 * 브랜드 테마 (--hero-*) 는 상위 `.hero-brand-canvas` 스코프에서 상속.
 */
import { ArrowUp, Image as ImageIcon, Mic, Paperclip } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  onImage?: () => void;
  onVoice?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** 상단 border 관통 칩 스트립 (BrandChipStrip). */
  chipStrip: ReactNode;
  autoFocus?: boolean;
}

export function HeroInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  onImage,
  onVoice,
  placeholder = '무엇이든 물어보세요',
  disabled,
  chipStrip,
  autoFocus,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // auto-grow (max ~6 rows)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter → submit, Shift+Enter → 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <div className="relative w-full">
      {/* 칩 스트립 — top border 관통 (-translate-y-1/2) */}
      <div className="absolute left-4 right-4 top-0 z-10 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">{chipStrip}</div>
      </div>

      {/* 입력 컨테이너 */}
      <div
        className={cn(
          'relative rounded-[var(--hero-radius-input,14px)] border',
          'shadow-[0_18px_48px_-24px_rgba(0,0,0,0.35)]',
          'transition-colors duration-200',
        )}
        style={{
          backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
          borderColor: 'var(--hero-input-border, rgba(255,255,255,0.10))',
        }}
      >
        {/* Textarea */}
        <div className="pt-8 px-4 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              'w-full resize-none bg-transparent border-0 outline-none',
              'text-[15px] leading-6',
              'placeholder:text-[color:var(--hero-fg-muted,#8e8ea0)]',
              'disabled:opacity-60',
            )}
            style={{
              color: 'var(--hero-fg, #ececec)',
              fontFamily: 'var(--hero-font-body, inherit)',
              minHeight: '48px',
              maxHeight: '180px',
            }}
          />
        </div>

        {/* 하단 툴바 */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={onAttach} label="파일 첨부">
              <Paperclip size={17} />
            </ToolbarButton>
            <ToolbarButton onClick={onImage} label="이미지">
              <ImageIcon size={17} />
            </ToolbarButton>
            <ToolbarButton onClick={onVoice} label="음성">
              <Mic size={17} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            {/* Send */}
            <button
              type="button"
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              aria-label="전송"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-all duration-200 ease-out',
                canSubmit
                  ? 'hover:scale-105 active:scale-95'
                  : 'opacity-40 cursor-not-allowed',
              )}
              style={{
                backgroundColor: canSubmit
                  ? 'var(--hero-accent, #10a37f)'
                  : 'var(--hero-accent-soft, rgba(16,163,127,0.16))',
                color: canSubmit ? '#ffffff' : 'var(--hero-fg-muted, #8e8ea0)',
              }}
            >
              <ArrowUp size={17} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
}) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg',
        'transition-colors duration-150',
        'hover:bg-[color:var(--hero-accent-soft,rgba(255,255,255,0.06))]',
      )}
      style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
    >
      {children}
    </button>
  );
}

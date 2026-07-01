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
  /** 하단 툴바 우측 슬롯 — send 버튼 옆에 모델 셀렉트 등. */
  toolbarRight?: ReactNode;
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
  toolbarRight,
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
      {/* 칩 스트립 — top border 관통.
       * 각 칩의 box-shadow 가 hero-bg 색 halo 를 만들어 border 를 자연스럽게 가림.
       * (여기선 pill 배경 X — 칩끼리 hero-bg halo 로 이어짐). */}
      <div className="absolute left-2 right-2 top-0 z-10 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">{chipStrip}</div>
      </div>

      {/* 입력 컨테이너 — 컴팩트 · glass elevation · 브랜드 색조 shadow.
       * focus-within 시 브랜드 색으로 border 변경 (default 파랑 outline 대체). */}
      <div
        className={cn(
          'group relative rounded-[var(--hero-radius-input,14px)] border',
          'transition-all duration-200',
          'focus-within:border-[color:var(--hero-ring,#10a37f)]',
        )}
        style={{
          backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
          borderColor: 'var(--hero-input-border, rgba(255,255,255,0.10))',
          // frosted glass — 컬러 mesh bg 위에서도 input 이 확실히 elevated.
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          // 정제된 3-layer shadow — 은은한 inner highlight + brand accent + delicate depth.
          boxShadow: `
            0 1px 0 rgba(255, 255, 255, 0.05) inset,
            0 8px 24px -14px var(--hero-accent-soft, rgba(0,0,0,0.15)),
            0 2px 8px -4px rgba(0, 0, 0, 0.08)
          `,
        }}
      >
        {/* Textarea — 세로 약간 여유 (min-h 52px) */}
        <div className="pt-7 px-4 pb-1.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              'w-full resize-none bg-transparent border-0',
              // 브라우저 default 파란 outline 완전 제거 — 컨테이너의 focus-within
              // border 로 대체 (브랜드 ring 색).
              'outline-none focus:outline-none focus-visible:outline-none',
              'ring-0 focus:ring-0 focus-visible:ring-0',
              'text-[14.5px] leading-[1.55]',
              'placeholder:text-[color:var(--hero-fg-muted,#8e8ea0)]',
              'disabled:opacity-60',
            )}
            style={{
              color: 'var(--hero-fg, #ececec)',
              fontFamily: 'var(--hero-font-body, inherit)',
              minHeight: '52px',
              maxHeight: '180px',
            }}
          />
        </div>

        {/* 하단 툴바 — 컴팩트 */}
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-0.5">
          <div className="flex items-center gap-0">
            <ToolbarButton onClick={onAttach} label="파일 첨부">
              <Paperclip size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={onImage} label="이미지">
              <ImageIcon size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={onVoice} label="음성">
              <Mic size={14} />
            </ToolbarButton>
          </div>

          {/* 우측: 모델 셀렉트 + Send */}
          <div className="flex items-center gap-1.5">
            {toolbarRight}
            <button
              type="button"
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              aria-label="전송"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full',
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
                ...(canSubmit && {
                  boxShadow: '0 4px 14px -4px var(--hero-accent, #10a37f)',
                }),
              }}
            >
              <ArrowUp size={14} strokeWidth={2.6} />
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
        'flex h-7 w-7 items-center justify-center rounded-md',
        'transition-colors duration-150',
        'hover:bg-[color:var(--hero-accent-soft,rgba(255,255,255,0.06))]',
      )}
      style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
    >
      {children}
    </button>
  );
}

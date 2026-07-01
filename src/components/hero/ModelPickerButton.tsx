/**
 * 모델 선택 버튼 — 브랜드 안의 모델 변형 선택.
 *
 * variant:
 *   - 'toolbar'  → 입력창 우측 하단 컴팩트 pill (기본)
 *   - 'eyebrow'  → 헤드라인 위 브랜드 이름 자리. 텍스트 스타일, 큰 클릭 영역.
 *                  브랜드명 · 모델명 · chevron 순으로 표시.
 *
 * 드롭다운 방향:
 *   - toolbar → 위로 (bottom-full)
 *   - eyebrow → 아래로 (top-full)
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand, BrandModel } from '@/lib/aiBrands';

interface Props {
  brand: Brand;
  selectedModel: BrandModel;
  onSelect: (modelId: string) => void;
  variant?: 'toolbar' | 'eyebrow';
}

export function ModelPickerButton({
  brand,
  selectedModel,
  onSelect,
  variant = 'toolbar',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasChoice = brand.models.length > 1;
  const isEyebrow = variant === 'eyebrow';

  return (
    <div ref={rootRef} className={cn('relative', isEyebrow && 'inline-flex')}>
      <button
        type="button"
        onClick={() => hasChoice && setOpen((v) => !v)}
        disabled={!hasChoice}
        aria-haspopup="menu"
        aria-expanded={open}
        title={hasChoice ? '모델 변경' : '이 브랜드는 단일 모델'}
        className={cn(
          isEyebrow
            ? [
                // eyebrow 스타일 — 헤드라인 위 라벨. uppercase, tracking, 클릭 영역 넓게.
                'inline-flex items-center gap-1.5 py-1 px-2 -mx-2 rounded-md',
                'text-[11px] font-semibold tracking-[0.14em] uppercase',
                'transition-colors duration-150',
                hasChoice && 'hover:bg-[color:var(--hero-accent-soft)]',
              ]
            : [
                // toolbar 스타일 — 입력창 우측 pill.
                'flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full',
                'text-[11px] font-medium tracking-tight',
                'border transition-all duration-150',
                'border-[color:var(--hero-hairline,rgba(255,255,255,0.10))]',
                'hover:border-[color:var(--hero-ring,#10a37f)]',
              ],
          !hasChoice && 'opacity-70 cursor-not-allowed',
        )}
        style={
          isEyebrow
            ? { color: 'var(--hero-accent)' }
            : {
                color: 'var(--hero-fg, #ececec)',
                backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.05))',
              }
        }
      >
        {isEyebrow ? (
          <>
            <span>{brand.name}</span>
            <span className="opacity-60">·</span>
            <span className="normal-case tracking-normal">{selectedModel.name}</span>
            {hasChoice && (
              <ChevronDown
                size={12}
                strokeWidth={2.4}
                className={cn('opacity-70 transition-transform', open && 'rotate-180')}
              />
            )}
          </>
        ) : (
          <>
            <span className="truncate max-w-[128px]">{selectedModel.name}</span>
            {hasChoice && (
              <ChevronDown
                size={11}
                strokeWidth={2.2}
                className={cn('opacity-70 transition-transform', open && 'rotate-180')}
              />
            )}
          </>
        )}
      </button>

      {open && hasChoice && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-[240px] max-w-[280px]',
            'rounded-xl border p-1',
            'shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)]',
            'animate-in fade-in zoom-in-95 duration-150',
            isEyebrow
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 slide-in-from-top-1'
              : 'bottom-full right-0 mb-2 slide-in-from-bottom-1',
          )}
          style={{
            backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
            borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
            backdropFilter: 'blur(12px) saturate(140%)',
          }}
        >
          <div
            className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--hero-accent, #10a37f)' }}
          >
            {brand.name} 모델
          </div>
          {brand.models.map((m) => {
            const active = m.id === selectedModel.id;
            return (
              <button
                key={m.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-left',
                  'transition-colors duration-100',
                )}
                style={{
                  backgroundColor: active ? 'var(--hero-accent-soft)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Check
                  size={13}
                  strokeWidth={2.5}
                  className={cn('shrink-0', active ? 'opacity-100' : 'opacity-0')}
                  style={{ color: 'var(--hero-accent, #10a37f)' }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[12.5px] font-medium leading-tight truncate"
                    style={{ color: 'var(--hero-fg, #ececec)' }}
                  >
                    {m.name}
                  </span>
                  {m.description && (
                    <span
                      className="block text-[10.5px] mt-0.5 truncate"
                      style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
                    >
                      {m.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 모델 선택 버튼 — 히어로 입력창 툴바에서 브랜드 안의 모델 변형 선택.
 *
 * 버튼: `[모델명 ▾]` (브랜드 accent 색, 컴팩트)
 * 클릭: 위쪽으로 드롭다운 (모델 카드 목록) 오픈.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand, BrandModel } from '@/lib/aiBrands';

interface Props {
  brand: Brand;
  selectedModel: BrandModel;
  onSelect: (modelId: string) => void;
}

export function ModelPickerButton({ brand, selectedModel, onSelect }: Props) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => hasChoice && setOpen((v) => !v)}
        disabled={!hasChoice}
        aria-haspopup="menu"
        aria-expanded={open}
        title={hasChoice ? '모델 변경' : '이 브랜드는 단일 모델'}
        className={cn(
          'flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full',
          'text-[11px] font-medium tracking-tight',
          'border transition-all duration-150',
          'border-[color:var(--hero-hairline,rgba(255,255,255,0.10))]',
          'hover:border-[color:var(--hero-ring,#10a37f)]',
          !hasChoice && 'opacity-70 cursor-not-allowed hover:border-[color:var(--hero-hairline)]',
        )}
        style={{
          color: 'var(--hero-fg, #ececec)',
          backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.05))',
        }}
      >
        <span className="truncate max-w-[128px]">{selectedModel.name}</span>
        {hasChoice && (
          <ChevronDown
            size={11}
            strokeWidth={2.2}
            className={cn('opacity-70 transition-transform', open && 'rotate-180')}
          />
        )}
      </button>

      {open && hasChoice && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full right-0 mb-2 min-w-[220px] max-w-[260px]',
            'rounded-xl border p-1 z-50',
            'shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)]',
            'animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-150',
          )}
          style={{
            backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
            borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
            backdropFilter: 'blur(8px)',
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
                  'hover:bg-white/[0.06]',
                  active && 'bg-white/[0.05]',
                )}
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

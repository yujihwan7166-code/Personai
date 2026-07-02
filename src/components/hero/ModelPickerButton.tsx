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
import { ChevronDown } from 'lucide-react';
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
                // eyebrow 스타일 — 헤드라인 위 라벨. 모델명만 · 살짝 크게 · 클릭 영역 넓게.
                'inline-flex items-center gap-1.5 py-2 px-4 -mx-4 rounded-lg',
                'text-[15px] font-medium tracking-normal',
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
            {/* 모델명만 표시 — 브랜드명 중복 제거 (모델명이 이미 브랜드 접두어 포함). */}
            <span>{selectedModel.name}</span>
            {hasChoice && (
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                className={cn('opacity-60 transition-transform', open && 'rotate-180')}
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
            // 넉넉한 폭 · 정제된 padding
            'absolute z-50 min-w-[280px] max-w-[320px]',
            'rounded-2xl border p-2',
            'shadow-[0_20px_50px_-14px_rgba(0,0,0,0.40)]',
            'animate-in fade-in zoom-in-95 duration-150',
            isEyebrow
              ? 'top-full left-1/2 -translate-x-1/2 mt-3 slide-in-from-top-1'
              : 'bottom-full right-0 mb-3 slide-in-from-bottom-1',
          )}
          style={{
            backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
            borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* 헤더 — 브랜드 이름만, delicate. */}
          <div
            className="px-2.5 pt-1.5 pb-2 flex items-center gap-1.5"
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--hero-accent, #10a37f)' }}
            />
            <span
              className="text-[11px] font-medium tracking-tight"
              style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
            >
              {brand.name} · 모델 {brand.models.length}개
            </span>
          </div>
          {/* 모델 리스트 — 많아지면 스크롤 (max 5.5개 높이). */}
          <div className="max-h-[300px] overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
            {brand.models.map((m) => {
              const active = m.id === selectedModel.id;
              return (
                <button
                  key={`${m.id}-${m.name}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelect(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 px-2.5 py-2 rounded-xl text-left',
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
                  {/* active dot — Check 아이콘 대신 브랜드 색 점으로 정제. */}
                  <span
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ backgroundColor: 'var(--hero-accent, #10a37f)' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="block text-[13.5px] font-medium leading-tight truncate"
                        style={{ color: 'var(--hero-fg, #ececec)' }}
                      >
                        {m.name}
                      </span>
                      {m.isDefault && (
                        <span
                          className="shrink-0 px-1.5 py-px rounded-full text-[9px] font-semibold tracking-tight"
                          style={{
                            color: 'var(--hero-accent, #10a37f)',
                            backgroundColor: 'var(--hero-accent-soft)',
                          }}
                        >
                          추천
                        </span>
                      )}
                    </span>
                    {m.description && (
                      <span
                        className="block text-[11px] mt-1 leading-snug"
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
        </div>
      )}
    </div>
  );
}

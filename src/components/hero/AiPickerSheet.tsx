/**
 * `+` 칩 클릭 시 열리는 AI 편집 창.
 *
 * 이전(v1): AI 선택 시트 → 클릭 시 그 AI 로 스위칭.
 * 현재(v2): AI 편집 창 → 각 AI 를 토글해 칩 스트립에 표시할지 관리.
 *
 * 규칙:
 *   - 최소 1개는 항상 켜져 있어야 함 (칩 스트립 비면 안 됨).
 *   - 저장은 즉시 localStorage 반영 (닫자마자 스트립 업데이트).
 */
import { Check, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, type Brand, type BrandId } from '@/lib/aiBrands';
import { BrandLogo } from './BrandLogo';

interface Props {
  open: boolean;
  onClose: () => void;
  visibleIds: BrandId[];
  onToggle: (id: BrandId) => void;
  onShowAll: () => void;
}

export function AiPickerSheet({ open, onClose, visibleIds, onToggle, onShowAll }: Props) {
  if (!open) return null;
  const shownCount = visibleIds.length;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI 편집"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-[min(560px,92vw)] max-h-[80vh] overflow-hidden rounded-2xl',
          'border border-white/10 bg-[#111114] shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-[15px] font-semibold text-white">AI 편집</h2>
            <p className="text-[12px] text-white/50 mt-0.5">
              칩 스트립에 표시할 AI 를 골라주세요 · {shownCount}/{BRANDS.length}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onShowAll}
              disabled={shownCount === BRANDS.length}
              aria-label="전체 표시"
              title="전체 표시"
              className={cn(
                'flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium',
                'text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              전체
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 p-4 max-h-[60vh] overflow-y-auto">
          {BRANDS.map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              enabled={visibleIds.includes(brand.id)}
              disabled={visibleIds.includes(brand.id) && visibleIds.length <= 1}
              onClick={() => onToggle(brand.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandRow({
  brand,
  enabled,
  disabled,
  onClick,
}: {
  brand: Brand;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const brandColor = `#${brand.icon.hex}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={enabled}
      title={disabled ? '최소 1개는 표시해야 합니다' : enabled ? '숨기기' : '표시하기'}
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 text-left',
        'transition-all duration-150',
        enabled
          ? 'border-white/25 bg-white/[0.05]'
          : 'border-white/10 bg-transparent hover:bg-white/[0.03] hover:border-white/15',
        disabled && 'opacity-70 cursor-not-allowed',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: brandColor, opacity: enabled ? 1 : 0.55 }}
      >
        <BrandLogo
          imgUrl={brand.icon.imgUrl}
          path={brand.icon.path}
          text={brand.icon.text}
          fill="#FFFFFF"
          size={20}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[13.5px] font-semibold', enabled ? 'text-white' : 'text-white/60')}>
          {brand.name}
        </span>
        <span className="block text-[11.5px] text-white/50 truncate">{brand.provider}</span>
      </span>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full shrink-0 border transition-all',
          enabled
            ? 'border-white/70 bg-white/90'
            : 'border-white/25 bg-transparent group-hover:border-white/40',
        )}
      >
        {enabled && <Check size={12} strokeWidth={3} className="text-black" />}
      </span>
    </button>
  );
}

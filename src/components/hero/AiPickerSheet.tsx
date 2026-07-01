/**
 * `+` 칩 클릭 시 열리는 전체 AI 선택 시트.
 *
 * 현재 v1 은 8개 대표 브랜드만 리스팅 (Step 5 에서 확장 리스트로 발전 가능).
 * 시트는 shadcn Dialog 위에 얹어 다크 톤 커스텀.
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, type Brand, type BrandId } from '@/lib/aiBrands';
import { BrandLogo } from './BrandLogo';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedBrand: BrandId;
  onSelect: (b: BrandId) => void;
}

export function AiPickerSheet({ open, onClose, selectedBrand, onSelect }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI 선택"
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
            <h2 className="text-[15px] font-semibold text-white">대표 AI 선택</h2>
            <p className="text-[12px] text-white/50 mt-0.5">
              선택하면 화면 테마가 해당 AI 로 전환됩니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 p-4 max-h-[60vh] overflow-y-auto">
          {BRANDS.map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              active={selectedBrand === brand.id}
              onClick={() => {
                onSelect(brand.id);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandRow({
  brand,
  active,
  onClick,
}: {
  brand: Brand;
  active: boolean;
  onClick: () => void;
}) {
  const brandColor = `#${brand.icon.hex}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 text-left',
        'transition-all duration-150',
        active
          ? 'border-white/30 bg-white/[0.06]'
          : 'border-white/10 bg-transparent hover:bg-white/[0.04] hover:border-white/20',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: brandColor }}
      >
        <BrandLogo
          imgUrl={brand.icon.imgUrl}
          path={brand.icon.path}
          fill="#FFFFFF"
          size={20}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-white">{brand.name}</span>
        <span className="block text-[11.5px] text-white/50 truncate">{brand.provider}</span>
      </span>
      {active && (
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: brandColor }}
          aria-label="현재 선택됨"
        />
      )}
    </button>
  );
}

/**
 * 좌측 `+` 칩 클릭 시 열리는 포탈 편집 창.
 *
 * 검색엔진 + 포탈 (유튜브·트위터·GitHub·Reddit·위키) 을 토글로 관리.
 * 최소 1개 유지 · localStorage 저장.
 */
import { RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HERO_SEARCH_CHIPS, type HeroChipId, type HeroSearchChip } from '@/lib/heroSearchChips';
import { BrandLogo } from './BrandLogo';

interface Props {
  open: boolean;
  onClose: () => void;
  visibleIds: HeroChipId[];
  onToggle: (id: HeroChipId) => void;
  onResetDefaults: () => void;
}

export function PortalPickerSheet({
  open,
  onClose,
  visibleIds,
  onToggle,
  onResetDefaults,
}: Props) {
  if (!open) return null;
  const shownCount = visibleIds.length;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="포탈·검색 편집"
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
            <h2 className="text-[15px] font-semibold text-white">포탈 · 검색 편집</h2>
            <p className="text-[12px] text-white/50 mt-0.5">
              칩 스트립에 표시할 포탈 · {shownCount}/{HERO_SEARCH_CHIPS.length}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onResetDefaults}
              aria-label="기본값 복원"
              title="기본값 (네이버·구글·다음)"
              className={cn(
                'flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium',
                'text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors',
              )}
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              기본값
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
          {HERO_SEARCH_CHIPS.map((chip) => (
            <PortalRow
              key={chip.id}
              chip={chip}
              enabled={visibleIds.includes(chip.id)}
              disabled={visibleIds.includes(chip.id) && visibleIds.length <= 1}
              onClick={() => onToggle(chip.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PortalRow({
  chip,
  enabled,
  disabled,
  onClick,
}: {
  chip: HeroSearchChip;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
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
        style={{ backgroundColor: chip.circleBg, opacity: enabled ? 1 : 0.55 }}
      >
        <BrandLogo
          path={chip.icon.path}
          text={chip.icon.text}
          lucide={chip.icon.lucide as 'Star' | 'Bookmark' | undefined}
          fill={chip.iconFill}
          size={20}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[13.5px] font-semibold', enabled ? 'text-white' : 'text-white/60')}>
          {chip.name}
        </span>
        <span className="block text-[11px] text-white/50 truncate">
          {chip.subtitle?.split(' · ')[1] ?? '외부 검색'}
        </span>
      </span>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full shrink-0 border transition-all',
          enabled
            ? 'border-white/70 bg-white/90'
            : 'border-white/25 bg-transparent group-hover:border-white/40',
        )}
      >
        {enabled && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: '#000' }}
          />
        )}
      </span>
    </button>
  );
}

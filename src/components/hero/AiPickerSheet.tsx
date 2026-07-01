/**
 * 통합 편집 창 — 브라우저(포탈) + AI 를 탭으로 관리.
 *
 * 이전: `+` 두 개 (좌 포탈용, 우 AI 용) 각자 시트 열림.
 * 현재: `+` 하나로 통일, 이 시트가 두 그룹 모두 편집.
 *
 * 각 그룹 최소 1개 유지 · localStorage 저장.
 */
import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, type Brand, type BrandId } from '@/lib/aiBrands';
import { HERO_SEARCH_CHIPS, type HeroChipId, type HeroSearchChip } from '@/lib/heroSearchChips';
import { BrandLogo } from './BrandLogo';

interface Props {
  open: boolean;
  onClose: () => void;
  /** AI 상태·핸들러. */
  visibleAiIds: BrandId[];
  onToggleAi: (id: BrandId) => void;
  onShowAllAi: () => void;
  /** 포탈 상태·핸들러. */
  visiblePortalIds: HeroChipId[];
  onTogglePortal: (id: HeroChipId) => void;
  onResetPortalDefaults: () => void;
}

type Tab = 'ai' | 'portal';

export function AiPickerSheet({
  open,
  onClose,
  visibleAiIds,
  onToggleAi,
  onShowAllAi,
  visiblePortalIds,
  onTogglePortal,
  onResetPortalDefaults,
}: Props) {
  const [tab, setTab] = useState<Tab>('ai');
  if (!open) return null;

  const showingAi = tab === 'ai';
  const shownCount = showingAi ? visibleAiIds.length : visiblePortalIds.length;
  const totalCount = showingAi ? BRANDS.length : HERO_SEARCH_CHIPS.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="편집"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-[min(600px,92vw)] max-h-[80vh] overflow-hidden rounded-2xl',
          'border border-white/10 bg-[#111114] shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 + 탭 */}
        <header className="px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white">편집</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={showingAi ? onShowAllAi : onResetPortalDefaults}
                disabled={showingAi ? shownCount === totalCount : false}
                aria-label={showingAi ? '전체 표시' : '기본값 복원'}
                title={showingAi ? '전체 표시' : '기본값 (네이버·구글·다음)'}
                className={cn(
                  'flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium',
                  'text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <RotateCcw size={12} strokeWidth={2.2} />
                {showingAi ? '전체' : '기본값'}
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
          </div>

          {/* 탭 스위처 */}
          <div className="mt-3 flex items-center gap-1">
            <TabButton active={showingAi} onClick={() => setTab('ai')}>
              AI · {visibleAiIds.length}/{BRANDS.length}
            </TabButton>
            <TabButton active={!showingAi} onClick={() => setTab('portal')}>
              브라우저 · {visiblePortalIds.length}/{HERO_SEARCH_CHIPS.length}
            </TabButton>
          </div>
        </header>

        {/* 본문 — 탭에 따라 AI or 포탈 리스트 */}
        <div className="grid grid-cols-2 gap-2 p-4 max-h-[60vh] overflow-y-auto">
          {showingAi
            ? BRANDS.map((brand) => (
                <BrandRow
                  key={brand.id}
                  brand={brand}
                  enabled={visibleAiIds.includes(brand.id)}
                  disabled={visibleAiIds.includes(brand.id) && visibleAiIds.length <= 1}
                  onClick={() => onToggleAi(brand.id)}
                />
              ))
            : HERO_SEARCH_CHIPS.map((chip) => (
                <PortalRow
                  key={chip.id}
                  chip={chip}
                  enabled={visiblePortalIds.includes(chip.id)}
                  disabled={visiblePortalIds.includes(chip.id) && visiblePortalIds.length <= 1}
                  onClick={() => onTogglePortal(chip.id)}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

/** 탭 스위처 버튼. */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium',
        'transition-colors duration-150',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-white/60 hover:bg-white/[0.04] hover:text-white/90',
      )}
    >
      {children}
    </button>
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
      <ToggleDot enabled={enabled} />
    </button>
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
        <span className="block text-[11.5px] text-white/50 truncate">
          {chip.subtitle?.split(' · ')[1] ?? '외부 검색'}
        </span>
      </span>
      <ToggleDot enabled={enabled} />
    </button>
  );
}

function ToggleDot({ enabled }: { enabled: boolean }) {
  return (
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
  );
}

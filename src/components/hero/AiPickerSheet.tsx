/**
 * 통합 편집 창 — 브라우저(포탈) + AI 를 탭으로 관리.
 *
 * 이전: `+` 두 개 (좌 포탈용, 우 AI 용) 각자 시트 열림.
 * 현재: `+` 하나로 통일, 이 시트가 두 그룹 모두 편집.
 *
 * 각 그룹 최소 1개 유지 · localStorage 저장.
 */
import { useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, type Brand, type BrandId } from '@/lib/aiBrands';
import { HERO_SEARCH_CHIPS, type HeroChipId, type HeroSearchChip } from '@/lib/heroSearchChips';
import type { CustomAi } from '@/lib/customAi';
import type { CustomPortal } from '@/lib/customPortal';
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
  /** 커스텀 AI 목록·핸들러. */
  customAis: CustomAi[];
  onCreateCustom: () => void;
  onEditCustom: (custom: CustomAi) => void;
  onDeleteCustom: (id: string) => void;
  /** 커스텀 포탈 목록·핸들러. */
  customPortals: CustomPortal[];
  onCreateCustomPortal: () => void;
  onEditCustomPortal: (portal: CustomPortal) => void;
  onDeleteCustomPortal: (id: string) => void;
}

type Tab = 'ai' | 'custom' | 'portal';

export function AiPickerSheet({
  open,
  onClose,
  visibleAiIds,
  onToggleAi,
  onShowAllAi,
  visiblePortalIds,
  onTogglePortal,
  onResetPortalDefaults,
  customAis,
  onCreateCustom,
  onEditCustom,
  onDeleteCustom,
  customPortals,
  onCreateCustomPortal,
  onEditCustomPortal,
  onDeleteCustomPortal,
}: Props) {
  const [tab, setTab] = useState<Tab>('ai');
  if (!open) return null;

  const showingAi = tab === 'ai';
  const showingCustom = tab === 'custom';

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
              {showingAi && (
                <button
                  type="button"
                  onClick={onShowAllAi}
                  disabled={visibleAiIds.length === BRANDS.length}
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
              )}
              {tab === 'portal' && (
                <>
                  <button
                    type="button"
                    onClick={onResetPortalDefaults}
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
                    onClick={onCreateCustomPortal}
                    aria-label="나만의 포탈 만들기"
                    title="URL 템플릿으로 검색 엔진 추가"
                    className={cn(
                      'flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-semibold',
                      'bg-blue-600 hover:bg-blue-500 text-white transition-colors',
                    )}
                  >
                    <Plus size={12} strokeWidth={2.6} />
                    만들기
                  </button>
                </>
              )}
              {showingCustom && (
                <button
                  type="button"
                  onClick={onCreateCustom}
                  aria-label="나만의 AI 만들기"
                  title="나만의 AI 만들기"
                  className={cn(
                    'flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-semibold',
                    'bg-purple-600 hover:bg-purple-500 text-white transition-colors',
                  )}
                >
                  <Plus size={12} strokeWidth={2.6} />
                  만들기
                </button>
              )}
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
            <TabButton active={showingCustom} onClick={() => setTab('custom')}>
              <Sparkles size={11} strokeWidth={2.4} className="opacity-70" />
              나만의 AI · {customAis.length}
            </TabButton>
            <TabButton active={tab === 'portal'} onClick={() => setTab('portal')}>
              브라우저 · {visiblePortalIds.length}/{HERO_SEARCH_CHIPS.length}
            </TabButton>
          </div>
        </header>

        {/* 본문 — 탭에 따라 AI · 커스텀 · 포탈 리스트 */}
        {showingCustom ? (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {customAis.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10">
                  <Sparkles size={22} className="text-purple-400" />
                </div>
                <div className="text-center">
                  <div className="text-[13.5px] font-semibold text-white">아직 만든 AI 가 없어요</div>
                  <div className="text-[11.5px] text-white/50 mt-1">
                    프롬프트·이모지·색 을 조합해 나만의 AI 를 만들어보세요
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCreateCustom}
                  className="mt-2 flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  <Plus size={13} strokeWidth={2.6} />
                  나만의 AI 만들기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {customAis.map((c) => (
                  <CustomRow
                    key={c.id}
                    custom={c}
                    onEdit={() => onEditCustom(c)}
                    onDelete={() => {
                      if (window.confirm(`"${c.name}" 삭제할까요?`)) onDeleteCustom(c.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
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
              : (
                <>
                  {HERO_SEARCH_CHIPS.map((chip) => (
                    <PortalRow
                      key={chip.id}
                      chip={chip}
                      enabled={visiblePortalIds.includes(chip.id)}
                      disabled={visiblePortalIds.includes(chip.id) && visiblePortalIds.length <= 1}
                      onClick={() => onTogglePortal(chip.id)}
                    />
                  ))}
                  {/* 사용자 커스텀 포탈 — 편집·삭제 가능. */}
                  {customPortals.map((p) => (
                    <CustomPortalRow
                      key={p.id}
                      portal={p}
                      onEdit={() => onEditCustomPortal(p)}
                      onDelete={() => {
                        if (window.confirm(`"${p.name}" 삭제할까요?`)) onDeleteCustomPortal(p.id);
                      }}
                    />
                  ))}
                </>
              )}
          </div>
        )}
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

/** 커스텀 포탈 카드 — 편집·삭제 버튼 포함. */
function CustomPortalRow({
  portal,
  onEdit,
  onDelete,
}: {
  portal: CustomPortal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 text-left',
        'border-blue-500/20 bg-blue-500/[0.03] hover:bg-blue-500/[0.06]',
        'transition-all duration-150',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: portal.colorHex }}
      >
        <span className="text-[18px] leading-none select-none">{portal.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-white truncate">
          {portal.name}
        </span>
        <span className="block text-[10.5px] text-white/40 truncate font-mono">
          {portal.urlTemplate}
        </span>
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label="편집"
          title="편집"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="삭제"
          title="삭제"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

/** 커스텀 AI 카드 — 편집·삭제 버튼 포함. */
function CustomRow({
  custom,
  onEdit,
  onDelete,
}: {
  custom: CustomAi;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 text-left',
        'border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20',
        'transition-all duration-150',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: custom.colorHex }}
      >
        <span className="text-[18px] leading-none select-none">{custom.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-white truncate">
          {custom.name}
        </span>
        <span className="block text-[11px] text-white/50 truncate">
          {custom.description || '나만의 커스텀 AI'}
        </span>
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label="편집"
          title="편집"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="삭제"
          title="삭제"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

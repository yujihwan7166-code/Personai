/**
 * Genspark-스타일 히어로 v3 — AI 와 검색엔진 상호 배타 선택.
 *
 * 유저 규칙: "나는 AI 나 검색엔진 중에서 하나만 선택 가능한거야"
 *   → 검색 armed 시 히어로 전체(헤드라인/서브/워터마크/eyebrow/placeholder/모델셀렉트)가
 *     그 검색엔진의 identity 로 완전 스왑.
 *   → AI 칩 클릭 시 검색 armed 는 자동으로 해제.
 *   → AI 칩과 검색 칩은 동시에 highlight 되지 않음.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_BY_ID, type BrandId } from '@/lib/aiBrands';
import { BrandChipStrip } from './BrandChipStrip';
import { HeroInput } from './HeroInput';
import { AiPickerSheet } from './AiPickerSheet';
import { BrandLogo } from './BrandLogo';
import { ModelPickerButton } from './ModelPickerButton';
import { useSelectedBrand } from '@/hooks/useSelectedBrand';
import { useSelectedModel } from '@/hooks/useSelectedModel';
import { useSearchEngineArm } from '@/hooks/useSearchEngineArm';
import { HERO_SEARCH_CHIP_BY_ID, buildHeroSearchUrl, type HeroChipId } from '@/lib/heroSearchChips';

interface Props {
  /** 상단 pill (모드 셀렉트 등). topSlot 지정 시 pill 대신 렌더. */
  topSlot?: React.ReactNode;
  /** 모드 pill 라벨 (예: "일반"). */
  modeLabel?: string;
  /** 모드 pill 클릭 시 모드 드롭다운 오픈 콜백. */
  onOpenModeDropdown?: () => void;
  /** 입력 텍스트 · 컨트롤드 상태. */
  value: string;
  onChange: (v: string) => void;
  /**
   * AI 로 라우팅 (검색 disarm 상태에서 Enter).
   * expertId 는 선택된 모델의 id (없으면 brand.expertId 폴백).
   */
  onSubmitToAi: (brand: BrandId, expertId: string, text: string) => void;
  onAttach?: () => void;
  onImage?: () => void;
  onVoice?: () => void;
  onOpenBookmarks: () => void;
  disabled?: boolean;
}

export function HeroSection({
  topSlot,
  modeLabel,
  onOpenModeDropdown,
  value,
  onChange,
  onSubmitToAi,
  onAttach,
  onImage,
  onVoice,
  onOpenBookmarks,
  disabled,
}: Props) {
  const { brand, setBrand } = useSelectedBrand();
  const { model, setModel } = useSelectedModel(brand);
  const { armed, toggle, disarm } = useSearchEngineArm();
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeBrand = BRAND_BY_ID[brand];
  const armedChip = armed ? HERO_SEARCH_CHIP_BY_ID[armed] : null;
  // 외부 검색 armed 여부 (북마크는 armed 로 취급 X — 즉시 모달).
  const isSearchArmed = !!armedChip?.external;

  // AI 클릭 → armed 검색 해제 (상호 배타).
  const handleSelectBrand = (b: BrandId) => {
    setBrand(b);
    if (armed) disarm();
  };

  // 검색 클릭 → 그냥 toggle (같은 칩 다시 클릭 = disarm).
  // 브랜드 state 는 유지되지만 armed 동안 시각적으로 감춤.
  const handleToggleSearch = (id: HeroChipId) => {
    toggle(id);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // 검색 armed → 무조건 외부 새 탭.
    if (armedChip && armedChip.external) {
      const url = buildHeroSearchUrl(armedChip.id, trimmed);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onChange('');
        disarm();
        return;
      }
    }

    // AI 채팅.
    onSubmitToAi(brand, model?.id ?? activeBrand.expertId, trimmed);
  };

  // 헤드라인·서브·placeholder·eyebrow·워터마크 = armed 여부에 따라 스왑.
  const displayName = isSearchArmed ? armedChip!.name : activeBrand.name;
  const heading = isSearchArmed
    ? (armedChip!.greeting ?? `${armedChip!.name}에서 검색해요`)
    : activeBrand.greeting;
  const subheading = isSearchArmed
    ? (armedChip!.subtitle ?? '검색어를 입력하고 Enter 를 누르면 새 탭에서 열려요')
    : activeBrand.subtitle;
  const placeholder = isSearchArmed
    ? (armedChip!.placeholder ?? '검색어를 입력하고 Enter…')
    : activeBrand.placeholder;

  // key 는 armed 상태도 반영 — armed 스위칭 시 fade-in 재생.
  const identityKey = isSearchArmed ? `search-${armedChip!.id}` : `brand-${brand}`;
  const eyebrowColor = isSearchArmed ? armedChip!.ring : 'var(--hero-accent)';

  return (
    <div
      className="hero-brand-canvas relative w-full min-h-full flex flex-col items-center justify-center overflow-hidden"
      // 검색 armed 시 → 그 검색엔진 테마로 morph.
      // 상호 배타이므로 AI 브랜드는 감춰짐.
      data-brand={isSearchArmed ? armedChip!.id : brand}
    >
      {/* 워터마크 — armed 시 검색엔진 로고, 아니면 브랜드 로고. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]"
        aria-hidden
        style={{
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
        }}
      >
        {isSearchArmed && armedChip!.icon.path ? (
          // 검색 armed 워터마크 — 검색엔진 실제 로고 컬러.
          <BrandLogo
            key={`wm-${armedChip!.id}`}
            path={armedChip!.icon.path}
            fill={armedChip!.ring}
            forceWhite={false}
            size={320}
            className="animate-in fade-in duration-500 ease-out"
          />
        ) : isSearchArmed && armedChip!.icon.text ? (
          // 다음 등 텍스트 워터마크.
          <span
            key={`wm-${armedChip!.id}`}
            className="text-[320px] font-black leading-none animate-in fade-in duration-500 ease-out"
            style={{ color: armedChip!.ring }}
          >
            {armedChip!.icon.text}
          </span>
        ) : (
          <BrandLogo
            key={brand}
            imgUrl={activeBrand.icon.imgUrl}
            path={activeBrand.icon.path}
            fill={`#${activeBrand.icon.hex}`}
            forceWhite={false}
            size={320}
            className="animate-in fade-in duration-500 ease-out"
          />
        )}
      </div>

      {/* 상단 모드 pill — top-left 코너, 절제된 크기. */}
      <div className="absolute top-4 left-4 z-20">
        {topSlot ??
          (modeLabel && onOpenModeDropdown ? (
            <button
              type="button"
              onClick={onOpenModeDropdown}
              aria-label={`현재 모드: ${modeLabel}. 클릭하면 모드 목록`}
              className={cn(
                'group flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full',
                'text-[11px] font-medium tracking-tight',
                'border transition-all duration-200',
              )}
              style={{
                color: 'var(--hero-fg)',
                backgroundColor: 'var(--hero-accent-soft)',
                borderColor: 'var(--hero-hairline)',
              }}
            >
              <span>{modeLabel}</span>
              <ChevronDown size={11} strokeWidth={2.2} className="opacity-60 group-hover:opacity-100" />
            </button>
          ) : null)}
      </div>

      {/* 중앙 컨텐츠 — 헤드라인 + 입력창. 여백 살짝 여유롭게 (세련되게). */}
      <div className="relative z-10 w-full max-w-[640px] px-6 py-14">
        {/* eyebrow → heading → subtitle — armed 상태에 따라 완전 스왑. */}
        <div className="text-center mb-9">
          {isSearchArmed ? (
            // 검색 armed 시 eyebrow — 단순 라벨 (검색엔진은 모델 개념 없음).
            <p
              key={`${identityKey}-name`}
              className="mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase animate-in fade-in duration-300"
              style={{ color: eyebrowColor }}
            >
              {displayName}
            </p>
          ) : (
            // AI 모드 eyebrow — 모델 셀렉트 트리거 겸용.
            // "GPT · GPT-5.4 ▾" 클릭 → 모델 드롭다운.
            <div
              key={`${identityKey}-name`}
              className="mb-2 flex justify-center animate-in fade-in duration-300"
            >
              <ModelPickerButton
                variant="eyebrow"
                brand={activeBrand}
                selectedModel={model}
                onSelect={setModel}
              />
            </div>
          )}
          <h1
            key={`${identityKey}-heading`}
            className="hero-heading text-[30px] sm:text-[36px] leading-[1.15] font-medium tracking-[-0.02em] animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ color: 'var(--hero-fg)' }}
          >
            {heading}
          </h1>
          <p
            key={`${identityKey}-sub`}
            className="mt-2.5 text-[12.5px] tracking-[-0.005em] animate-in fade-in duration-300"
            style={{ color: 'var(--hero-fg-muted)' }}
          >
            {subheading}
          </p>
        </div>

        {/* 입력창 + 관통 칩 스트립 + 모델 셀렉트 (검색 armed 시 hide). */}
        <HeroInput
          value={value}
          onChange={onChange}
          onSubmit={handleSubmit}
          onAttach={onAttach}
          onImage={onImage}
          onVoice={onVoice}
          placeholder={placeholder}
          disabled={disabled}
          chipStrip={
            <BrandChipStrip
              // 검색 armed 시 AI 칩 highlight 없음 (null 로 전달).
              selectedBrand={isSearchArmed ? null : brand}
              onSelectBrand={handleSelectBrand}
              armedSearch={armed}
              onToggleSearch={handleToggleSearch}
              onOpenBookmarks={onOpenBookmarks}
              onOpenAiPicker={() => setPickerOpen(true)}
            />
          }
          // 모델 셀렉트는 eyebrow 로 이동됨. toolbarRight 는 미사용.
        />

      </div>

      <AiPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedBrand={brand}
        onSelect={(b) => {
          setBrand(b);
          if (armed) disarm();
        }}
      />
    </div>
  );
}

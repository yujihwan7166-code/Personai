/**
 * Genspark-스타일 히어로 v2 — 브랜드 인격 강조 · 컴팩트 프로포션 · 워터마크.
 *
 * v1 대비 변경:
 *   - 헤드라인·서브·placeholder 를 브랜드에서 가져옴 (인격화)
 *   - 워터마크: 브랜드 로고 SVG 를 히어로 뒤에 거대 반투명으로
 *   - 모드 pill 은 top-left 코너로 (헤드라인 방해 X)
 *   - 전체 스케일 다운 (헤드라인 32/38, 입력창 min-h 축소)
 *   - 컨텐츠 최대폭 640px (기존 820)
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
import { HERO_SEARCH_CHIP_BY_ID, buildHeroSearchUrl } from '@/lib/heroSearchChips';

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

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (armedChip && armedChip.external) {
      const url = buildHeroSearchUrl(armedChip.id, trimmed);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onChange('');
        disarm();
        return;
      }
    }
    // 선택된 모델의 id 로 라우팅 (없으면 brand.expertId 폴백).
    onSubmitToAi(brand, model?.id ?? activeBrand.expertId, trimmed);
  };

  // 헤드라인·서브 = 항상 브랜드 카피 (armed 여부와 무관).
  // 유저 피드백: 검색 armed 되어도 헤더는 AI 브랜드가 주인공이어야 함.
  const heading = activeBrand.greeting;
  const subheading = activeBrand.subtitle;
  // placeholder 만 armed 상태 반영 → 시각 힌트 유지하되 정체성은 브랜드로.
  const placeholder = armedChip?.external
    ? `${armedChip.name} 검색어를 입력하고 Enter…`
    : activeBrand.placeholder;

  return (
    <div
      className="hero-brand-canvas relative w-full min-h-full flex flex-col items-center justify-center overflow-hidden"
      data-brand={brand}
    >
      {/* 브랜드 워터마크 — 로고를 히어로 뒤에 거대 반투명으로. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]"
        aria-hidden
        style={{
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
        }}
      >
        <BrandLogo
          key={brand}  // 브랜드 바뀔 때 fade-in 재생
          imgUrl={activeBrand.icon.imgUrl}
          path={activeBrand.icon.path}
          fill={`#${activeBrand.icon.hex}`}
          forceWhite={false}  // 워터마크는 브랜드 원본 컬러 유지 (몰입감)
          size={520}
          className="animate-in fade-in duration-500 ease-out"
        />
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

      {/* 중앙 컨텐츠 — 헤드라인 + 입력창 컴팩트. */}
      <div className="relative z-10 w-full max-w-[640px] px-6 py-12">
        {/* 헤드라인 + 서브카피 — 브랜드마다 다름. */}
        <div className="text-center mb-8">
          {/* 브랜드 이름 eyebrow — 헤드라인 위 작은 브랜드 색 라벨. */}
          <p
            key={`${brand}-name`}
            className="mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase animate-in fade-in duration-300"
            style={{ color: 'var(--hero-accent)' }}
          >
            {activeBrand.name}
          </p>
          <h1
            key={`${brand}-heading`}
            className="hero-heading text-[28px] sm:text-[34px] leading-[1.2] font-semibold tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ color: 'var(--hero-fg)' }}
          >
            {heading}
          </h1>
          <p
            key={`${brand}-sub`}
            className="mt-2 text-[12.5px] tracking-tight animate-in fade-in duration-300"
            style={{ color: 'var(--hero-fg-muted)' }}
          >
            {subheading}
          </p>
        </div>

        {/* 입력창 + 관통 칩 스트립 + 모델 셀렉트. */}
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
              selectedBrand={brand}
              onSelectBrand={setBrand}
              armedSearch={armed}
              onToggleSearch={toggle}
              onOpenBookmarks={onOpenBookmarks}
              onOpenAiPicker={() => setPickerOpen(true)}
            />
          }
          toolbarRight={
            <ModelPickerButton
              brand={activeBrand}
              selectedModel={model}
              onSelect={setModel}
            />
          }
        />

        {/* armed 상태 인디케이터 — 검색으로 라우팅 될 때만 표시.
         * "이 메시지는 AI 로 안 가고 외부 검색으로 갑니다" 를 명확히. */}
        {armedChip?.external && (
          <div
            className="mt-2 flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-medium"
              style={{
                backgroundColor: `${armedChip.ring}22`,
                color: armedChip.ring,
                border: `1px solid ${armedChip.ring}44`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: armedChip.ring }}
              />
              Enter 시 {armedChip.name} 새 탭 · AI 로 안 감
              <button
                type="button"
                onClick={() => disarm()}
                className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="검색 취소"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      <AiPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedBrand={brand}
        onSelect={setBrand}
      />
    </div>
  );
}

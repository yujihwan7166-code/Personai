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
  /**
   * 검색 chip 을 마지막에 눌렀는지 vs AI chip 을 눌렀는지.
   * - true(검색 나중) + armed → 외부 검색 (Naver 새 탭 등)
   * - false(AI 나중) + armed → AI 검색 (선택된 AI 가 검색 컨텍스트로 답변)
   *
   * 유저 규칙: "네이버 누르면 그냥 검색, 이후에 AI 누르면 AI 검색"
   */
  const [searchClickedLast, setSearchClickedLast] = useState(false);

  const activeBrand = BRAND_BY_ID[brand];
  const armedChip = armed ? HERO_SEARCH_CHIP_BY_ID[armed] : null;

  const handleSelectBrand = (b: BrandId) => {
    setBrand(b);
    // AI 를 나중에 누르면 → 검색이 armed 여도 AI 검색 모드로.
    if (armedChip?.external) setSearchClickedLast(false);
  };

  const handleToggleSearch = (id: HeroChipId) => {
    toggle(id);
    setSearchClickedLast(true);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (armedChip && armedChip.external) {
      // 검색을 나중에 눌렀으면 → 외부 검색 새 탭.
      if (searchClickedLast) {
        const url = buildHeroSearchUrl(armedChip.id, trimmed);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          onChange('');
          disarm();
          return;
        }
      } else {
        // AI 를 나중에 눌렀으면 → AI 검색 모드.
        // AI 에게 검색 컨텍스트를 프리픽스로 붙여 전송.
        const searchPrompt =
          `[${armedChip.name} 검색 기반으로 답해주세요]\n${trimmed}`;
        onSubmitToAi(brand, model?.id ?? activeBrand.expertId, searchPrompt);
        onChange('');
        disarm();
        setSearchClickedLast(false);
        return;
      }
    }

    // 기본 AI 채팅.
    onSubmitToAi(brand, model?.id ?? activeBrand.expertId, trimmed);
  };

  // 헤드라인·서브 = 항상 브랜드 카피 (armed 여부와 무관).
  const heading = activeBrand.greeting;
  const subheading = activeBrand.subtitle;
  // placeholder: 외부 검색 · AI 검색 · 기본 AI 채팅 3분기.
  const placeholder = armedChip?.external
    ? searchClickedLast
      ? `${armedChip.name} 검색어를 입력하고 Enter…`
      : `${armedChip.name} 검색 기반으로 ${activeBrand.name}에게 물어보세요`
    : activeBrand.placeholder;

  return (
    <div
      className="hero-brand-canvas relative w-full min-h-full flex flex-col items-center justify-center overflow-hidden"
      // 검색 armed 시 → 그 검색엔진 테마로 morph.
      // 단, AI 를 나중에 눌러 AI 검색 모드가 되면 → 다시 브랜드 테마로 복귀.
      // (검색 칩은 여전히 highlight 유지 = "검색 참조" 힌트)
      data-brand={armedChip?.external && searchClickedLast ? armedChip.id : brand}
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
          size={320}
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
              onSelectBrand={handleSelectBrand}
              armedSearch={armed}
              onToggleSearch={handleToggleSearch}
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

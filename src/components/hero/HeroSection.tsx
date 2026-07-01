/**
 * Genspark-스타일 히어로 섹션 — 브랜드 테마 캔버스 + 헤드라인 + 입력창 (칩 스트립 관통).
 *
 * 마운트 조건 (Index.tsx 에서 판단):
 *   - discussionMode ∈ { general, multi, debate } 그룹
 *   - selectable = true (전문가 선택 단계)
 *
 * 대화 시작 후에도 브랜드 테마는 유지 (data-brand attr 그대로).
 * 실제 라우팅·검색 배선은 Step 4~5 에서 콜백 프롭 통해.
 */
import { useState } from 'react';
import { BRAND_BY_ID, type BrandId } from '@/lib/aiBrands';
import { BrandChipStrip } from './BrandChipStrip';
import { HeroInput } from './HeroInput';
import { AiPickerSheet } from './AiPickerSheet';
import { useSelectedBrand } from '@/hooks/useSelectedBrand';
import { useSearchEngineArm } from '@/hooks/useSearchEngineArm';
import { HERO_SEARCH_CHIP_BY_ID, buildHeroSearchUrl } from '@/lib/heroSearchChips';

interface Props {
  /** 상단 pill (모드 셀렉트 등) — 히어로 최상단에 얹음. */
  topSlot?: React.ReactNode;
  /** 헤드라인 (기본 "무엇을 도와드릴까요?"). */
  heading?: string;
  subheading?: string;
  /** 입력 텍스트 · 컨트롤드 상태. */
  value: string;
  onChange: (v: string) => void;
  /** AI 로 라우팅 (검색 disarm 상태에서 Enter). */
  onSubmitToAi: (brand: BrandId, text: string) => void;
  /** 첨부/이미지/음성 콜백. */
  onAttach?: () => void;
  onImage?: () => void;
  onVoice?: () => void;
  /** 북마크 모달 오픈. */
  onOpenBookmarks: () => void;
  /** 대화가 이미 진행중인지. true 면 아직 disable X, 계속 입력 가능. */
  disabled?: boolean;
}

export function HeroSection({
  topSlot,
  heading = '무엇을 도와드릴까요?',
  subheading = '어떤 AI 든 골라서 물어보세요',
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
  const { armed, toggle, disarm } = useSearchEngineArm();
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeBrand = BRAND_BY_ID[brand];
  const armedChip = armed ? HERO_SEARCH_CHIP_BY_ID[armed] : null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // 검색 armed 상태 → 외부 검색으로 이동.
    if (armedChip && armedChip.external) {
      const url = buildHeroSearchUrl(armedChip.id, trimmed);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        // 검색 후 입력창 비우고 armed 해제.
        onChange('');
        disarm();
        return;
      }
    }

    // 기본: AI 로 라우팅.
    onSubmitToAi(brand, trimmed);
  };

  const placeholder = armedChip?.external
    ? `${armedChip.name}에서 검색…`
    : `${activeBrand.name}에게 무엇이든 물어보세요`;

  return (
    <div
      className="hero-brand-canvas relative w-full min-h-[520px] flex flex-col items-center justify-center px-4 py-16"
      data-brand={brand}
    >
      {/* 상단 슬롯 (모드 pill 등) */}
      {topSlot && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          {topSlot}
        </div>
      )}

      {/* 헤드라인 + 서브카피 */}
      <div className="text-center mb-10 max-w-2xl">
        <h1
          className="hero-heading text-[40px] sm:text-[48px] leading-[1.15] font-semibold tracking-tight"
          style={{ color: 'var(--hero-fg)' }}
        >
          {heading}
        </h1>
        <p
          className="mt-3 text-[15px] sm:text-[16px]"
          style={{ color: 'var(--hero-fg-muted)' }}
        >
          {subheading}
        </p>
      </div>

      {/* 입력창 + 관통 칩 스트립 */}
      <div className="w-full max-w-[820px]">
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
        />
      </div>

      {/* AI 전체 선택 시트 */}
      <AiPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedBrand={brand}
        onSelect={setBrand}
      />
    </div>
  );
}

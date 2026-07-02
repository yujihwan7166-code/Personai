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
import { CustomAiCreatorSheet } from './CustomAiCreatorSheet';
import { BrandLogo } from './BrandLogo';
import { ModelPickerButton } from './ModelPickerButton';
import { useSelectedBrand } from '@/hooks/useSelectedBrand';
import { useSelectedModel } from '@/hooks/useSelectedModel';
import { useSearchEngineArm } from '@/hooks/useSearchEngineArm';
import { useVisibleBrands } from '@/hooks/useVisibleBrands';
import { useVisiblePortals } from '@/hooks/useVisiblePortals';
import { useCustomAis } from '@/hooks/useCustomAis';
import { useCustomPortals } from '@/hooks/useCustomPortals';
import { customAiToBrand, isCustomBrandId, type CustomAi } from '@/lib/customAi';
import { customPortalToChip, type CustomPortal } from '@/lib/customPortal';
import { CustomPortalCreatorSheet } from './CustomPortalCreatorSheet';
import { HERO_SEARCH_CHIP_BY_ID, buildHeroSearchUrl, type HeroChipId } from '@/lib/heroSearchChips';
import { addMemo } from '@/lib/memoStore';
import { taskStore } from '@/services/planner/taskStore';
import { toast } from 'sonner';

type SecretaryTarget = 'memo' | 'schedule' | 'wiki';

const SECRETARY_TARGETS: { id: SecretaryTarget; label: string; emoji: string }[] = [
  { id: 'memo',     label: '메모',   emoji: '📝' },
  { id: 'schedule', label: '일정',   emoji: '📅' },
  { id: 'wiki',     label: '위키',   emoji: '🌐' },
];

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
  disabled,
}: Props) {
  const { brand, setBrand } = useSelectedBrand();
  const { model, setModel } = useSelectedModel(brand);
  const { armed, toggle, disarm } = useSearchEngineArm();
  const { visibleIds, toggleBrand, showAll } = useVisibleBrands();
  const portalsHook = useVisiblePortals();
  const customAisHook = useCustomAis();
  const customPortalsHook = useCustomPortals();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomAi | undefined>();
  const [portalCreatorOpen, setPortalCreatorOpen] = useState(false);
  // 비서 모드 — 클릭 시 히어로가 비서 모드로 morph. AI/검색 과 상호 배타.
  const [secretaryMode, setSecretaryMode] = useState(false);
  const [secretaryTarget, setSecretaryTarget] = useState<SecretaryTarget>('memo');
  const [editingCustomPortal, setEditingCustomPortal] = useState<CustomPortal | undefined>();

  // 커스텀 AI 배열을 Brand 형태로 변환.
  const customBrands = customAisHook.customAis.map(customAiToBrand);
  const customBrandById = new Map(customBrands.map((b) => [b.id, b]));

  // 선택된 브랜드가 커스텀이면 그 값, 아니면 built-in.
  const activeBrand = isCustomBrandId(brand)
    ? customBrandById.get(brand) ?? BRAND_BY_ID.gpt  // 삭제된 커스텀 → GPT 폴백
    : BRAND_BY_ID[brand];
  // 선택된 브랜드가 커스텀이면 systemPrompt 사용.
  const selectedCustom = isCustomBrandId(brand)
    ? customAisHook.customAis.find((c) => c.id === brand)
    : undefined;

  // 커스텀 포탈 chip 배열 및 armed lookup.
  const customPortalChips = customPortalsHook.customPortals.map(customPortalToChip);
  const armedChip = armed
    ? HERO_SEARCH_CHIP_BY_ID[armed]
      ?? customPortalChips.find((c) => c.id === armed)
      ?? null
    : null;
  // 외부 검색 armed 여부 (북마크는 armed 로 취급 X — 즉시 모달).
  const isSearchArmed = !!armedChip?.external;

  // AI 클릭 → armed 검색·비서 모드 해제 (상호 배타).
  const handleSelectBrand = (b: BrandId) => {
    setBrand(b);
    if (armed) disarm();
    if (secretaryMode) setSecretaryMode(false);
  };

  // 검색 클릭 → toggle. 비서 모드는 자동 해제.
  const handleToggleSearch = (id: HeroChipId) => {
    toggle(id);
    if (secretaryMode) setSecretaryMode(false);
  };

  // 비서 chip 클릭 → 비서 모드 토글. AI/검색 armed 해제.
  const handleToggleSecretary = () => {
    setSecretaryMode((prev) => !prev);
    if (armed) disarm();
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // 비서 모드 → 내부 스토어에 저장 (AI 호출 X).
    if (secretaryMode) {
      const target = SECRETARY_TARGETS.find((t) => t.id === secretaryTarget)!;
      try {
        if (secretaryTarget === 'memo') {
          addMemo({ body: trimmed });
        } else if (secretaryTarget === 'schedule') {
          const firstLine = trimmed.split('\n').find((l) => l.trim()) ?? trimmed;
          taskStore.add({ title: firstLine.slice(0, 200) });
        } else {
          // wiki — 우선 메모로 저장 + 위키 마이그레이션 hint.
          // (실제 wiki page 생성은 다음 단계.)
          addMemo({ body: `[위키 초안]\n${trimmed}` });
        }
        toast.success(`${target.emoji} ${target.label}에 저장됨`, {
          description: trimmed.slice(0, 60) + (trimmed.length > 60 ? '…' : ''),
        });
        onChange('');
      } catch {
        toast.error('저장 실패 — 다시 시도해주세요');
      }
      return;
    }

    // 검색 armed → 무조건 외부 새 탭.
    if (armedChip && armedChip.external) {
      // custom portal 은 urlTemplate 이 chip 안에 있고,
      // built-in 은 heroSearchChips 의 buildHeroSearchUrl 로 조립.
      const url = armedChip.urlTemplate
        ? armedChip.urlTemplate.replace('{Q}', encodeURIComponent(trimmed))
        : buildHeroSearchUrl(armedChip.id, trimmed);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onChange('');
        disarm();
        return;
      }
    }

    // AI 채팅.
    // 커스텀 AI 이면 시스템 프롬프트를 앞에 붙여 베이스 모델로 라우팅.
    const routedText = selectedCustom
      ? `[System]\n${selectedCustom.systemPrompt}\n\n[User]\n${trimmed}`
      : trimmed;
    const routedExpertId = selectedCustom
      ? selectedCustom.baseExpertId
      : (model?.id ?? activeBrand.expertId);
    onSubmitToAi(brand, routedExpertId, routedText);
  };

  // 헤드라인·서브·placeholder·eyebrow·워터마크 = 상태에 따라 스왑.
  // 우선순위: 비서 모드 > 검색 armed > AI 브랜드.
  const secretaryTargetObj = SECRETARY_TARGETS.find((t) => t.id === secretaryTarget)!;
  const displayName = secretaryMode
    ? '비서'
    : isSearchArmed
      ? armedChip!.name
      : activeBrand.name;
  const heading = secretaryMode
    ? '무엇을 기록할까요?'
    : isSearchArmed
      ? (armedChip!.greeting ?? `${armedChip!.name}에서 검색해요`)
      : activeBrand.greeting;
  const subheading = secretaryMode
    ? `${secretaryTargetObj.emoji} ${secretaryTargetObj.label}에 자동 저장돼요 · Enter 로 저장`
    : isSearchArmed
      ? (armedChip!.subtitle ?? '검색어를 입력하고 Enter 를 누르면 새 탭에서 열려요')
      : activeBrand.subtitle;
  const placeholder = secretaryMode
    ? '기록할 내용을 입력하세요…'
    : isSearchArmed
      ? (armedChip!.placeholder ?? '검색어를 입력하고 Enter…')
      : activeBrand.placeholder;

  // key · eyebrow 색.
  const identityKey = secretaryMode
    ? `secretary-${secretaryTarget}`
    : isSearchArmed
      ? `search-${armedChip!.id}`
      : `brand-${brand}`;
  const eyebrowColor = secretaryMode
    ? '#A78BFA'  // 비서 바이올렛 (배경 그라디언트에 잘 어울림)
    : isSearchArmed
      ? armedChip!.ring
      : 'var(--hero-accent)';

  return (
    <div
      className="hero-brand-canvas relative w-full min-h-full flex flex-col items-center justify-center overflow-hidden"
      // 비서 모드 > 검색 armed > AI 브랜드 순 우선순위.
      data-brand={secretaryMode ? 'secretary' : isSearchArmed ? armedChip!.id : brand}
    >
      {/* 워터마크 — armed 시 검색엔진 로고, 아니면 브랜드 로고.
       * opacity 는 CSS var 로 브랜드마다 오버라이드 가능 (DeepSeek 은 더 밝게). */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
        style={{
          opacity: 'var(--hero-watermark-opacity, 0.075)',
          maskImage: 'radial-gradient(circle at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 75%)',
        }}
      >
        {secretaryMode ? (
          // 비서 모드 워터마크 — 현재 타겟 이모지 (📝/📅/🌐).
          <span
            key={`wm-secretary-${secretaryTarget}`}
            className="font-black leading-none animate-in fade-in duration-500 ease-out"
            style={{ fontSize: '320px' }}
          >
            {secretaryTargetObj.emoji}
          </span>
        ) : isSearchArmed && armedChip!.icon.path ? (
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
        ) : activeBrand.icon.path || activeBrand.icon.imgUrl ? (
          // path 또는 이미지가 있으면 그걸 워터마크로 (path 우선 · Grok 볼트 등).
          // DeepSeek 은 흰 고래로 강조 (배경 딥블루 위 흰 fill 이 훨씬 뚜렷).
          <BrandLogo
            key={brand}
            imgUrl={activeBrand.icon.imgUrl}
            path={activeBrand.icon.path}
            fill={brand === 'deepseek' ? '#FFFFFF' : `#${activeBrand.icon.hex}`}
            forceWhite={brand === 'deepseek'}
            size={320}
            className="animate-in fade-in duration-500 ease-out"
          />
        ) : activeBrand.icon.text ? (
          // path 도 없고 텍스트만 있는 브랜드(Kimi K · Mistral M 등) — 큰 텍스트 뱃지.
          <span
            key={`wm-${brand}`}
            className="font-black leading-none animate-in fade-in duration-500 ease-out"
            style={{ color: `#${activeBrand.icon.hex}`, fontSize: '320px' }}
          >
            {activeBrand.icon.text}
          </span>
        ) : null}
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

      {/* 중앙 컨텐츠 — 전체 사이즈 up (유저 요청). */}
      <div className="relative z-10 w-full max-w-[760px] px-6 py-16">
        {/* eyebrow → heading → subtitle — armed 상태에 따라 완전 스왑. */}
        <div className="text-center mb-10">
          {secretaryMode ? (
            // 비서 모드 eyebrow — 타겟 선택 (메모/일정/위키) 3-way 토글.
            <div
              key={`${identityKey}-name`}
              className="mb-2 flex justify-center gap-1 animate-in fade-in duration-300"
            >
              {SECRETARY_TARGETS.map((t) => {
                const active = t.id === secretaryTarget;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSecretaryTarget(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-9 px-4 rounded-full',
                      'text-[14px] font-medium transition-all duration-150',
                      'border',
                    )}
                    style={
                      active
                        ? {
                            color: '#FFFFFF',
                            backgroundColor: 'var(--hero-accent)',
                            borderColor: 'var(--hero-accent)',
                          }
                        : {
                            color: 'var(--hero-fg-muted)',
                            backgroundColor: 'transparent',
                            borderColor: 'var(--hero-hairline)',
                          }
                    }
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          ) : isSearchArmed ? (
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
            className="hero-heading text-[36px] sm:text-[44px] leading-[1.15] font-medium tracking-[-0.02em] animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ color: 'var(--hero-fg)' }}
          >
            {heading}
          </h1>
          <p
            key={`${identityKey}-sub`}
            className="mt-3 text-[14.5px] tracking-[-0.005em] animate-in fade-in duration-300"
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
              onOpenPicker={() => setPickerOpen(true)}
              onOpenSecretary={handleToggleSecretary}
              secretaryOpen={secretaryMode}
              visibleBrandIds={visibleIds}
              visiblePortalIds={portalsHook.visibleIds}
              customBrands={customBrands}
              customPortalChips={customPortalChips}
            />
          }
          // 모델 셀렉트는 eyebrow 로 이동됨. toolbarRight 는 미사용.
        />

      </div>

      <AiPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        visibleAiIds={visibleIds}
        onToggleAi={toggleBrand}
        onShowAllAi={showAll}
        visiblePortalIds={portalsHook.visibleIds}
        onTogglePortal={portalsHook.togglePortal}
        onResetPortalDefaults={portalsHook.resetDefaults}
        customAis={customAisHook.customAis}
        onCreateCustom={() => {
          setEditingCustom(undefined);
          setCreatorOpen(true);
        }}
        onEditCustom={(c) => {
          setEditingCustom(c);
          setCreatorOpen(true);
        }}
        onDeleteCustom={(id) => {
          customAisHook.deleteCustomAi(id);
          // 지금 선택된 커스텀이 삭제되면 GPT 로 돌아감.
          if (brand === id) setBrand('gpt');
        }}
        customPortals={customPortalsHook.customPortals}
        onCreateCustomPortal={() => {
          setEditingCustomPortal(undefined);
          setPortalCreatorOpen(true);
        }}
        onEditCustomPortal={(p) => {
          setEditingCustomPortal(p);
          setPortalCreatorOpen(true);
        }}
        onDeleteCustomPortal={(id) => {
          customPortalsHook.deleteCustomPortal(id);
          // 삭제된 armed 포탈은 disarm.
          if (armed === id) disarm();
        }}
      />

      <CustomAiCreatorSheet
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        editing={editingCustom}
        onCreate={(input) => {
          const created = customAisHook.createCustomAi(input);
          // 만든 즉시 선택하도록 브랜드 스위칭.
          setBrand(created.id as BrandId);
        }}
        onUpdate={customAisHook.updateCustomAi}
      />

      <CustomPortalCreatorSheet
        open={portalCreatorOpen}
        onClose={() => setPortalCreatorOpen(false)}
        editing={editingCustomPortal}
        onCreate={(input) => {
          const created = customPortalsHook.createCustomPortal(input);
          // 만든 즉시 스트립에 노출 → visible 목록에 추가.
          if (!portalsHook.visibleIds.includes(created.id as never)) {
            portalsHook.togglePortal(created.id as never);
          }
        }}
        onUpdate={customPortalsHook.updateCustomPortal}
      />

      {/* 비서 시트(v1 플로팅) 는 폐기 — 이제 secretaryMode 로 히어로 자체가 morph. */}
    </div>
  );
}

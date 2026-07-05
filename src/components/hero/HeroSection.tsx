/**
 * Genspark-스타일 히어로 v3 — AI 와 검색엔진 상호 배타 선택.
 *
 * 유저 규칙: "나는 AI 나 검색엔진 중에서 하나만 선택 가능한거야"
 *   → 검색 armed 시 히어로 전체(헤드라인/서브/워터마크/eyebrow/placeholder/모델셀렉트)가
 *     그 검색엔진의 identity 로 완전 스왑.
 *   → AI 칩 클릭 시 검색 armed 는 자동으로 해제.
 *   → AI 칩과 검색 칩은 동시에 highlight 되지 않음.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, Briefcase, CalendarDays, FileText, Globe, Star, Plus,
  MessagesSquare, Layers, Swords, FlaskConical, ShieldCheck, Users,
  Wrench, Gamepad2, BookOpen, Mic, Languages, FileOutput, Clapperboard, Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { MODE_TINT } from '@/components/MainModeTabs';
import type { MainMode } from '@/types/expert';

/* 모드 pill 아이콘 — 현재 모드가 바뀌면 아이콘도 바뀌어 "선택기" 임을 알림. */
const MODE_PILL_ICONS: Partial<Record<MainMode, LucideIcon>> = {
  general: MessagesSquare,
  multi: Layers,
  debate: Swords,
  research_main: FlaskConical,
  premium_main: ShieldCheck,
  stakeholder_main: Users,
  assistant: Wrench,
  player: Gamepad2,
  study_main: BookOpen,
  voice_main: Mic,
  translate_main: Languages,
  convert_main: FileOutput,
  media_main: Clapperboard,
  brainstorm_main: Lightbulb,
};
import { cn } from '@/lib/utils';
import { BRANDS, BRAND_BY_ID, type BrandId } from '@/lib/aiBrands';
import { pickContrastingText } from '@/lib/colorUtils';
import { BrandChipStrip } from './BrandChipStrip';
import { HeroInput } from './HeroInput';
import { AiPickerSheet } from './AiPickerSheet';
import { CustomAiCreatorSheet } from './CustomAiCreatorSheet';
import { BrandLogo } from './BrandLogo';
import { ModelPickerButton, type HeroPickerMode } from './ModelPickerButton';
import { TodayCluster } from './TodayCluster';
import { TodayStrip } from './TodayStrip';
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
import { HERO_SEARCH_CHIPS, HERO_SEARCH_CHIP_BY_ID, buildHeroSearchUrl, type HeroChipId } from '@/lib/heroSearchChips';
import { SECRETARY_SCOPES, buildSecretaryPrompt, type SecretaryScope } from '@/lib/secretaryContext';
import { useChatPrefs, buildDirectives } from '@/lib/chatPrefs';
import { toast } from 'sonner';

interface Props {
  /** 상단 pill (모드 셀렉트 등). topSlot 지정 시 pill 대신 렌더. */
  topSlot?: React.ReactNode;
  /** 모드 pill 라벨 (예: "일반"). */
  modeLabel?: string;
  /** 현재 메인 모드 id — pill 아이콘·틴트용. */
  modeId?: MainMode;
  /** 모드 pill 클릭 시 모드 드롭다운 오픈 콜백. */
  onOpenModeDropdown?: () => void;
  /** 즐겨찾기 칩 줄 — pill 오른쪽에 렌더 (FavoriteChips). */
  favoriteChips?: React.ReactNode;
  /** 기능 레일 — 입력창 아래 카테고리 아이콘 줄 (FeatureRail). AI 기본 모드에서만. */
  featureRail?: React.ReactNode;
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
  modeId,
  onOpenModeDropdown,
  favoriteChips,
  featureRail,
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
  // 비서 = 플래너·메모·위키를 읽고 내 상황에 맞게 답하는 개인 컨텍스트 AI.
  const [secretaryMode, setSecretaryMode] = useState(false);
  const [secretaryScope, setSecretaryScope] = useState<SecretaryScope>('all');
  const [secretaryBusy, setSecretaryBusy] = useState(false);
  const [editingCustomPortal, setEditingCustomPortal] = useState<CustomPortal | undefined>();
  // 입력창 부가기능 — 웹 검색·심층 사고 토글 + 대화 설정 (길이·톤).
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [deepThinkOn, setDeepThinkOn] = useState(false);
  const { prefs: chatPrefs } = useChatPrefs();

  // 모드 pill 발견성 힌트 — 첫 3회 방문 한정 코치마크. 8초 후 자동 숨김,
  // pill 을 한 번이라도 열면 영구 종료 (localStorage).
  const [showModeHint, setShowModeHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.localStorage.getItem('personai.mode_hint_done') === '1') return false;
      const shows = Number(window.localStorage.getItem('personai.mode_hint_shows') || '0');
      if (shows >= 3) return false;
      // 세션당 1회만 카운트 — StrictMode 이중 마운트·리마운트가 예산을 소진하지 않게.
      if (!window.sessionStorage.getItem('personai.mode_hint_counted')) {
        window.localStorage.setItem('personai.mode_hint_shows', String(shows + 1));
        window.sessionStorage.setItem('personai.mode_hint_counted', '1');
      }
      return true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!showModeHint) return undefined;
    const t = window.setTimeout(() => setShowModeHint(false), 8000);
    return () => window.clearTimeout(t);
  }, [showModeHint]);
  const dismissModeHint = () => {
    setShowModeHint(false);
    try {
      window.localStorage.setItem('personai.mode_hint_done', '1');
    } catch {
      /* noop */
    }
  };
  // 호버 프리뷰 — pill 에 260ms 머물면 메뉴가 미리 열림 (Arc 감성, 실수 오픈 방지 딜레이).
  const pillHoverTimerRef = useRef<number | null>(null);
  const openModeMenu = () => {
    dismissModeHint();
    onOpenModeDropdown?.();
  };

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

  // armed 사이트 홈 URL — 검색 URL 의 origin 추출 (2026-07-05: 검색 없이
  // 그 사이트로 바로 이동하는 진입로 3종에서 공용).
  const armedHomeUrl = (() => {
    if (!armedChip?.external) return null;
    try {
      const sample = armedChip.urlTemplate
        ? armedChip.urlTemplate.replace('{Q}', 'a')
        : buildHeroSearchUrl(armedChip.id, 'a');
      if (!sample) return null;
      const u = new URL(sample);
      // 검색 전용 서브도메인은 실제 홈으로 (search.naver.com → www.naver.com).
      return `${u.protocol}//${u.hostname.replace(/^search\./, 'www.')}`;
    } catch {
      return null;
    }
  })();
  const openArmedHome = () => {
    if (armedHomeUrl) window.open(armedHomeUrl, '_blank', 'noopener,noreferrer');
  };

  // AI 클릭 → armed 검색·비서 모드 해제 (상호 배타).
  const handleSelectBrand = (b: BrandId) => {
    setBrand(b);
    if (armed) disarm();
    if (secretaryMode) setSecretaryMode(false);
  };

  // 칩모드/선택모드 — 칩모드는 입력창 위 스트립, 선택모드는 eyebrow 드롭다운에서
  // AI·브라우저 전체 선택 (스트립 숨김). 드롭다운 우측 상단 토글로 전환.
  const [pickerMode, setPickerMode] = useState<HeroPickerMode>(() => {
    try {
      return window.localStorage.getItem('personai.hero.picker_mode') === 'select' ? 'select' : 'chips';
    } catch {
      return 'chips';
    }
  });
  const changePickerMode = (m: HeroPickerMode) => {
    setPickerMode(m);
    try {
      window.localStorage.setItem('personai.hero.picker_mode', m);
    } catch {
      /* noop */
    }
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

  /* 선택 패널 — eyebrow 드롭다운. 순서: 브라우저 → AI → (모델 리스트는
   * ModelPickerButton 쪽). 아이콘 클릭 = 화면 전환 (패널 닫힘),
   * 우상단 별 = 입력창 위 칩 스트립에 표시할지 토글 (data-keep-open, 안 닫힘). */
  const selectCell = (opts: {
    key: string;
    name: string;
    active: boolean;
    starred?: boolean;
    onPick: () => void;
    onStar?: () => void;
    circle: React.ReactNode;
    /** true 면 클릭해도 패널 유지 (AI 전환 → 아래 모델 이어서 고르기). */
    keepOpen?: boolean;
  }) => (
    <div key={opts.key} className="group/cell relative">
      <button
        type="button"
        title={opts.name}
        onClick={opts.onPick}
        {...(opts.keepOpen ? { 'data-keep-open': true } : {})}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 transition-colors hover:bg-black/[0.04]',
          opts.active && 'bg-black/[0.05]',
        )}
      >
        {opts.circle}
        <span className="max-w-full truncate text-[9.5px] font-medium leading-none text-[#4b4f56]">{opts.name}</span>
      </button>
      {opts.onStar && (
        <button
          type="button"
          data-keep-open
          onClick={(e) => { e.stopPropagation(); opts.onStar!(); }}
          aria-pressed={opts.starred}
          aria-label={opts.starred ? `${opts.name} 칩에서 제거` : `${opts.name} 칩에 추가`}
          title={opts.starred ? '칩에서 제거' : '칩에 추가'}
          className={cn(
            'absolute right-0 top-0 rounded p-0.5 transition-all duration-100',
            opts.starred
              ? 'opacity-100 text-amber-400'
              : 'opacity-0 group-hover/cell:opacity-100 text-slate-300 hover:text-amber-400',
          )}
        >
          <Star size={10} className={opts.starred ? 'fill-amber-400' : undefined} />
        </button>
      )}
    </div>
  );

  const selectSection = (
    <div className="px-1 pb-0.5">
      {/* '브라우저' 라벨은 패널 헤더가 담당 (ModelPickerButton, 2026-07-05). */}
      <div className="grid grid-cols-12 gap-0.5">
        {HERO_SEARCH_CHIPS.map((c) =>
          selectCell({
            key: c.id,
            name: c.name,
            active: armed === c.id,
            // 브라우저도 패널 유지 — 클릭 즉시 뒤 배경이 그 브라우저로 morph.
            keepOpen: true,
            starred: portalsHook.visibleIds.includes(c.id),
            onPick: () => handleToggleSearch(c.id),
            onStar: () => portalsHook.togglePortal(c.id),
            circle: (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: c.circleBg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                {c.icon.kind === 'svg' && c.icon.path ? (
                  <svg viewBox="0 0 24 24" width={17} height={17} fill={c.iconFill} aria-hidden>
                    <path d={c.icon.path} />
                  </svg>
                ) : (
                  <span className="text-[12px] font-bold leading-none" style={{ color: c.iconFill }}>
                    {c.icon.text ?? c.name.charAt(0)}
                  </span>
                )}
              </span>
            ),
          }),
        )}
      </div>
      {/* 구분선 — 브라우저 ↕ (AI + 모델) 위계. 더 또렷하게 (2026-07-05). */}
      <div className="my-2.5 h-px bg-black/[0.12]" />
      <div className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-[#9aa0a8]">AI</div>
      <div className="grid grid-cols-12 gap-0.5">
        {[...BRANDS, ...customBrands].map((b) =>
          selectCell({
            key: b.id,
            name: b.name,
            active: !armed && !secretaryMode && brand === b.id,
            // AI 클릭 = 전환하되 패널 유지 — 아래 모델 리스트가 새 브랜드로 갱신됨.
            keepOpen: true,
            // 커스텀 AI 는 스트립 상시 노출이라 별 없음.
            starred: isCustomBrandId(b.id) ? undefined : visibleIds.includes(b.id),
            onPick: () => handleSelectBrand(b.id),
            onStar: isCustomBrandId(b.id) ? undefined : () => toggleBrand(b.id),
            circle: (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `#${b.icon.hex}`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                <BrandLogo
                  imgUrl={b.icon.imgUrl}
                  path={b.icon.path}
                  text={b.icon.text}
                  fill={pickContrastingText(`#${b.icon.hex}`)}
                  forceWhite={pickContrastingText(`#${b.icon.hex}`) === '#ffffff'}
                  size={Math.round(17 * (b.icon.logoScale ?? 1))}
                />
              </span>
            ),
          }),
        )}
        {/* 비서 셀 — AI 그리드 안으로 편입 (2026-07-05, 별도 버튼 행 제거). */}
        {selectCell({
          key: 'secretary',
          name: '비서',
          active: secretaryMode,
          onPick: handleToggleSecretary,
          circle: (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: '#475569', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
            >
              <Briefcase size={15} strokeWidth={2} color="#ffffff" />
            </span>
          ),
        })}
        {/* + 셀 — AI 그리드 맨 끝, 커스텀 AI 생성 (2026-07-05). */}
        <button
          type="button"
          title="커스텀 AI 만들기"
          aria-label="커스텀 AI 만들기"
          onClick={() => {
            setEditingCustom(undefined);
            setCreatorOpen(true);
          }}
          className="flex w-full flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 transition-colors hover:bg-black/[0.04]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-black/20 text-[#9aa0a8]">
            <Plus size={15} strokeWidth={2.2} />
          </span>
          <span className="max-w-full truncate text-[9.5px] font-medium leading-none text-[#9aa0a8]">추가</span>
        </button>
      </div>
      {/* AI 와 모델 리스트 사이엔 선 없음 — 한 묶음 (2026-07-05 위계 피드백). */}
    </div>
  );

  /* 음성 입력 (dictation) — Web Speech API, 결과를 입력창에 이어붙임.
   * 라이브 음성 대화(P1-9)와 별개의 가벼운 받아쓰기. */
  const handleVoiceInput = () => {
    type SRCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as { webkitSpeechRecognition?: SRCtor; SpeechRecognition?: SRCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast('이 브라우저는 음성 입력을 지원하지 않아요');
      return;
    }
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      if (t) onChange(value ? `${value} ${t}` : t);
    };
    rec.onerror = () => toast('음성 인식에 실패했어요 — 다시 시도해주세요');
    rec.start();
    toast('듣고 있어요 — 말씀하세요');
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // 부가기능 지시문 — 웹 검색·심층 사고·대화 설정(길이·톤).
    const directives = buildDirectives({
      webSearch: webSearchOn,
      deepThink: deepThinkOn,
      prefs: chatPrefs,
    });
    const directiveSuffix = directives.length > 0
      ? `\n\n[요청 사항]\n${directives.map((d) => `- ${d}`).join('\n')}`
      : '';

    // 비서 모드 → 플래너·메모·위키 컨텍스트를 조립해 AI 에게 질문.
    if (secretaryMode) {
      if (secretaryBusy) return;
      setSecretaryBusy(true);
      try {
        const prompt = await buildSecretaryPrompt(secretaryScope, trimmed);
        onChange('');
        onSubmitToAi(brand, model?.id ?? activeBrand.expertId, prompt + directiveSuffix);
      } catch {
        toast.error('개인 데이터를 읽지 못했어요 — 다시 시도해주세요');
      } finally {
        setSecretaryBusy(false);
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
    onSubmitToAi(brand, routedExpertId, routedText + directiveSuffix);
  };

  // 헤드라인·서브·placeholder·eyebrow·워터마크 = 상태에 따라 스왑.
  // 우선순위: 비서 모드 > 검색 armed > AI 브랜드.
  const secretaryScopeObj = SECRETARY_SCOPES.find((s) => s.id === secretaryScope)!;
  const scopeLabel = secretaryScope === 'all'
    ? '플래너·메모·위키'
    : secretaryScopeObj.label;
  const displayName = secretaryMode
    ? '비서'
    : isSearchArmed
      ? armedChip!.name
      : activeBrand.name;
  const heading = secretaryMode
    ? '무엇을 챙겨드릴까요?'
    : isSearchArmed
      ? (armedChip!.greeting ?? `${armedChip!.name}에서 검색해요`)
      : activeBrand.greeting;
  const subheading = secretaryMode
    ? `${scopeLabel}를 읽고 내 상황에 맞게 답해요 · Gemini 2.5 Flash Lite`
    : isSearchArmed
      ? (armedChip!.subtitle ?? '검색어를 입력하고 Enter')
      : activeBrand.subtitle;
  const placeholder = secretaryMode
    ? (secretaryBusy ? '내 데이터를 읽는 중…' : '내 일정·메모·위키에 대해 물어보세요…')
    : isSearchArmed
      ? (armedChip!.placeholder ?? '검색어를 입력하고 Enter…')
      : activeBrand.placeholder;

  // key · eyebrow 색.
  const identityKey = secretaryMode
    ? `secretary-${secretaryScope}`
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
      {/* 살아있는 배경 — 브랜드 accent glow 가 천천히 떠다님. */}
      <div className="hero-living-glow" aria-hidden />

      {/* 브랜드 FX — 브랜드마다 고유 모션 요소 (스캔라인·유성·기포·바람 등).
       * 효과 정의는 brand-themes.css 의 [data-brand] .hero-fx 스코프.
       * hero-fx2 = 보조 레이어 (브랜드당 모션 슬롯 2 → 4개). */}
      <div className="hero-fx" aria-hidden />
      <div className="hero-fx2" aria-hidden />

      {/* 워터마크 — 기본 숨김 (2026-07-03 유저 피드백: 정중앙 로고 불필요,
       * 배경 색·패턴·모션만으로 브랜드 느낌 전달). 특정 브랜드가 원하면
       * CSS 에서 --hero-watermark-opacity 로 opt-in 가능. */}
      <div
        className="hero-watermark-float pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
        style={{
          opacity: 'var(--hero-watermark-opacity, 0)',
          maskImage: 'radial-gradient(circle at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 75%)',
        }}
      >
        {secretaryMode ? (
          // 비서 모드 워터마크 — 현재 소스 이모지 (💼/📅/📝/🌐).
          <span
            key={`wm-secretary-${secretaryScope}`}
            className="font-black leading-none animate-in fade-in duration-500 ease-out"
            style={{ fontSize: '320px' }}
          >
            {secretaryScopeObj.emoji}
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

      {/* 상단 모드 pill — top-left 코너, 절제된 크기.
       * 발견성: 첫 3회 방문 한정 코치마크 + 액센트 링 (열어보면 영구 종료). */}
      <div className="absolute top-4 left-4 z-20">
        {topSlot ??
          (modeLabel && onOpenModeDropdown ? (
            <>
              {/* 글래스 캡슐 바 — pill + 즐겨찾기 칩이 한 용기 안 세그먼트로.
               * 개별 틴트 pill 나열은 색 블롭처럼 보여서 폐기 (2026-07-04 피드백). */}
              <div
                className="flex w-max max-w-[calc(100vw-160px)] items-center gap-0.5 rounded-full border p-1"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 78%, transparent)',
                  borderColor: 'var(--hero-hairline)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                  boxShadow: '0 4px 16px -10px rgba(0,0,0,0.18)',
                }}
              >
              <button
                type="button"
                data-mode-anchor
                onClick={openModeMenu}
                onMouseEnter={() => {
                  pillHoverTimerRef.current = window.setTimeout(openModeMenu, 260);
                }}
                onMouseLeave={() => {
                  if (pillHoverTimerRef.current) {
                    window.clearTimeout(pillHoverTimerRef.current);
                    pillHoverTimerRef.current = null;
                  }
                }}
                aria-label={`현재 모드: ${modeLabel}. 클릭하면 모드 목록`}
                className={cn(
                  'group flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full shrink-0',
                  'text-[12.5px] font-semibold tracking-tight',
                  'transition-colors duration-150',
                )}
                style={{
                  color: 'var(--hero-fg)',
                  backgroundColor: modeId
                    ? `color-mix(in oklab, ${MODE_TINT[modeId]} 10%, transparent)`
                    : 'var(--hero-accent-soft)',
                  boxShadow: showModeHint
                    ? '0 0 0 2px var(--hero-ring), 0 4px 14px -6px var(--hero-accent-soft)'
                    : undefined,
                }}
              >
                {modeId && MODE_PILL_ICONS[modeId] && (() => {
                  const PillIcon = MODE_PILL_ICONS[modeId]!;
                  return <PillIcon size={14} strokeWidth={2} style={{ color: MODE_TINT[modeId] }} />;
                })()}
                <span>{modeLabel}</span>
                <ChevronDown size={14} strokeWidth={2.2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
              {favoriteChips}
              </div>
              {showModeHint && (
                <div
                  className="mt-2 w-max max-w-[240px] rounded-xl border px-3 py-2 text-[11.5px] leading-snug animate-in fade-in slide-in-from-top-1 duration-300"
                  style={{
                    color: 'var(--hero-fg)',
                    backgroundColor: 'var(--hero-input-bg, #ffffff)',
                    borderColor: 'var(--hero-hairline)',
                    boxShadow: '0 8px 24px -12px rgba(0,0,0,0.25)',
                  }}
                  role="status"
                >
                  <span className="font-semibold" style={{ color: 'var(--hero-accent)' }}>모드 전환</span>
                  {' — 토론·리서치·스튜디오·라이프도 여기 있어요'}
                </div>
              )}
            </>
          ) : null)}
      </div>

      {/* 우상단 오늘 클러스터 — 좌상단 캡슐과 대칭, 제로클릭 정보층 (시계·날씨·미세먼지). */}
      <div className="absolute top-4 right-4 z-20 hidden md:block">
        <TodayCluster />
      </div>

      {/* 중앙 컨텐츠 — 전체 사이즈 up (유저 요청). */}
      <div className="relative z-10 w-full max-w-[760px] px-6 py-16">
        {/* eyebrow → heading → subtitle — armed 상태에 따라 완전 스왑.
         * eyebrow 는 고정 높이 래퍼 — AI(픽커 버튼 42px)/브라우저(텍스트 18px) 간
         * 높이 차로 화면 전체가 위아래로 밀리던 문제 방지 (2026-07-05). */}
        <div className="text-center mb-10">
          <div className="relative z-30 mb-2 flex h-[44px] items-center justify-center">
          {secretaryMode ? (
            // 비서 모드 eyebrow — 어떤 데이터를 읽을지 소스 선택 (전체/플래너/메모/위키).
            // 이모지 대신 lucide 아이콘 — 컨시어지 무드에 맞게 절제 (2026-07-04 피드백).
            <div
              key={`${identityKey}-name`}
              className="flex justify-center gap-1 animate-in fade-in duration-300"
            >
              {SECRETARY_SCOPES.map((s) => {
                const active = s.id === secretaryScope;
                const ScopeIcon: LucideIcon =
                  s.id === 'planner' ? CalendarDays : s.id === 'memo' ? FileText : s.id === 'wiki' ? Globe : Briefcase;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSecretaryScope(s.id)}
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
                    <ScopeIcon size={14} strokeWidth={1.9} className="shrink-0 opacity-85" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          ) : isSearchArmed ? (
            // armed — 라벨도 항상 픽커 트리거 (패널 = 전환 허브, 2026-07-05 재정의).
            // key 없음 — armed↔AI 전환 시 픽커가 리마운트되지 않게 (패널 유지).
            // ↗ eyebrow 버튼은 제거 (2026-07-05) — 이동은 서브카피 링크·칩 재클릭으로.
            <div className="flex items-center justify-center gap-1">
              <ModelPickerButton
                variant="eyebrow"
                brand={activeBrand}
                selectedModel={model}
                onSelect={setModel}
                pickerMode={pickerMode}
                onPickerModeChange={changePickerMode}
                selectSection={selectSection}
                displayOverride={{ label: displayName }}
              />
            </div>
          ) : (
            // AI 모드 eyebrow — 클릭하면 항상 선택 패널 (브라우저 → AI → 모델).
            // key 없음 — 브랜드 전환 시 리마운트되면 열린 패널이 닫혀버림.
            // 이름 재등장 애니메이션은 ModelPickerButton 내부 span key 로.
            <div className="flex justify-center">
              <ModelPickerButton
                variant="eyebrow"
                brand={activeBrand}
                selectedModel={model}
                onSelect={setModel}
                pickerMode={pickerMode}
                onPickerModeChange={changePickerMode}
                selectSection={selectSection}
              />
            </div>
          )}
          </div>
          <h1
            key={`${identityKey}-heading`}
            className="hero-heading text-[36px] sm:text-[44px] leading-[1.15] font-medium tracking-[-0.02em] animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ color: 'var(--hero-fg)' }}
          >
            {heading}
          </h1>
          {/* 서브카피 — AI 모드에선 숨김 (2026-07-05). 검색(armed)·비서 모드는
           * 각각 검색엔진·비서 설명이라 유지, armed 는 도메인 바로가기 링크 포함. */}
          {(secretaryMode || isSearchArmed) && (
            <p
              key={`${identityKey}-sub`}
              className="mt-3 text-[14.5px] tracking-[-0.005em] animate-in fade-in duration-300"
              style={{ color: 'var(--hero-fg-muted)' }}
            >
              {subheading}
              {isSearchArmed && armedHomeUrl && (
                <button
                  type="button"
                  onClick={openArmedHome}
                  className="ml-2 font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--hero-accent)' }}
                >
                  {new URL(armedHomeUrl).host.replace(/^www\./, '')} ↗
                </button>
              )}
            </p>
          )}
        </div>

        {/* 입력창 + 관통 칩 스트립 + 모델 셀렉트 (검색 armed 시 hide). */}
        <HeroInput
          value={value}
          onChange={onChange}
          onSubmit={() => { void handleSubmit(); }}
          onAttach={onAttach}
          onImage={onImage}
          onVoice={onVoice ?? handleVoiceInput}
          placeholder={placeholder}
          disabled={disabled || secretaryBusy}
          webSearchOn={webSearchOn}
          onToggleWebSearch={() => setWebSearchOn((v) => !v)}
          deepThinkOn={deepThinkOn}
          onToggleDeepThink={() => setDeepThinkOn((v) => !v)}
          onOpenModeMenu={onOpenModeDropdown ? openModeMenu : undefined}
          chipStrip={
            // 선택모드는 스트립 숨김 (선택은 eyebrow 패널에서) — 비서 모드는
            // 스트립이 유일한 복귀 경로라 항상 유지.
            pickerMode === 'select' && !secretaryMode ? undefined : (
            <BrandChipStrip
              // 검색 armed 시 AI 칩 highlight 없음 (null 로 전달).
              selectedBrand={isSearchArmed ? null : brand}
              onSelectBrand={handleSelectBrand}
              armedSearch={armed}
              // armed 칩 재클릭 = 그 사이트 홈으로 이동 (2026-07-05, 해제는
              // 패널 셀 재클릭 또는 AI 선택으로). 나머지는 기존 토글.
              onToggleSearch={(id) => {
                if (armed === id && armedHomeUrl) {
                  openArmedHome();
                  return;
                }
                handleToggleSearch(id);
              }}
              // + 칩 제거 — 칩 구성은 eyebrow 패널 별 토글로 (2026-07-05).
              onOpenSecretary={handleToggleSecretary}
              secretaryOpen={secretaryMode}
              visibleBrandIds={visibleIds}
              visiblePortalIds={portalsHook.visibleIds}
              customBrands={customBrands}
              customPortalChips={customPortalChips}
            />
            )
          }
          // 모델 셀렉트는 eyebrow 로 이동됨. toolbarRight 는 미사용.
        />

        {/* 기능 레일 — AI·브라우저 공통 (비서 모드만 집중 경험이라 제외).
         * 브라우저에도 노출 + 두 상태 간 높이 동일 → 전환 시 화면 안 밀림. */}
        {!secretaryMode && featureRail}

        {/* 오늘 스트립 — 내 상태 한 줄 (일정·할일·브리핑·이어가기). */}
        {!secretaryMode && <TodayStrip />}

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

/**
 * 다중 AI 히어로 — general 히어로와 같은 문법, 칩 스트립만 다중선택 (최대 3개).
 *
 *   [모드 pill]                              ← 좌상단 (general 과 동일)
 *   ┌─── GPT 캔버스 ──┬── Claude 캔버스 ──┬── Gemini 캔버스 ───┐  ← 분할 배경
 *   │   [GPT-5.4 ▾] [Claude Opus 4.6 ▾] [Gemini 3.1 Pro ▾]     │  ← 모델 픽커 칩
 *   │        여러 AI에게 동시에 물어보세요                        │
 *   │   ──(GPT)(Claude)(Gemini)(Grok)…──   ← 다중선택 스트립     │
 *   │   [ HeroInput 글래스 입력창 ]                              │
 *   └───────────────────────────────────────────────────────────┘
 *
 * - 분할 배경: 선택된 브랜드 수만큼 세로 칼럼 — 각 칼럼이 그 브랜드의
 *   실제 hero-brand-canvas (색·mesh·패턴). 중앙 라이트 베일로 가독성 확보.
 * - 3개 초과 선택 시 가장 오래된 선택과 교체 · 최소 1개 유지.
 * - AI 별 모델 선택 (eyebrow 픽커 칩) — localStorage 기억.
 * - 전송 시 기존 multi 파이프라인 실행 — 채팅 화면은 불변.
 */
import { useEffect, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, BRAND_BY_ID, type Brand, type BrandId, type BrandModel } from '@/lib/aiBrands';
import { AiBrandChip } from './AiBrandChip';
import { BrandLogo } from './BrandLogo';
import { HeroInput } from './HeroInput';
import { MODE_TINT } from '@/components/MainModeTabs';
import { pickContrastingText } from '@/lib/colorUtils';

/* 브랜드 액센트 (brand-themes.css 의 --sb-accent 와 동일 값) — 선택 반응 글로우용. */
const BRAND_ACCENT: Partial<Record<BrandId, string>> = {
  gpt: '#0d1117',
  claude: '#d97757',
  gemini: '#6a52e0',
  perplexity: '#20808d',
  grok: '#17181c',
  deepseek: '#4d6bfe',
  kimi: '#8b6ef5',
  qwen: '#615ced',
  llama: '#3d7bff',
  nemotron: '#76b900',
  command: '#39594d',
  mistral: '#ea5810',
  minimax: '#2b4bdb',
};

const SELECTED_KEY = 'personai.multi.selected_brands';
const MODELS_KEY = 'personai.multi.selected_models';
const MAX_PICK = 3;
const DEFAULT_PICK: BrandId[] = ['gpt', 'claude', 'gemini'];

function readSelected(): BrandId[] {
  try {
    const raw = window.localStorage.getItem(SELECTED_KEY);
    if (!raw) return DEFAULT_PICK;
    const parsed = (JSON.parse(raw) as string[]).filter(
      (id): id is BrandId => !!BRAND_BY_ID[id as BrandId],
    );
    return parsed.length > 0 ? parsed.slice(0, MAX_PICK) : DEFAULT_PICK;
  } catch {
    return DEFAULT_PICK;
  }
}

function readModels(): Partial<Record<BrandId, string>> {
  try {
    const raw = window.localStorage.getItem(MODELS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<BrandId, string>>) : {};
  } catch {
    return {};
  }
}

/** 브랜드의 현재 선택 모델 — 저장값이 유효하면 그 모델, 아니면 기본. */
function resolveModel(brand: Brand, stored?: string): BrandModel {
  return (
    brand.models.find((m) => m.id === stored) ??
    brand.models.find((m) => m.isDefault) ??
    brand.models[0] ??
    { id: brand.expertId, name: brand.name }
  );
}

interface Props {
  modeLabel: string;
  onOpenModeDropdown: () => void;
  value: string;
  onChange: (v: string) => void;
  /** 선택된 expert id 배열 + 질문 텍스트로 multi 실행. */
  onSubmit: (expertIds: string[], text: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export function MultiHero({
  modeLabel,
  onOpenModeDropdown,
  value,
  onChange,
  onSubmit,
  onAttach,
  disabled,
}: Props) {
  const [selected, setSelected] = useState<BrandId[]>(readSelected);
  const [modelByBrand, setModelByBrand] = useState<Partial<Record<BrandId, string>>>(readModels);
  const [openPicker, setOpenPicker] = useState<BrandId | null>(null);

  // 모델 드롭다운 — 바깥 클릭 · ESC 로 닫기.
  useEffect(() => {
    if (!openPicker) return;
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-multi-model-picker]')) return;
      setOpenPicker(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPicker(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openPicker]);

  const persistSelected = (next: BrandId[]) => {
    setSelected(next);
    try {
      window.localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const persistModel = (brandId: BrandId, modelId: string) => {
    const next = { ...modelByBrand, [brandId]: modelId };
    setModelByBrand(next);
    try {
      window.localStorage.setItem(MODELS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const toggle = (id: BrandId) => {
    if (selected.includes(id)) {
      // 마지막 하나는 해제 불가 — 최소 1개 유지.
      if (selected.length <= 1) return;
      persistSelected(selected.filter((s) => s !== id));
      return;
    }
    // 꽉 찼으면 가장 오래된 선택과 교체.
    persistSelected(selected.length >= MAX_PICK ? [...selected.slice(1), id] : [...selected, id]);
  };

  const selectedBrands = selected.map((id) => BRAND_BY_ID[id]).filter(Boolean);
  const expertIds = selectedBrands.map((b) => resolveModel(b, modelByBrand[b.id]).id);
  const canSubmit = value.trim().length > 0 && expertIds.length > 0;

  const subCopy =
    selected.length >= 3
      ? '세 답변이 나란히 도착해요 — 비교하고 좋은 것만 가져가세요'
      : selected.length === 2
        ? '2개 선택됨 — 하나 더 고르면 비교가 더 풍성해져요'
        : '아래 스트립에서 최대 3개까지 골라보세요';

  const tint = MODE_TINT.multi;

  return (
    <div className="relative flex min-h-full w-full items-center justify-center overflow-hidden">
      {/* 선택 반응 글로우 — 분할 대신, 통합 스펙트럼 캔버스 위에 선택된 브랜드
       * 액센트색 글로우 3개가 각자 자리에서 은은하게 (좌상·우상·하단 중앙).
       * 배경은 한 장면으로 차분하고, 선택 변화는 색으로만 반응. */}
      <div
        key={selected.join('.')}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 animate-in fade-in duration-700"
        style={{
          background: selectedBrands
            .map((b, i) => {
              const pos = ['16% 22%', '84% 22%', '50% 88%'][i] ?? '50% 50%';
              return `radial-gradient(42% 36% at ${pos}, ${BRAND_ACCENT[b.id] ?? '#6a5ae8'}1e, transparent 70%)`;
            })
            .join(', '),
        }}
      />

      {/* 상단 모드 pill — general 히어로와 동일 문법 (아이콘 + 틴트). */}
      <div className="absolute top-4 left-4 z-20">
        <button
          type="button"
          onClick={onOpenModeDropdown}
          aria-label={`현재 모드: ${modeLabel}. 클릭하면 모드 목록`}
          className={cn(
            'group flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full',
            'text-[13px] font-semibold tracking-tight',
            'border transition-all duration-200 hover:-translate-y-px',
          )}
          style={{
            color: '#1e2235',
            backgroundColor: `color-mix(in oklab, ${tint} 10%, #ffffff)`,
            borderColor: `color-mix(in oklab, ${tint} 36%, transparent)`,
          }}
        >
          <Layers size={14} strokeWidth={2} style={{ color: tint }} />
          <span>{modeLabel}</span>
          <ChevronDown size={14} strokeWidth={2.2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[760px] px-6 py-16">
        <div className="text-center mb-10">
          {/* eyebrow — 선택 AI 별 모델 픽커 칩 (클릭 → 모델 드롭다운). */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 hero-name-in">
            {selectedBrands.map((b, idx) => {
              const model = resolveModel(b, modelByBrand[b.id]);
              const bg = `#${b.icon.hex}`;
              const logoTone = pickContrastingText(bg);
              const hasChoice = b.models.length > 1;
              const open = openPicker === b.id;
              return (
                <div key={b.id} className="flex items-center gap-2">
                  {/* 매치업 프레이밍 — 칩 사이 vs. */}
                  {idx > 0 && (
                    <span className="select-none text-[11px] font-black uppercase tracking-wide text-slate-500">
                      vs
                    </span>
                  )}
                <div className="relative" data-multi-model-picker>
                  <button
                    type="button"
                    onClick={() => hasChoice && setOpenPicker(open ? null : b.id)}
                    disabled={!hasChoice}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    title={hasChoice ? `${b.name} 모델 변경` : b.name}
                    className={cn(
                      'inline-flex items-center gap-2 h-10 pl-2 pr-2.5 rounded-full border-[1.5px]',
                      'bg-white text-[13.5px] font-bold text-slate-800',
                      'transition-all duration-150',
                      hasChoice && 'hover:-translate-y-px hover:shadow-md',
                      !hasChoice && 'cursor-default',
                    )}
                    style={{
                      borderColor: `${BRAND_ACCENT[b.id] ?? '#6a5ae8'}55`,
                      boxShadow: `0 3px 12px -5px ${BRAND_ACCENT[b.id] ?? '#6a5ae8'}66, 0 1px 3px rgba(15,23,42,0.06)`,
                    }}
                  >
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full shrink-0"
                      style={{ backgroundColor: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                    >
                      <BrandLogo
                        imgUrl={b.icon.imgUrl}
                        path={b.icon.path}
                        text={b.icon.text}
                        fill={logoTone}
                        forceWhite={logoTone === '#ffffff'}
                        size={Math.round(14 * (b.icon.logoScale ?? 1))}
                      />
                    </span>
                    <span className="max-w-[160px] truncate">{model.name}</span>
                    {hasChoice && (
                      <ChevronDown
                        size={14}
                        className={cn('opacity-50 transition-transform', open && 'rotate-180')}
                      />
                    )}
                  </button>

                  {open && (
                    <div
                      role="menu"
                      className={cn(
                        'absolute top-full left-1/2 z-50 mt-2 w-[240px] -translate-x-1/2',
                        'rounded-xl border border-slate-200 bg-white p-1.5 text-left',
                        'shadow-[0_18px_44px_-16px_rgba(15,23,42,0.30)]',
                        'animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150',
                      )}
                    >
                      {b.models.map((m) => {
                        const active = m.id === model.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              persistModel(b.id, m.id);
                              setOpenPicker(null);
                            }}
                            className={cn(
                              'flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5',
                              'hover:bg-slate-50 transition-colors',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-opacity',
                                active ? 'opacity-100' : 'opacity-0',
                              )}
                              style={{ backgroundColor: bg }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-medium text-slate-800">
                                {m.name}
                              </span>
                              {m.description && (
                                <span className="block truncate text-[10.5px] text-slate-400">
                                  {m.description}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </div>

          <h1 className="hero-heading text-[36px] sm:text-[44px] leading-[1.15] font-medium tracking-[-0.02em] text-[#1e2235] animate-in fade-in slide-in-from-bottom-1 duration-300">
            여러 AI에게 동시에 물어보세요
          </h1>
          <p key={selected.length} className="mt-3 text-[14.5px] tracking-[-0.005em] text-[#62687f] animate-in fade-in duration-300">
            {subCopy}
          </p>
        </div>

        {/* 입력창 + 관통 다중선택 스트립 — AI 전체 노출. */}
        <HeroInput
          value={value}
          onChange={onChange}
          onSubmit={() => {
            if (!canSubmit) return;
            onSubmit(expertIds, value.trim());
          }}
          onAttach={onAttach}
          placeholder={`${selected.length}개 AI 가 같은 질문에 동시에 답해요…`}
          disabled={disabled}
          onOpenModeMenu={onOpenModeDropdown}
          chipStrip={
            <div className="relative flex items-center">
              {/* 칩 연결 hairline. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1 right-1 top-1/2 h-px -translate-y-1/2 bg-slate-900/10"
              />
              <div className="relative flex items-center gap-2.5 overflow-x-auto scrollbar-none px-1 py-1.5 max-w-[calc(100vw-80px)]">
                {BRANDS.map((b) => (
                  <AiBrandChip
                    key={b.id}
                    brand={b}
                    active={selected.includes(b.id)}
                    onClick={() => toggle(b.id)}
                  />
                ))}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

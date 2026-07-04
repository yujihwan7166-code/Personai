/**
 * 다중 AI 히어로 — general 히어로와 같은 문법, 칩 스트립만 다중선택 (최대 3개).
 *
 *   [모드 pill]                          ← 좌상단 (general 과 동일)
 *        (아바타 스택) GPT-5.4 · Claude · Gemini
 *        여러 AI에게 동시에 물어보세요
 *        선택 수에 반응하는 서브카피
 *   ──(N)(G)(W)(GPT)(Claude)…──          ← 다중선택 스트립 (선택 = 액센트 링)
 *   ┌─────────────────────────────┐
 *   │  HeroInput (글래스 · 툴바)     │
 *   └─────────────────────────────┘
 *
 * - 3개 초과 선택 시 가장 오래된 선택과 교체 (플루이드).
 * - 선택은 localStorage 기억 (기본 GPT · Claude · Gemini).
 * - 전송 시 기존 multi 파이프라인 실행 — 채팅 화면은 불변 (2026-07-04 결정).
 * - 배경은 Index 의 hero-brand-canvas[data-brand='multi'] 스펙트럼이 담당.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, BRAND_BY_ID, type Brand, type BrandId } from '@/lib/aiBrands';
import { useVisibleBrands } from '@/hooks/useVisibleBrands';
import { AiBrandChip } from './AiBrandChip';
import { BrandLogo } from './BrandLogo';
import { HeroInput } from './HeroInput';
import { MODE_TINT } from '@/components/MainModeTabs';
import { pickContrastingText } from '@/lib/colorUtils';

const SELECTED_KEY = 'personai.multi.selected_brands';
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
  const { visibleIds } = useVisibleBrands();
  const [selected, setSelected] = useState<BrandId[]>(readSelected);

  const persist = (next: BrandId[]) => {
    setSelected(next);
    try {
      window.localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const toggle = (id: BrandId) => {
    if (selected.includes(id)) {
      // 마지막 하나는 해제 불가 — 최소 1개 유지.
      if (selected.length <= 1) return;
      persist(selected.filter((s) => s !== id));
      return;
    }
    // 꽉 찼으면 가장 오래된 선택과 교체.
    persist(selected.length >= MAX_PICK ? [...selected.slice(1), id] : [...selected, id]);
  };

  const stripBrands = useMemo<Brand[]>(() => {
    const ids = visibleIds.length > 0 ? visibleIds : BRANDS.map((b) => b.id);
    return ids.map((id) => BRAND_BY_ID[id]).filter(Boolean);
  }, [visibleIds]);

  const selectedBrands = selected.map((id) => BRAND_BY_ID[id]).filter(Boolean);
  const expertIds = selectedBrands.map((b) => b.expertId);
  const canSubmit = value.trim().length > 0 && expertIds.length > 0;

  const subCopy =
    selected.length >= 3
      ? '세 답변이 나란히 도착해요 — 비교하고 좋은 것만 가져가세요'
      : selected.length === 2
        ? '2개 선택됨 — 하나 더 고르면 비교가 더 풍성해져요'
        : '아래 스트립에서 최대 3개까지 골라보세요';

  const tint = MODE_TINT.multi;

  return (
    <div className="relative flex min-h-full w-full items-center justify-center">
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
            color: 'var(--hero-fg)',
            backgroundColor: `color-mix(in oklab, ${tint} 10%, transparent)`,
            borderColor: `color-mix(in oklab, ${tint} 36%, transparent)`,
          }}
        >
          <Layers size={14} strokeWidth={2} style={{ color: tint }} />
          <span>{modeLabel}</span>
          <ChevronDown size={14} strokeWidth={2.2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[760px] px-6 py-16">
        {/* eyebrow — 선택된 AI 아바타 스택 + 이름. */}
        <div className="text-center mb-10">
          <div className="mb-3 flex items-center justify-center gap-2.5 hero-name-in">
            <span className="flex items-center">
              {selectedBrands.map((b, i) => {
                const bg = `#${b.icon.hex}`;
                const logoTone = pickContrastingText(bg);
                return (
                  <span
                    key={b.id}
                    className={cn(
                      'flex h-[26px] w-[26px] items-center justify-center rounded-full',
                      i > 0 && '-ml-2',
                    )}
                    style={{
                      backgroundColor: bg,
                      boxShadow: 'inset 0 0 0 1px var(--hero-hairline, rgba(0,0,0,0.08)), 0 0 0 2px var(--hero-bg, #f7f8fc)',
                      zIndex: selectedBrands.length - i,
                    }}
                  >
                    <BrandLogo
                      imgUrl={b.icon.imgUrl}
                      path={b.icon.path}
                      text={b.icon.text}
                      fill={logoTone}
                      forceWhite={logoTone === '#ffffff'}
                      size={Math.round(13 * (b.icon.logoScale ?? 1))}
                    />
                  </span>
                );
              })}
            </span>
            <span
              className="text-[17px] font-semibold tracking-[-0.01em]"
              style={{ color: 'var(--hero-accent)' }}
            >
              {selectedBrands.map((b) => b.name).join(' · ')}
            </span>
          </div>

          <h1
            className="hero-heading text-[36px] sm:text-[44px] leading-[1.15] font-medium tracking-[-0.02em] animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ color: 'var(--hero-fg)' }}
          >
            여러 AI에게 동시에 물어보세요
          </h1>
          <p
            className="mt-3 text-[14.5px] tracking-[-0.005em] animate-in fade-in duration-300"
            style={{ color: 'var(--hero-fg-muted)' }}
            key={selected.length}
          >
            {subCopy}
          </p>
        </div>

        {/* 입력창 + 관통 다중선택 스트립. */}
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
                className="pointer-events-none absolute left-1 right-1 top-1/2 h-px -translate-y-1/2"
                style={{ backgroundColor: 'var(--hero-hairline, rgba(0,0,0,0.10))' }}
              />
              <div className="relative flex items-center gap-2.5 overflow-x-auto scrollbar-none px-1 py-1.5 max-w-[calc(100vw-80px)]">
                {stripBrands.map((b) => (
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

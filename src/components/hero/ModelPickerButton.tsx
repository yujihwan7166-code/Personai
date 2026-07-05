/**
 * 모델 선택 버튼 — 브랜드 안의 모델 변형 선택.
 *
 * variant:
 *   - 'toolbar'  → 입력창 우측 하단 컴팩트 pill (기본)
 *   - 'eyebrow'  → 헤드라인 위 브랜드 이름 자리. 텍스트 스타일, 큰 클릭 영역.
 *                  브랜드명 · 모델명 · chevron 순으로 표시.
 *
 * 드롭다운 방향:
 *   - toolbar → 위로 (bottom-full)
 *   - eyebrow → 아래로 (top-full)
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_ACCENT, type Brand, type BrandModel } from '@/lib/aiBrands';
import { DEFAULT_EXPERTS } from '@/types/expert';

/* 모델 정보 호버 카드 헬퍼 (AI Studio 모델 카드 각색). */
const MODALITY_KO: Record<string, string> = {
  text: '텍스트', image: '이미지', video: '영상', audio: '오디오', file: '파일',
};
const PRICE_KO: Record<string, string> = {
  free: '무료', budget: '저가', standard: '표준', premium: '프리미엄',
};
function fmtCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${Math.round(n / 1_000)}K`;
}
import { BrandLogo } from './BrandLogo';
import { pickContrastingText } from '@/lib/colorUtils';

export type HeroPickerMode = 'chips' | 'select';

interface Props {
  brand: Brand;
  selectedModel: BrandModel;
  onSelect: (modelId: string) => void;
  variant?: 'toolbar' | 'eyebrow';
  /** 칩모드/선택모드 — 지정 시 드롭다운 우측 상단에 토글 노출. */
  pickerMode?: HeroPickerMode;
  onPickerModeChange?: (m: HeroPickerMode) => void;
  /** 선택모드 전용 — 모델 리스트 위에 렌더할 AI·브라우저 그리드. */
  selectSection?: React.ReactNode;
  /** armed 등 브랜드 외 표시 — 라벨만 오버라이드, 모델 리스트 숨김. */
  displayOverride?: { label: string };
}

export function ModelPickerButton({
  brand,
  selectedModel,
  onSelect,
  variant = 'toolbar',
  pickerMode,
  onPickerModeChange,
  selectSection,
  displayOverride,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 드롭다운은 portal(body) 렌더 — 칩 스트립 등 어떤 stacking context 도
  // 위를 덮지 못하게 (2026-07-04 z-fighting fix). 버튼 rect 기준 fixed 배치.
  const [anchor, setAnchor] = useState<{ top: number; bottom: number; centerX: number; right: number } | null>(null);
  // 모델 정보 호버 카드 — hover 중인 모델 id + 카드 좌표.
  const [hoverCard, setHoverCard] = useState<{ modelId: string; top: number; left: number } | null>(null);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = rootRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, bottom: r.bottom, centerX: r.left + r.width / 2, right: r.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // 스크롤·리사이즈 시 위치가 어긋나므로 닫기 (간단·안전).
    const onMove = () => setOpen(false);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const hasChoice = brand.models.length > 1;
  const isEyebrow = variant === 'eyebrow';
  // 선택 패널(AI·브라우저 그리드)이 있으면 항상 열 수 있음 — 패널이 곧 전환 허브.
  const openable = hasChoice || !!selectSection;
  // 흰색 패널 내부 액센트 — --hero-accent 는 grok/x 에서 흰색이라 못 씀.
  const panelAccent = BRAND_ACCENT[brand.id] ?? '#10a37f';

  return (
    <div ref={rootRef} className={cn('relative', isEyebrow && 'inline-flex')}>
      <button
        type="button"
        onClick={() => openable && toggleOpen()}
        disabled={!openable}
        aria-haspopup="menu"
        aria-expanded={open}
        title={openable ? (selectSection ? 'AI·브라우저 선택' : '모델 변경') : '이 브랜드는 단일 모델'}
        className={cn(
          isEyebrow
            ? [
                // eyebrow 스타일 — 브랜드 로고 + 모델명. AI 정체성이 한눈에.
                'inline-flex items-center gap-2 py-2 px-4 -mx-4 rounded-xl',
                'text-[19px] font-semibold tracking-[-0.01em]',
                'transition-all duration-200',
                openable && 'hover:bg-[color:var(--hero-accent-soft)] hover:-translate-y-px active:translate-y-0',
              ]
            : [
                // toolbar 스타일 — 입력창 우측 pill.
                'flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full',
                'text-[11px] font-medium tracking-tight',
                'border transition-all duration-150',
                'border-[color:var(--hero-hairline,rgba(255,255,255,0.10))]',
                'hover:border-[color:var(--hero-ring,#10a37f)]',
              ],
          !openable && 'opacity-70 cursor-not-allowed',
        )}
        style={
          isEyebrow
            ? { color: 'var(--hero-accent)' }
            : {
                color: 'var(--hero-fg, #ececec)',
                backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.05))',
              }
        }
      >
        {isEyebrow ? (
          <>
            {/* 로고 원 + 이름을 한 단위로 key — 브랜드 전환 시 함께 부드럽게
             * 재등장 (예전 감각 복원). 컴포넌트 자체는 유지 → 패널 안 닫힘. */}
            <span
              key={displayOverride ? `ov-${displayOverride.label}` : brand.id}
              className="inline-flex items-center gap-2 hero-name-in"
            >
              {/* 브랜드 로고 마크 — 브랜드 컬러 원. 로고 색은 휘도 기준 자동.
               * displayOverride(armed 검색엔진)는 로고 원 없이 라벨만. */}
              {!displayOverride && (
                <span
                  className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full shrink-0"
                  style={{
                    backgroundColor: `#${brand.icon.hex}`,
                    boxShadow: 'inset 0 0 0 1px var(--hero-hairline, rgba(255,255,255,0.10))',
                  }}
                >
                  <BrandLogo
                    imgUrl={brand.icon.imgUrl}
                    path={brand.icon.path}
                    text={brand.icon.text}
                    fill={pickContrastingText(`#${brand.icon.hex}`)}
                    forceWhite={pickContrastingText(`#${brand.icon.hex}`) === '#ffffff'}
                    size={Math.round(14 * (brand.icon.logoScale ?? 1))}
                  />
                </span>
              )}
              {/* 모델명에 브랜드가 이미 들어있으면 그대로, 없으면 브랜드명 접두. */}
              <span>
                {displayOverride
                  ? displayOverride.label
                  : selectedModel.name.toLowerCase().includes(brand.name.toLowerCase())
                    ? selectedModel.name
                    : `${brand.name} ${selectedModel.name}`}
              </span>
            </span>
            {openable && (
              <ChevronDown
                size={18}
                strokeWidth={2.4}
                className={cn('opacity-60 transition-transform duration-200', open && 'rotate-180')}
              />
            )}
          </>
        ) : (
          <>
            <span className="truncate max-w-[128px]">{selectedModel.name}</span>
            {hasChoice && (
              <ChevronDown
                size={11}
                strokeWidth={2.2}
                className={cn('opacity-70 transition-transform', open && 'rotate-180')}
              />
            )}
          </>
        )}
      </button>

      {open && openable && anchor && createPortal(
        <div
          ref={panelRef}
          role="menu"
          className={cn(
            // 흰색 고정 패널 — 브랜드 배경이 어두워도 리스트는 항상 밝고 또렷하게.
            // 등장 모션은 fade 만 (슬라이드·줌 X).
            'fixed z-[300]',
            selectSection ? 'w-[840px] max-w-[calc(100vw-16px)]' : 'w-[300px]',
            'rounded-xl border border-black/[0.08] bg-white p-1.5',
            'shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22)]',
            'animate-in fade-in duration-100',
          )}
          // 센터링은 transform 대신 좌표 계산 — animate-in 키프레임이 transform 을
          // 덮어써서 옆에서 날아오는 것처럼 보이는 문제 방지.
          style={(() => {
            const w = selectSection ? Math.min(840, window.innerWidth - 16) : 300;
            return isEyebrow
              ? {
                  top: anchor.bottom + 8,
                  left: Math.max(8, Math.min(anchor.centerX - w / 2, window.innerWidth - w - 8)),
                }
              : { bottom: window.innerHeight - anchor.top + 8, left: Math.min(anchor.right - w, window.innerWidth - w - 16) };
          })()}
        >
          {/* 헤더 — 좌: 첫 섹션 라벨(브라우저) · 우: 칩 표시 토글.
           * 선택 모델 요약은 제거 (eyebrow 가 이미 보여줌, 2026-07-05). */}
          <div className="px-2.5 pt-1 pb-1.5 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wide text-[#9aa0a8]">
              {selectSection
                ? '브라우저'
                : displayOverride
                  ? `${displayOverride.label} 검색 중`
                  : `${brand.name} · 모델 ${brand.models.length}개`}
            </span>
            {pickerMode && onPickerModeChange && (
              // 칩 표시 토글 — 패널은 항상 이 화면, 이 스위치는 입력창 위
              // 칩 스트립 노출 여부만 결정 (2026-07-05 재정의).
              <button
                type="button"
                onClick={() => onPickerModeChange(pickerMode === 'chips' ? 'select' : 'chips')}
                aria-pressed={pickerMode === 'chips'}
                title="입력창 위 칩 스트립 표시/숨김"
                className="ml-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] py-0.5 pl-2 pr-1 text-[10px] font-semibold text-[#4b4f56] transition-colors hover:bg-black/[0.08]"
              >
                칩 표시
                <span
                  className={cn(
                    'relative h-3.5 w-6 rounded-full transition-colors duration-150',
                    pickerMode === 'chips' ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all duration-150',
                      pickerMode === 'chips' ? 'left-3' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            )}
          </div>
          {/* 선택 그리드 — 브라우저 → AI (클릭 시 화면 전환, 패널 닫힘).
           * 별 토글(칩 구성)은 닫힘 예외 — data-keep-open 으로 구분. */}
          {selectSection && (
            <div
              onClickCapture={(e) => {
                const el = e.target as HTMLElement;
                if (el.closest('[data-keep-open]')) return;
                setOpen(false);
              }}
            >
              {selectSection}
            </div>
          )}
          {/* 모델 리스트 — 한 줄 컴팩트. armed(displayOverride) 땐 모델 개념이 없어 숨김. */}
          {!displayOverride && (
          <>
          {selectSection && (
            <div className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold tracking-wide text-[#9aa0a8]">
              {brand.name} 모델
            </div>
          )}
          <div
            className={cn(
              'max-h-[380px] overflow-y-auto overscroll-contain scrollbar-thin',
              // 와이드 패널에선 4열 그리드 — 모델 8개+ 여도 세로 낭비 없음.
              selectSection && 'grid grid-cols-4 gap-0.5',
            )}
          >
            {brand.models.map((m) => {
              const active = m.id === selectedModel.id;
              return (
                <button
                  key={`${m.id}-${m.name}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelect(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-lg text-left transition-colors duration-100',
                    selectSection ? 'px-2 py-[6px]' : 'gap-2 px-2.5 py-[7px]',
                    active ? 'bg-black/[0.05]' : 'hover:bg-black/[0.035]',
                  )}
                  onMouseEnter={(e) => {
                    // 정보 카드 위치 — 행 오른쪽, 화면 밖이면 왼쪽으로.
                    const r = e.currentTarget.getBoundingClientRect();
                    const W = 264;
                    const left = r.right + 8 + W > window.innerWidth ? r.left - W - 8 : r.right + 8;
                    setHoverCard({ modelId: m.id, top: Math.min(r.top, window.innerHeight - 170), left: Math.max(8, left) });
                  }}
                  onMouseLeave={() => setHoverCard(null)}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ backgroundColor: panelAccent }}
                  />
                  <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
                    <span className={cn('text-[12.5px] font-medium leading-tight text-[#1f2023]', selectSection ? 'truncate' : 'shrink-0 text-[13px]')}>
                      {m.name}
                    </span>
                    {/* 그리드 모드에선 설명은 툴팁으로만 (칸 절약). */}
                    {!selectSection && m.description && (
                      <span className="min-w-0 truncate text-[11px] leading-tight text-[#9aa0a8]">
                        {m.description}
                      </span>
                    )}
                  </span>
                  {m.isDefault && (
                    <span
                      className="shrink-0 px-1.5 py-px rounded-full text-[9px] font-semibold tracking-tight"
                      style={{
                        color: panelAccent,
                        backgroundColor: `${panelAccent}1a`,
                      }}
                    >
                      추천
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* 모델 정보 호버 카드 — 이름·설명 + 컨텍스트·입력·가격 (AI Studio 각색). */}
          {hoverCard && (() => {
            const m = brand.models.find((x) => x.id === hoverCard.modelId);
            if (!m) return null;
            const info = DEFAULT_EXPERTS.find((e) => e.id === hoverCard.modelId)?.modelInfo;
            return (
              <div
                className="pointer-events-none fixed z-[310] w-[264px] rounded-xl border border-black/[0.08] bg-white p-3 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.25)] animate-in fade-in duration-100"
                style={{ top: hoverCard.top, left: hoverCard.left }}
              >
                <div className="text-[13px] font-semibold text-[#1f2023]">{m.name}</div>
                {m.description && (
                  <div className="mt-0.5 text-[11px] leading-snug text-[#8a8f98]">{m.description}</div>
                )}
                {info && (
                  <div className="mt-2 space-y-1 border-t border-black/[0.06] pt-2">
                    {info.provider && (
                      <div className="flex justify-between text-[10.5px]">
                        <span className="text-[#9aa0a8]">제공</span>
                        <span className="font-medium text-[#4b4f56]">{info.provider}</span>
                      </div>
                    )}
                    {info.contextLength > 0 && (
                      <div className="flex justify-between text-[10.5px]">
                        <span className="text-[#9aa0a8]">컨텍스트</span>
                        <span className="font-medium tabular-nums text-[#4b4f56]">{fmtCtx(info.contextLength)} 토큰</span>
                      </div>
                    )}
                    {info.inputModalities?.length > 0 && (
                      <div className="flex justify-between text-[10.5px]">
                        <span className="text-[#9aa0a8]">입력</span>
                        <span className="font-medium text-[#4b4f56]">
                          {info.inputModalities.map((x) => MODALITY_KO[x] ?? x).join('·')}
                        </span>
                      </div>
                    )}
                    {info.priceTier && (
                      <div className="flex justify-between text-[10.5px]">
                        <span className="text-[#9aa0a8]">가격대</span>
                        <span className="font-medium text-[#4b4f56]">{PRICE_KO[info.priceTier] ?? info.priceTier}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

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
            {/* 브랜드 로고 마크 — 브랜드 컬러 원 (스트립·사이드바 칩과 동일 언어).
             * 로고 색은 원 배경 휘도 기준 자동 (Grok 흰 원 → 검정 로고).
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
            {/* 모델명에 브랜드가 이미 들어있으면 그대로 (GPT-5.4 · Claude Opus 4.6),
             * 없으면 브랜드명을 앞에 붙임 (Sonar Pro → Perplexity Sonar Pro). */}
            {/* key=brand.id — 브랜드 전환 시 이름만 재등장 애니메이션 (컴포넌트
             * 자체는 유지 → 패널 열린 채 브랜드 바꿔도 안 닫힘). */}
            <span key={displayOverride ? `ov-${displayOverride.label}` : brand.id} className="hero-name-in">
              {displayOverride
                ? displayOverride.label
                : selectedModel.name.toLowerCase().includes(brand.name.toLowerCase())
                  ? selectedModel.name
                  : `${brand.name} ${selectedModel.name}`}
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
            selectSection ? 'w-[760px] max-w-[calc(100vw-16px)]' : 'w-[300px]',
            'rounded-xl border border-black/[0.08] bg-white p-1.5',
            'shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22)]',
            'animate-in fade-in duration-100',
          )}
          // 센터링은 transform 대신 좌표 계산 — animate-in 키프레임이 transform 을
          // 덮어써서 옆에서 날아오는 것처럼 보이는 문제 방지.
          style={(() => {
            const w = selectSection ? Math.min(760, window.innerWidth - 16) : 300;
            return isEyebrow
              ? {
                  top: anchor.bottom + 8,
                  left: Math.max(8, Math.min(anchor.centerX - w / 2, window.innerWidth - w - 8)),
                }
              : { bottom: window.innerHeight - anchor.top + 8, left: Math.min(anchor.right - w, window.innerWidth - w - 16) };
          })()}
        >
          {/* 헤더 — 좌: 컨텍스트 라벨 · 우: 칩모드/선택모드 토글. */}
          <div className="px-2.5 pt-1 pb-1.5 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: panelAccent }}
            />
            <span className="text-[10.5px] font-medium tracking-tight text-[#9aa0a8]">
              {displayOverride
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
                  title={m.description}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-lg text-left transition-colors duration-100',
                    selectSection ? 'px-2 py-[6px]' : 'gap-2 px-2.5 py-[7px]',
                    active ? 'bg-black/[0.05]' : 'hover:bg-black/[0.035]',
                  )}
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
          </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

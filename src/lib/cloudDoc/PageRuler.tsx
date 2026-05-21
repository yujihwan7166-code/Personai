/**
 * 문서 에디터 상단 cm 눈금자 (구글 독스 ruler).
 *
 *  - 카드 폭 전체에 1cm 단위 눈금, 5cm 마다 숫자
 *  - 마진 영역(0~marginLeft, widthPx-marginRight~widthPx) 회색 톤
 *  - 좌우 마진 핸들 드래그로 마진 조절 (onMarginChange 제공 시)
 *
 * 정책:
 *  - 카드 폭(widthPx) 을 cmCount(21) 로 나눠 pxPerCm 계산 — A4 폭 정확도
 *    유지 (816/21 ≈ 38.86px/cm, 화면 표시 cm 라벨은 시각적)
 *  - 줌은 카드 자체 transform 으로만 — ruler 가 카드와 같이 묶여있어
 *    자동으로 함께 scale 됨
 *  - 드래그 시 px 좌표 보정은 zoom=100 기준 (zoom 보정은 v2)
 */

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface PageMargin {
  top: number;
  /** px (96dpi 기준). 카드 안 좌측 본문 시작 거리. */
  left: number;
  /** px. 카드 안 우측 본문 끝까지 거리. */
  right: number;
  bottom: number;
}

interface PageRulerProps {
  widthPx: number;
  margin: PageMargin;
  /** 제공 시 좌우 핸들 드래그로 마진 조절 가능. 미제공 시 표시 전용. */
  onMarginChange?: (m: PageMargin) => void;
}

const MIN_BODY_WIDTH_PX = 80;  // 본문 폭 최소

export function PageRuler({ widthPx, margin, onMarginChange }: PageRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const cmCount = Math.max(1, Math.round(widthPx / (96 / 2.54)));
  const pxPerCm = widthPx / cmCount;

  const startDrag = (side: 'left' | 'right') => (e: React.PointerEvent) => {
    if (!onMarginChange) return;
    e.preventDefault();
    const ruler = rulerRef.current;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(widthPx, ev.clientX - rect.left));
      if (side === 'left') {
        const maxLeft = widthPx - margin.right - MIN_BODY_WIDTH_PX;
        onMarginChange({ ...margin, left: Math.max(0, Math.min(maxLeft, x)) });
      } else {
        const newRight = widthPx - x;
        const maxRight = widthPx - margin.left - MIN_BODY_WIDTH_PX;
        onMarginChange({ ...margin, right: Math.max(0, Math.min(maxRight, newRight)) });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={rulerRef}
      className="relative h-5 border-b border-slate-200 select-none bg-white dark:bg-zinc-100"
      style={{ width: widthPx }}
      aria-hidden="true"
    >
      {/* 마진 영역 음영 */}
      <div
        className="absolute top-0 h-full bg-slate-200/70 pointer-events-none"
        style={{ left: 0, width: margin.left }}
      />
      <div
        className="absolute top-0 h-full bg-slate-200/70 pointer-events-none"
        style={{ right: 0, width: margin.right }}
      />

      {/* 눈금 + 라벨 */}
      {Array.from({ length: cmCount + 1 }).map((_, i) => {
        const left = i * pxPerCm;
        const isMajor = i % 5 === 0;
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center pointer-events-none"
            style={{ left: `${left}px`, transform: 'translateX(-50%)' }}
          >
            <div className={cn('w-px', isMajor ? 'h-2 bg-slate-500' : 'h-1.5 bg-slate-400')} />
            {isMajor && (
              <span className="text-[9px] text-slate-600 leading-none mt-0.5">{i}</span>
            )}
          </div>
        );
      })}

      {/* 좌측 마진 핸들 */}
      {onMarginChange && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="좌측 마진"
          aria-valuemin={0}
          aria-valuemax={Math.round(widthPx - margin.right - MIN_BODY_WIDTH_PX)}
          aria-valuenow={Math.round(margin.left)}
          aria-valuetext={`${(margin.left / pxPerCm).toFixed(1)}cm`}
          className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize group hover:bg-blue-200/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ left: margin.left }}
          onPointerDown={startDrag('left')}
          title={`좌측 마진 ${(margin.left / pxPerCm).toFixed(1)}cm — 드래그로 조절`}
        >
          <div className="w-0 h-0 mx-auto mt-0.5 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 group-hover:border-t-blue-600" />
        </div>
      )}
      {/* 우측 마진 핸들 */}
      {onMarginChange && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="우측 마진"
          aria-valuemin={0}
          aria-valuemax={Math.round(widthPx - margin.left - MIN_BODY_WIDTH_PX)}
          aria-valuenow={Math.round(margin.right)}
          aria-valuetext={`${(margin.right / pxPerCm).toFixed(1)}cm`}
          className="absolute top-0 h-full w-3 translate-x-1/2 cursor-ew-resize group hover:bg-blue-200/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ right: margin.right }}
          onPointerDown={startDrag('right')}
          title={`우측 마진 ${(margin.right / pxPerCm).toFixed(1)}cm — 드래그로 조절`}
        >
          <div className="w-0 h-0 mx-auto mt-0.5 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 group-hover:border-t-blue-600" />
        </div>
      )}
    </div>
  );
}

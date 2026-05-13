/**
 * 화이트보드 — 요소별 SVG 렌더러.
 *
 * Phase 1 단순 SVG (roughjs 적용은 Phase 2 후순위).
 * 모든 렌더러는 순수 함수형 — 요소 데이터만 받음.
 */
import { memo, useEffect, useState } from 'react';
import type {
  WBArrow,
  WBDiamond,
  WBElement,
  WBEllipse,
  WBFreedraw,
  WBImage,
  WBLine,
  WBRect,
  WBSpeech,
  WBSticky,
  WBText,
  WBTriangle,
} from '@/types/whiteboard';
import { WB_COLOR_HSL, WB_STICKY_BG, WB_STROKE_DASH, WB_STROKE_WIDTH } from '@/lib/whiteboard/colors';
import { getImageObjectURL } from '@/lib/whiteboard/imageStore';
import { renderMarkdownLite } from '@/lib/whiteboard/markdownLite';

function transform(el: Pick<WBElement, 'x' | 'y' | 'w' | 'h' | 'angle'>): string | undefined {
  if (!el.angle) return undefined;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  return `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})`;
}

function strokeAttrs(el: { strokeColor: string; strokeWidth: 'thin' | 'normal' | 'thick'; strokeStyle: 'solid' | 'dashed' | 'dotted' }) {
  return {
    stroke: WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL] ?? el.strokeColor,
    strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
    strokeDasharray: WB_STROKE_DASH[el.strokeStyle] || undefined,
  };
}

function fillValue(el: { fillColor: string }) {
  if (el.fillColor === 'none') return 'none';
  const base = WB_COLOR_HSL[el.fillColor as keyof typeof WB_COLOR_HSL];
  // 채움은 옅게 (10% 알파)
  if (!base) return 'none';
  return base.replace('hsl(', 'hsla(').replace(')', ' / 0.12)');
}

// ──────────────────────────────────────────
export const RectEl = memo(function RectEl({ el }: { el: WBRect }) {
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={el.cornerRadius}
        ry={el.cornerRadius}
        fill={fillValue(el)}
        {...strokeAttrs(el)}
      />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const EllipseEl = memo(function EllipseEl({ el }: { el: WBEllipse }) {
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <ellipse
        cx={el.x + el.w / 2}
        cy={el.y + el.h / 2}
        rx={el.w / 2}
        ry={el.h / 2}
        fill={fillValue(el)}
        {...strokeAttrs(el)}
      />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const DiamondEl = memo(function DiamondEl({ el }: { el: WBDiamond }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const points = `${cx},${el.y} ${el.x + el.w},${cy} ${cx},${el.y + el.h} ${el.x},${cy}`;
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <polygon points={points} fill={fillValue(el)} {...strokeAttrs(el)} />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const TriangleEl = memo(function TriangleEl({ el }: { el: WBTriangle }) {
  const points = `${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h} ${el.x},${el.y + el.h}`;
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <polygon points={points} fill={fillValue(el)} {...strokeAttrs(el)} />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const SpeechEl = memo(function SpeechEl({ el }: { el: WBSpeech }) {
  // 단순 사각 + 꼬리 (꼬리는 한 변 중앙에서 바깥)
  const tail = (() => {
    const sz = Math.min(el.w, el.h) * 0.15;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    switch (el.tailDirection) {
      case 'bl': return `M ${el.x + el.w * 0.2},${el.y + el.h} L ${el.x + el.w * 0.1},${el.y + el.h + sz} L ${el.x + el.w * 0.35},${el.y + el.h}`;
      case 'br': return `M ${el.x + el.w * 0.65},${el.y + el.h} L ${el.x + el.w * 0.8},${el.y + el.h + sz} L ${el.x + el.w * 0.8},${el.y + el.h}`;
      case 'tl': return `M ${el.x + el.w * 0.2},${el.y} L ${el.x + el.w * 0.1},${el.y - sz} L ${el.x + el.w * 0.35},${el.y}`;
      case 'tr': return `M ${el.x + el.w * 0.65},${el.y} L ${el.x + el.w * 0.8},${el.y - sz} L ${el.x + el.w * 0.8},${el.y}`;
      default:
        return '';
    }
  })();
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={8} ry={8} fill={fillValue(el)} {...strokeAttrs(el)} />
      <path d={tail} fill={fillValue(el)} {...strokeAttrs(el)} />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

// ──────────────────────────────────────────
export const LineEl = memo(function LineEl({ el }: { el: WBLine }) {
  if (el.points.length < 2) return null;
  const d = pointsToPath(el.points);
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path d={d} fill="none" {...strokeAttrs(el)} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
});

export const ArrowEl = memo(function ArrowEl({ el }: { el: WBArrow }) {
  if (el.points.length < 2) return null;
  const last = el.points[el.points.length - 1];
  const prev = el.points[el.points.length - 2];
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const headSize = 12;
  const stroke = WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL] ?? el.strokeColor;
  // 화살촉
  const ax = last[0] - Math.cos(angle - Math.PI / 6) * headSize;
  const ay = last[1] - Math.sin(angle - Math.PI / 6) * headSize;
  const bx = last[0] - Math.cos(angle + Math.PI / 6) * headSize;
  const by = last[1] - Math.sin(angle + Math.PI / 6) * headSize;
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path d={pointsToPath(el.points)} fill="none" {...strokeAttrs(el)} strokeLinecap="round" strokeLinejoin="round" />
      {el.endArrow !== 'none' && (
        <polyline
          points={`${ax},${ay} ${last[0]},${last[1]} ${bx},${by}`}
          fill="none"
          stroke={stroke}
          strokeWidth={WB_STROKE_WIDTH[el.strokeWidth]}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
});

// ──────────────────────────────────────────
export const FreedrawEl = memo(function FreedrawEl({ el }: { el: WBFreedraw }) {
  if (el.points.length === 0) return null;
  const d = el.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
    .join(' ');
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path
        d={d}
        fill="none"
        {...strokeAttrs(el)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
});

// ──────────────────────────────────────────
export const TextEl = memo(function TextEl({ el }: { el: WBText }) {
  const color = WB_COLOR_HSL[el.textColor];
  const fontFamily =
    el.fontFamily === 'serif' ? 'Georgia, serif'
    : el.fontFamily === 'mono' ? 'ui-monospace, monospace'
    : 'inherit';
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <foreignObject x={el.x} y={el.y} width={el.w} height={el.h}>
        <div
          style={{
            width: '100%',
            height: '100%',
            color,
            fontSize: el.fontSize,
            fontFamily,
            textAlign: el.textAlign,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            pointerEvents: 'none',
          }}
        >
          {renderMarkdownLite(el.content || '')}
        </div>
      </foreignObject>
    </g>
  );
});

// ──────────────────────────────────────────
export const StickyEl = memo(function StickyEl({ el }: { el: WBSticky }) {
  const tone = WB_STICKY_BG[el.color];
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      {/* 그림자 */}
      <rect
        x={el.x + 2}
        y={el.y + 4}
        width={el.w}
        height={el.h}
        rx={3}
        ry={3}
        fill="hsl(0 0% 0% / 0.10)"
      />
      {/* 본체 */}
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={3}
        ry={3}
        fill={tone.bg}
        stroke={tone.border}
        strokeWidth={1}
      />
      <foreignObject x={el.x + 12} y={el.y + 10} width={el.w - 24} height={el.h - 20}>
        <div
          style={{
            width: '100%',
            height: '100%',
            color: tone.text,
            fontSize: el.fontSize,
            fontFamily: 'inherit',
            textAlign: el.textAlign,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {renderMarkdownLite(el.content || '')}
        </div>
      </foreignObject>
    </g>
  );
});

// ──────────────────────────────────────────
// 도형 안 텍스트 — 가운데 정렬 기본
function ShapeText({ el }: { el: WBRect | WBEllipse | WBDiamond | WBTriangle | WBSpeech }) {
  if (!el.text) return null;
  const color = WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL] ?? 'currentColor';
  return (
    <foreignObject x={el.x + 8} y={el.y + 8} width={el.w - 16} height={el.h - 16}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
          color,
          fontSize: el.fontSize ?? 16,
          textAlign: el.textAlign ?? 'center',
          lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          pointerEvents: 'none',
        }}
      >
        {renderMarkdownLite(el.text)}
      </div>
    </foreignObject>
  );
}

// ──────────────────────────────────────────
export const ImageEl = memo(function ImageEl({ el }: { el: WBImage }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    getImageObjectURL(el.imageId).then((u) => {
      if (mounted) setUrl(u);
    }).catch(() => { /* silent */ });
    return () => { mounted = false; };
  }, [el.imageId]);
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      {url ? (
        <image
          href={url}
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          preserveAspectRatio="xMidYMid slice"
          data-wb-image-id={el.imageId}
          style={{ borderRadius: el.cornerRadius }}
        />
      ) : (
        <rect
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          rx={el.cornerRadius}
          fill="hsl(var(--accent) / 0.4)"
          stroke="hsl(var(--hairline))"
          strokeDasharray="4 4"
        />
      )}
    </g>
  );
});

// ──────────────────────────────────────────
// 단일 dispatch
export const Element = memo(function ElementRenderer({ el }: { el: WBElement }) {
  switch (el.type) {
    case 'rect':     return <RectEl     el={el} />;
    case 'ellipse':  return <EllipseEl  el={el} />;
    case 'diamond':  return <DiamondEl  el={el} />;
    case 'triangle': return <TriangleEl el={el} />;
    case 'speech':   return <SpeechEl   el={el} />;
    case 'line':     return <LineEl     el={el} />;
    case 'arrow':    return <ArrowEl    el={el} />;
    case 'freedraw': return <FreedrawEl el={el} />;
    case 'text':     return <TextEl     el={el} />;
    case 'sticky':   return <StickyEl   el={el} />;
    case 'image':    return <ImageEl    el={el} />;
    case 'frame':    return null;     // Phase 2 후순위
    case 'bracket':  return null;     // Phase 2 후순위
    default:         return null;
  }
});

// ──────────────────────────────────────────
function pointsToPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

/**
 * 화이트보드 — 요소별 SVG 렌더러.
 *
 * Phase 1 단순 SVG (roughjs 적용은 Phase 2 후순위).
 * 모든 렌더러는 순수 함수형 — 요소 데이터만 받음.
 */
import { memo, useEffect, useState } from 'react';
import type {
  WBArrow,
  WBCapsule,
  WBDatabase,
  WBDiamond,
  WBDocument,
  WBElement,
  WBEllipse,
  WBFrame,
  WBFreedraw,
  WBImage,
  WBLine,
  WBRect,
  WBSpeech,
  WBSticky,
  WBTable,
  WBText,
  WBTriangle,
} from '@/types/whiteboard';
import { WB_COLOR_HSL, WB_STICKY_BG, WB_STROKE_DASH, WB_STROKE_WIDTH } from '@/lib/whiteboard/colors';
import { getImageObjectURL } from '@/lib/whiteboard/imageStore';
import { renderMarkdownLite } from '@/lib/whiteboard/markdownLite';
import { drawableSVGPaths, roughCached, roughGenerator, roughOptions } from '@/lib/whiteboard/rough';

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
// roughjs 렌더 — roughness > 0 시 sketchy path 들을 React 노드로 반환.
function RoughPaths({ paths }: { paths: Array<{ d: string; fill?: string; stroke?: string }> }) {
  return (
    <>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? 'none'}
          stroke={p.stroke ?? 'currentColor'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

// ──────────────────────────────────────────
export const RectEl = memo(function RectEl({ el }: { el: WBRect }) {
  if (el.roughness > 1) {
    const stroke = WB_COLOR_HSL[el.strokeColor];
    const fill = el.fillColor !== 'none' ? WB_COLOR_HSL[el.fillColor].replace('hsl(', 'hsla(').replace(')', ' / 0.18)') : undefined;
    const drawable = roughCached({
      el,
      cacheKey: `rect|${el.x}|${el.y}|${el.w}|${el.h}|${el.strokeColor}|${el.fillColor}|${el.fillStyle}|${el.strokeWidth}|${el.roughness}`,
      build: () => roughGenerator.rectangle(el.x, el.y, el.w, el.h, {
        ...roughOptions(el.roughness, fill, el.fillStyle as 'solid'|'hachure'|'cross-hatch'|undefined),
        stroke,
        strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
      }),
    });
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(drawable)} />
        {el.text && <ShapeText el={el} />}
      </g>
    );
  }
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
  if (el.roughness > 0) {
    const stroke = WB_COLOR_HSL[el.strokeColor];
    const fill = el.fillColor !== 'none' ? WB_COLOR_HSL[el.fillColor].replace('hsl(', 'hsla(').replace(')', ' / 0.18)') : undefined;
    const drawable = roughCached({
      el,
      cacheKey: `ellipse|${el.x}|${el.y}|${el.w}|${el.h}|${el.strokeColor}|${el.fillColor}|${el.fillStyle}|${el.strokeWidth}|${el.roughness}`,
      build: () => roughGenerator.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w, el.h, {
        ...roughOptions(el.roughness, fill, el.fillStyle as 'solid'|'hachure'|'cross-hatch'|undefined),
        stroke,
        strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
      }),
    });
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(drawable)} />
        {el.text && <ShapeText el={el} />}
      </g>
    );
  }
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

function polyRough(el: { x: number; y: number; w: number; h: number; strokeColor: string; strokeWidth: 'thin'|'normal'|'thick'; roughness: 0|1|2; fillColor: string; fillStyle: string }, pts: Array<[number, number]>, tag: string) {
  const stroke = WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL];
  const fill = el.fillColor !== 'none' ? WB_COLOR_HSL[el.fillColor as keyof typeof WB_COLOR_HSL].replace('hsl(', 'hsla(').replace(')', ' / 0.18)') : undefined;
  return roughCached({
    el,
    cacheKey: `${tag}|${el.x}|${el.y}|${el.w}|${el.h}|${el.strokeColor}|${el.fillColor}|${el.fillStyle}|${el.strokeWidth}|${el.roughness}`,
    build: () => roughGenerator.polygon(pts, {
      ...roughOptions(el.roughness, fill, el.fillStyle as 'solid'|'hachure'|'cross-hatch'|undefined),
      stroke,
      strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
    }),
  });
}

export const DiamondEl = memo(function DiamondEl({ el }: { el: WBDiamond }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const pts: Array<[number, number]> = [[cx, el.y], [el.x + el.w, cy], [cx, el.y + el.h], [el.x, cy]];
  if (el.roughness > 0) {
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(polyRough(el, pts, 'diamond'))} />
        {el.text && <ShapeText el={el} />}
      </g>
    );
  }
  const points = pts.map((p) => p.join(',')).join(' ');
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <polygon points={points} fill={fillValue(el)} {...strokeAttrs(el)} />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const TriangleEl = memo(function TriangleEl({ el }: { el: WBTriangle }) {
  const pts: Array<[number, number]> = [[el.x + el.w / 2, el.y], [el.x + el.w, el.y + el.h], [el.x, el.y + el.h]];
  if (el.roughness > 0) {
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(polyRough(el, pts, 'triangle'))} />
        {el.text && <ShapeText el={el} />}
      </g>
    );
  }
  const points = pts.map((p) => p.join(',')).join(' ');
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

export const CapsuleEl = memo(function CapsuleEl({ el }: { el: WBCapsule }) {
  const rx = Math.min(el.w, el.h) / 2;
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={rx}
        ry={rx}
        fill={fillValue(el)}
        {...strokeAttrs(el)}
      />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const DatabaseEl = memo(function DatabaseEl({ el }: { el: WBDatabase }) {
  const capH = Math.min(28, Math.max(12, el.h * 0.18));
  const stroke = strokeAttrs(el);
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path
        d={[
          `M ${el.x} ${el.y + capH / 2}`,
          `C ${el.x} ${el.y - capH / 6}, ${el.x + el.w} ${el.y - capH / 6}, ${el.x + el.w} ${el.y + capH / 2}`,
          `L ${el.x + el.w} ${el.y + el.h - capH / 2}`,
          `C ${el.x + el.w} ${el.y + el.h + capH / 6}, ${el.x} ${el.y + el.h + capH / 6}, ${el.x} ${el.y + el.h - capH / 2}`,
          'Z',
        ].join(' ')}
        fill={fillValue(el)}
        {...stroke}
      />
      <ellipse
        cx={el.x + el.w / 2}
        cy={el.y + capH / 2}
        rx={el.w / 2}
        ry={capH / 2}
        fill="none"
        {...stroke}
      />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

export const DocumentEl = memo(function DocumentEl({ el }: { el: WBDocument }) {
  const wave = Math.min(22, Math.max(10, el.h * 0.16));
  const d = [
    `M ${el.x} ${el.y}`,
    `H ${el.x + el.w}`,
    `V ${el.y + el.h - wave}`,
    `C ${el.x + el.w * 0.75} ${el.y + el.h - wave * 0.25}, ${el.x + el.w * 0.55} ${el.y + el.h - wave * 1.75}, ${el.x + el.w * 0.28} ${el.y + el.h - wave * 0.75}`,
    `C ${el.x + el.w * 0.16} ${el.y + el.h - wave * 0.3}, ${el.x + el.w * 0.08} ${el.y + el.h - wave * 0.15}, ${el.x} ${el.y + el.h - wave * 0.45}`,
    'Z',
  ].join(' ');
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path d={d} fill={fillValue(el)} {...strokeAttrs(el)} />
      {el.text && <ShapeText el={el} />}
    </g>
  );
});

// ──────────────────────────────────────────
export const TableEl = memo(function TableEl({ el }: { el: WBTable }) {
  const rows = Math.max(1, el.rows);
  const cols = Math.max(1, el.cols);
  const cellW = el.w / cols;
  const cellH = el.h / rows;
  const border = WB_COLOR_HSL[el.borderColor] ?? WB_COLOR_HSL.slate;
  const headerFill = WB_COLOR_HSL[el.headerFill]?.replace('hsl(', 'hsla(').replace(')', ' / 0.16)') ?? 'hsl(var(--accent) / 0.35)';
  const textColor = WB_COLOR_HSL[el.textColor] ?? 'hsl(var(--foreground))';
  const align = el.textAlign ?? 'left';
  const padding = Math.max(4, Math.min(18, el.cellPadding ?? 10));

  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={8} fill="hsl(var(--card) / 0.72)" stroke={border} strokeWidth={1.4} />
      {el.headerRow && <rect x={el.x} y={el.y} width={el.w} height={cellH} rx={8} fill={headerFill} />}
      {el.stripedRows && Array.from({ length: rows }, (_, r) => (
        r > 0 && r % 2 === 1 ? (
          <rect
            key={`stripe-${r}`}
            x={el.x}
            y={el.y + r * cellH}
            width={el.w}
            height={cellH}
            fill="hsl(var(--foreground) / 0.035)"
          />
        ) : null
      ))}
      {Array.from({ length: rows * cols }, (_, index) => {
        const r = Math.floor(index / cols);
        const c = index % cols;
        const style = el.cellStyles?.[index];
        const cellFill = style?.fillColor && style.fillColor !== 'none'
          ? WB_COLOR_HSL[style.fillColor]?.replace('hsl(', 'hsla(').replace(')', ' / 0.18)')
          : undefined;
        const cellTextColor = style?.textColor ? WB_COLOR_HSL[style.textColor] : textColor;
        const cellAlign = style?.textAlign ?? align;
        const isHeader = r === 0 && el.headerRow;
        return (
          <g key={`cell-${index}`}>
            {cellFill && (
              <rect
                x={el.x + c * cellW}
                y={el.y + r * cellH}
                width={cellW}
                height={cellH}
                fill={cellFill}
              />
            )}
            <foreignObject x={el.x + c * cellW + padding} y={el.y + r * cellH + padding * 0.7} width={Math.max(1, cellW - padding * 2)} height={Math.max(1, cellH - padding * 1.4)}>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: cellAlign === 'center' || isHeader ? 'center' : cellAlign === 'right' ? 'flex-end' : 'flex-start', color: cellTextColor, fontSize: el.fontSize, fontWeight: style?.bold || isHeader ? 700 : 500, fontStyle: style?.italic ? 'italic' : 'normal', lineHeight: 1.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden', pointerEvents: 'none', textAlign: cellAlign }}>
              {el.cells[index] ?? ''}
            </div>
            </foreignObject>
          </g>
        );
      })}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`v-top-${i}`} x1={el.x + cellW * (i + 1)} y1={el.y} x2={el.x + cellW * (i + 1)} y2={el.y + el.h} stroke={border} strokeWidth={1} opacity={0.55} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`h-top-${i}`} x1={el.x} y1={el.y + cellH * (i + 1)} x2={el.x + el.w} y2={el.y + cellH * (i + 1)} stroke={border} strokeWidth={1} opacity={0.55} />
      ))}
    </g>
  );
});

export const LineEl = memo(function LineEl({ el }: { el: WBLine }) {
  if (el.points.length < 2) return null;
  if (el.roughness > 1) {
    const stroke = WB_COLOR_HSL[el.strokeColor];
    const drawable = roughCached({
      el,
      cacheKey: `line|${el.points.map((p) => p.join(',')).join(';')}|${el.strokeColor}|${el.strokeWidth}|${el.roughness}`,
      build: () => roughGenerator.linearPath(el.points, {
        ...roughOptions(el.roughness),
        stroke,
        strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
      }),
    });
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(drawable)} />
      </g>
    );
  }
  const d = pointsToPath(el.points);
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path d={d} fill="none" {...strokeAttrs(el)} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
});

export const ArrowEl = memo(function ArrowEl({ el }: { el: WBArrow }) {
  if (el.points.length < 2) return null;
  const pathD = arrowPath(el);
  const head = arrowHeadSegment(el);
  const last = el.points[el.points.length - 1];
  const prev = head.prev;
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const headSize = 12;
  const stroke = WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL] ?? el.strokeColor;
  // 화살촉
  const ax = last[0] - Math.cos(angle - Math.PI / 6) * headSize;
  const ay = last[1] - Math.sin(angle - Math.PI / 6) * headSize;
  const bx = last[0] - Math.cos(angle + Math.PI / 6) * headSize;
  const by = last[1] - Math.sin(angle + Math.PI / 6) * headSize;

  if (el.roughness > 1 && el.curve !== 'curved') {
    const roughPoints = el.curve === 'elbow' ? elbowPoints(el.points) : el.points;
    const drawable = roughCached({
      el,
      cacheKey: `arrow|${el.curve}|${roughPoints.map((p) => p.join(',')).join(';')}|${el.strokeColor}|${el.strokeWidth}|${el.roughness}`,
      build: () => roughGenerator.linearPath(roughPoints, {
        ...roughOptions(el.roughness),
        stroke,
        strokeWidth: WB_STROKE_WIDTH[el.strokeWidth],
      }),
    });
    return (
      <g transform={transform(el)} opacity={el.opacity}>
        <RoughPaths paths={drawableSVGPaths(drawable)} />
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
        {el.label && <ArrowLabel el={el} />}
      </g>
    );
  }
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path d={pathD} fill="none" {...strokeAttrs(el)} strokeLinecap="round" strokeLinejoin="round" />
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
      {el.label && <ArrowLabel el={el} />}
    </g>
  );
});

function ArrowLabel({ el }: { el: WBArrow }) {
  const start = el.points[0];
  const end = el.points[el.points.length - 1];
  const x = (start[0] + end[0]) / 2 - 48;
  const y = (start[1] + end[1]) / 2 - 13;
  const color = WB_COLOR_HSL[el.strokeColor as keyof typeof WB_COLOR_HSL] ?? 'currentColor';
  return (
    <foreignObject x={x} y={y} width={96} height={26}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 24,
          maxWidth: 96,
          height: 24,
          padding: '2px 7px',
          borderRadius: 4,
          background: 'hsl(var(--card) / 0.86)',
          color,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
        }}
      >
        {el.label}
      </div>
    </foreignObject>
  );
}

// ──────────────────────────────────────────
export const FreedrawEl = memo(function FreedrawEl({ el }: { el: WBFreedraw }) {
  if (el.points.length === 0) return null;
  const d = smoothPointsToPath(el.points);
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      <path
        d={d}
        fill="none"
        {...strokeAttrs(el)}
        strokeWidth={el.strokeSize ?? WB_STROKE_WIDTH[el.strokeWidth]}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
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
            overflowWrap: 'anywhere',
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
  const textColor = el.textColor ? WB_COLOR_HSL[el.textColor] : tone.text;
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
            color: textColor,
            fontSize: el.fontSize,
            fontFamily: 'inherit',
            textAlign: el.textAlign,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
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
function ShapeText({ el }: { el: WBRect | WBEllipse | WBDiamond | WBTriangle | WBSpeech | WBCapsule | WBDatabase | WBDocument }) {
  if (!el.text) return null;
  const color = WB_COLOR_HSL[el.textColor ?? el.strokeColor] ?? 'currentColor';
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
          overflowWrap: 'anywhere',
          overflow: 'hidden',
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
    case 'capsule':  return <CapsuleEl  el={el} />;
    case 'database': return <DatabaseEl el={el} />;
    case 'document': return <DocumentEl el={el} />;
    case 'table':    return <TableEl    el={el} />;
    case 'line':     return <LineEl     el={el} />;
    case 'arrow':    return <ArrowEl    el={el} />;
    case 'freedraw': return <FreedrawEl el={el} />;
    case 'text':     return <TextEl     el={el} />;
    case 'sticky':   return <StickyEl   el={el} />;
    case 'image':    return <ImageEl    el={el} />;
    case 'frame':    return <FrameEl    el={el} />;
    case 'bracket':  return null;     // Phase 2 후순위
    default:         return null;
  }
});

// ──────────────────────────────────────────
export const FrameEl = memo(function FrameEl({ el }: { el: WBFrame }) {
  const bg = el.bgColor === 'transparent' ? 'hsl(var(--foreground) / 0.025)' : (WB_COLOR_HSL[el.bgColor]?.replace('hsl(', 'hsla(').replace(')', ' / 0.06)') ?? 'transparent');
  const headerH = Math.min(30, Math.max(22, el.h * 0.12));
  return (
    <g transform={transform(el)} opacity={el.opacity}>
      {/* 본체 — 프레임이 컨테이너처럼 보이도록 헤더와 외곽을 분리 */}
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        fill={bg}
        stroke="hsl(var(--foreground) / 0.38)"
        strokeWidth={1.75}
        strokeDasharray="8 5"
        rx={6}
      />
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={headerH}
        fill="hsl(var(--card) / 0.82)"
        stroke="hsl(var(--foreground) / 0.18)"
        strokeWidth={1}
        rx={6}
      />
      <line
        x1={el.x}
        y1={el.y + headerH}
        x2={el.x + el.w}
        y2={el.y + headerH}
        stroke="hsl(var(--foreground) / 0.16)"
        strokeWidth={1}
      />
      {/* 이름 라벨 — 프레임 내부 헤더 */}
      <foreignObject x={el.x + 8} y={el.y + 3} width={Math.max(1, el.w - 16)} height={headerH - 4}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            color: 'hsl(var(--foreground) / 0.78)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          <span>{el.name || '프레임'}</span>
        </div>
      </foreignObject>
    </g>
  );
});

// ──────────────────────────────────────────
function pointsToPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

function smoothPointsToPath(points: Array<[number, number, number?]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

function elbowPoints(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  const midX = start[0] + (end[0] - start[0]) / 2;
  return [start, [midX, start[1]], [midX, end[1]], end];
}

function curvedControls(start: [number, number], end: [number, number]): { c1: [number, number]; c2: [number, number] } {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      c1: [start[0] + dx * 0.5, start[1]],
      c2: [end[0] - dx * 0.5, end[1]],
    };
  }
  return {
    c1: [start[0], start[1] + dy * 0.5],
    c2: [end[0], end[1] - dy * 0.5],
  };
}

function arrowPath(el: WBArrow): string {
  if (el.points.length < 2) return '';
  if (el.curve === 'elbow') return pointsToPath(elbowPoints(el.points));
  if (el.curve === 'curved') {
    const start = el.points[0];
    const end = el.points[el.points.length - 1];
    const { c1, c2 } = curvedControls(start, end);
    return `M ${start[0]} ${start[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${end[0]} ${end[1]}`;
  }
  return pointsToPath(el.points);
}

function arrowHeadSegment(el: WBArrow): { prev: [number, number] } {
  if (el.points.length < 2) return { prev: [0, 0] };
  if (el.curve === 'elbow') {
    const pts = elbowPoints(el.points);
    return { prev: pts[pts.length - 2] };
  }
  if (el.curve === 'curved') {
    const start = el.points[0];
    const end = el.points[el.points.length - 1];
    return { prev: curvedControls(start, end).c2 };
  }
  return { prev: el.points[el.points.length - 2] };
}

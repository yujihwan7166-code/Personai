/**
 * 슬라이드 에디터 공용 type 들. CloudSlideEditor 와 sub-component (ShapeRender,
 * TextElView, ShapeElView, ImageElView, PresentationOverlay) 들이 다 import.
 *
 * 좌표: xPct/yPct/wPct/hPct 는 0~100 (캔버스 폭·높이 대비 %). 절대 px X.
 */

import { newId } from '@/lib/idGenerator';

export interface BaseEl {
  id: string;
  xPct: number;  // 0~100, 캔버스 폭 대비
  yPct: number;
  wPct: number;
  hPct: number;
  rotation?: number;  // degrees, 0~359 (시계방향). 0 또는 미정의 = 회전 없음
  groupId?: string;   // 같은 groupId 끼리 묶여서 같이 선택·드래그됨
}

export interface SlideTextEl extends BaseEl {
  type: 'text';
  locked?: boolean;
  content: string;
  /** Optional safe external/internal hyperlink associated with this text box. */
  hyperlink?: string;
  fontSizeRem: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  fontFamily?: string;
  /** 박스 배경색 (콜아웃 박스용). 미지정 = 투명. */
  bgColor?: string;
  /** 텍스트 정렬. 미지정 = 'left'. */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** 줄간격 (배수). 미지정 = 1.25. */
  lineHeight?: number;
  /** PPT/Google Slides list semantics. Applies to every line in this text box. */
  listStyle?: 'bullet' | 'number';
  listStart?: number;
}

export type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';

export interface SlideShapeEl extends BaseEl {
  type: ShapeType;
  locked?: boolean;
  fillColor: string;     // CSS color (line/arrow 는 stroke 만 사용)
  strokeColor?: string;  // 테두리 색
  strokeWidth?: number;  // px (캔버스 픽셀 기준)
  /** rect 의 모서리 반경 (px). 미지정 = 0 (직각). 다른 타입은 무시. */
  borderRadius?: number;
  /** 그림자 표시 — rect/ellipse 에만 의미. */
  shadow?: boolean;
  /** Optional safe external/internal hyperlink associated with this shape. */
  hyperlink?: string;
}

export const SHAPE_SHADOW = '0 4px 12px rgba(0,0,0,0.18)';

export interface SlideImageCrop {
  leftPct?: number;
  topPct?: number;
  rightPct?: number;
  bottomPct?: number;
}

export interface SlideImageEl extends BaseEl {
  type: 'image';
  locked?: boolean;
  src: string;   // data URL (base64) — 추후 IndexedDB blob ref 마이그레이션
  alt?: string;
  /** Optional safe external/internal hyperlink associated with this image. */
  hyperlink?: string;
  /** PowerPoint source rectangle crop, expressed as percentages of the original image. */
  crop?: SlideImageCrop;
}

export interface SlideChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface SlideChartEl extends BaseEl {
  type: 'chart';
  locked?: boolean;
  chartType: 'bar' | 'line' | 'pie';
  title?: string;
  categories: string[];
  series: SlideChartSeries[];
}

export interface SlideTableCell {
  text: string;
  /** Optional safe external/internal hyperlink associated with this table cell. */
  hyperlink?: string;
  bgColor?: string;
  textColor?: string;
  fontSizeRem?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: SlideTextEl['align'];
  colspan?: number;
  rowspan?: number;
}

export interface SlideTableEl extends BaseEl {
  type: 'table';
  locked?: boolean;
  rows: SlideTableCell[][];
  colWidthsPct?: number[];
  rowHeightsPct?: number[];
  borderColor?: string;
  headerRow?: boolean;
}

export type SlideElement = SlideTextEl | SlideShapeEl | SlideImageEl | SlideChartEl | SlideTableEl;

export type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type SlideTransitionType = 'fade' | 'push' | 'wipe' | 'split' | 'cover' | 'uncover' | 'zoom';

export type SlideTransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface SlideTransition {
  type: SlideTransitionType;
  direction?: SlideTransitionDirection;
  durationMs?: number;
  advanceOnClick?: boolean;
  advanceAfterMs?: number;
}

// ─────────────────────────────────────────────
// type guards
// ─────────────────────────────────────────────

export function isText(el: SlideElement): el is SlideTextEl {
  return el.type === 'text';
}
export function isShape(el: SlideElement): el is SlideShapeEl {
  return el.type === 'rect' || el.type === 'ellipse'
    || el.type === 'triangle' || el.type === 'line' || el.type === 'arrow';
}
export function isLineLike(el: SlideElement): boolean {
  return el.type === 'line' || el.type === 'arrow';
}
export function isImage(el: SlideElement): el is SlideImageEl {
  return el.type === 'image';
}
export function isChart(el: SlideElement): el is SlideChartEl {
  return el.type === 'chart';
}
export function isTable(el: SlideElement): el is SlideTableEl {
  return el.type === 'table';
}

// ─────────────────────────────────────────────
// Slide + meta
// ─────────────────────────────────────────────

export interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
  /** Full-slide background image imported from PPTX/Google Slides exports. */
  backgroundImage?: string;
  /** Hidden in presentation mode and exported as a hidden PowerPoint slide. */
  hidden?: boolean;
  notes?: string;
  transition?: SlideTransition;
}

export interface SlideSize {
  width: number;
  height: number;
}

export const DEFAULT_SLIDE_SIZE: SlideSize = { width: 1280, height: 720 };

export function normalizeSlideSize(value: unknown): SlideSize {
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    const width = Number(rec.width);
    const height = Number(rec.height);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  return DEFAULT_SLIDE_SIZE;
}

export function slideAspectRatio(size: SlideSize | undefined): string {
  const safe = normalizeSlideSize(size);
  return `${safe.width} / ${safe.height}`;
}

export interface SlideMeta {
  slides: Slide[];
  currentIdx?: number;
  /** Original or selected slide canvas size in CSS pixels. Default is 16:9 1280x720. */
  slideSize?: SlideSize;
  /** 적용된 테마 id (lib/cloudSlide/themes.ts SLIDE_THEMES 의 한 id). 미지정 = 'default'. */
  themeId?: string;
}

export function emptySlide(): Slide {
  return { id: newId('s'), elements: [] };
}

export function defaultMeta(): SlideMeta {
  return { slides: [emptySlide()], currentIdx: 0, themeId: 'default' };
}

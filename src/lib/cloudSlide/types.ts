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
  content: string;
  fontSizeRem: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  /** 박스 배경색 (콜아웃 박스용). 미지정 = 투명. */
  bgColor?: string;
  /** 텍스트 정렬. 미지정 = 'left'. */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** 줄간격 (배수). 미지정 = 1.25. */
  lineHeight?: number;
}

export type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';

export interface SlideShapeEl extends BaseEl {
  type: ShapeType;
  fillColor: string;     // CSS color (line/arrow 는 stroke 만 사용)
  strokeColor?: string;  // 테두리 색
  strokeWidth?: number;  // px (캔버스 픽셀 기준)
  /** rect 의 모서리 반경 (px). 미지정 = 0 (직각). 다른 타입은 무시. */
  borderRadius?: number;
  /** 그림자 표시 — rect/ellipse 에만 의미. */
  shadow?: boolean;
}

export const SHAPE_SHADOW = '0 4px 12px rgba(0,0,0,0.18)';

export interface SlideImageEl extends BaseEl {
  type: 'image';
  src: string;   // data URL (base64) — 추후 IndexedDB blob ref 마이그레이션
  alt?: string;
}

export type SlideElement = SlideTextEl | SlideShapeEl | SlideImageEl;

export type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

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

// ─────────────────────────────────────────────
// Slide + meta
// ─────────────────────────────────────────────

export interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
  notes?: string;
}

export interface SlideMeta {
  slides: Slide[];
  currentIdx?: number;
}

export function emptySlide(): Slide {
  return { id: newId('s'), elements: [] };
}

export function defaultMeta(): SlideMeta {
  return { slides: [emptySlide()], currentIdx: 0 };
}

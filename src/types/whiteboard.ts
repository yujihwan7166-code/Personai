/**
 * 화이트보드 — 요소·보드·툴 타입 정의.
 *
 * 스펙: docs/superpowers/specs/2026-05-13-whiteboard-design.md §2
 */

// ──────────────────────────────────────────
// 색 팔레트 (10색, 도형용)
export type WBColor =
  | 'ink' | 'slate' | 'red' | 'orange' | 'amber'
  | 'green' | 'teal' | 'blue' | 'violet' | 'pink';

export const WB_COLORS: WBColor[] = [
  'ink', 'slate', 'red', 'orange', 'amber',
  'green', 'teal', 'blue', 'violet', 'pink',
];

// 스티키 6색 (파스텔 톤, 도형 팔레트와 별도)
export type WBStickyColor = 'amber' | 'pink' | 'mint' | 'sky' | 'lavender' | 'slate';

export const WB_STICKY_COLORS: WBStickyColor[] = [
  'amber', 'pink', 'mint', 'sky', 'lavender', 'slate',
];

// ──────────────────────────────────────────
// 스타일 공통
export interface WBStyleStroke {
  strokeColor: WBColor;
  strokeWidth: 'thin' | 'normal' | 'thick';   // 1.5 / 2.5 / 4
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: 0 | 1 | 2;                        // 0=깔끔, 1=손그림, 2=거침
}

export interface WBStyleFill {
  fillColor: WBColor | 'none';
  fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'none';
}

// ──────────────────────────────────────────
// 요소 베이스
export interface WBElementBase {
  id: string;
  type: WBElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;          // 0~2π, 중심점 기준
  zIndex: number;
  opacity: number;        // 0~1
  locked: boolean;
  groupIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type WBElementType =
  | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'speech'
  | 'capsule' | 'database' | 'document'
  | 'table'
  | 'line' | 'arrow'
  | 'freedraw'
  | 'text'
  | 'sticky'
  | 'image'     // Phase 2
  | 'frame'     // Phase 2
  | 'bracket';  // Phase 2

// ──────────────────────────────────────────
// 도형 요소 (text 임베드 가능)
export interface WBRect extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'rect';
  cornerRadius: number;
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBEllipse extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'ellipse';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBDiamond extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'diamond';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBTriangle extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'triangle';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBSpeech extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'speech';
  tailDirection: 'bl' | 'br' | 'tl' | 'tr';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBCapsule extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'capsule';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBDatabase extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'database';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBDocument extends WBElementBase, WBStyleStroke, WBStyleFill {
  type: 'document';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: WBShapeTextSize;
  textColor?: WBColor;
}

export interface WBTable extends WBElementBase {
  type: 'table';
  rows: number;
  cols: number;
  cells: string[];
  cellStyles?: WBTableCellStyle[];
  headerRow: boolean;
  borderColor: WBColor;
  headerFill: WBColor;
  textColor: WBColor;
  fontSize: WBShapeTextSize;
  textAlign?: 'left' | 'center' | 'right';
  cellPadding?: number;
  stripedRows?: boolean;
}

export interface WBTableCellStyle {
  fillColor?: WBColor | 'none';
  textColor?: WBColor;
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
}

// ──────────────────────────────────────────
// 선·화살표
export interface WBLine extends WBElementBase, WBStyleStroke {
  type: 'line';
  points: Array<[number, number]>;
}

export type WBArrowHead = 'none' | 'arrow' | 'dot' | 'tri';
export type WBArrowCurve = 'straight' | 'curved' | 'elbow';

export interface WBArrow extends WBElementBase, WBStyleStroke {
  type: 'arrow';
  points: Array<[number, number]>;
  startArrow: WBArrowHead;
  endArrow: WBArrowHead;
  curve: WBArrowCurve;
  // Phase 2:
  startBinding?: { elementId: string; anchor: WBAnchor };
  endBinding?: { elementId: string; anchor: WBAnchor };
  label?: string;
}

export type WBAnchor =
  | 'top' | 'right' | 'bottom' | 'left' | 'center'
  | { ratio: [number, number] };

// ──────────────────────────────────────────
// 자유 펜
export interface WBFreedraw extends WBElementBase, WBStyleStroke {
  type: 'freedraw';
  strokeSize?: number;
  points: Array<[number, number, number?]>;   // [x, y, pressure?]
}

// ──────────────────────────────────────────
// 텍스트
export type WBFontFamily = 'sans' | 'serif' | 'mono';
export type WBTextSize = 10 | 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32 | 40 | 48 | 56;
export type WBShapeTextSize = 10 | 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32;
export type WBStickyTextSize = 12 | 14 | 16 | 18 | 20 | 24 | 28;

export interface WBText extends WBElementBase {
  type: 'text';
  content: string;
  fontSize: WBTextSize;
  fontFamily: WBFontFamily;
  textColor: WBColor;
  textAlign: 'left' | 'center' | 'right';
}

// ──────────────────────────────────────────
// 스티키 ★
export interface WBSticky extends WBElementBase {
  type: 'sticky';
  content: string;
  color: WBStickyColor;
  fontSize: WBStickyTextSize;
  textColor?: WBColor;
  textAlign: 'left' | 'center';
  tags?: string[];
  // 사이트 통합 — Phase 3 자리잡이
  linkedMemoId?: string;
  linkedWikiPageId?: string;
  linkedTaskId?: string;
}

// ──────────────────────────────────────────
// Phase 2 요소 — 미리 타입만 박음
export interface WBImage extends WBElementBase {
  type: 'image';
  imageId: string;        // IDB 키
  naturalW: number;
  naturalH: number;
  cornerRadius: number;
}

export interface WBFrame extends WBElementBase {
  type: 'frame';
  name: string;
  bgColor: WBColor | 'transparent';
  childIds: string[];
  clipChildren: boolean;
}

export interface WBBracket extends WBElementBase, WBStyleStroke {
  type: 'bracket';
  orientation: 'horizontal' | 'vertical';
}

// ──────────────────────────────────────────
// 요소 union
export type WBElement =
  | WBRect | WBEllipse | WBDiamond | WBTriangle | WBSpeech
  | WBCapsule | WBDatabase | WBDocument | WBTable
  | WBLine | WBArrow
  | WBFreedraw | WBText | WBSticky
  | WBImage | WBFrame | WBBracket;

// ──────────────────────────────────────────
// 보드
export interface WBBoard {
  id: string;
  name: string;
  folderId: string | null;
  thumbnail?: string;       // SVG → dataURL 200×120
  starred?: boolean;
  archivedAt?: number;
  trashedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface WBBoardData {
  schemaVersion: 1;
  elements: WBElement[];
  viewport: { x: number; y: number; zoom: number };
}

// ──────────────────────────────────────────
// 폴더 (메모 폴더 패턴)
export interface WBFolder {
  id: string;
  name: string;
  color?: string;
  parentId: string | null;
  order: number;
}

// ──────────────────────────────────────────
// 도구 상태
export type WBToolKind =
  | 'select' | 'pan' | 'text' | 'sticky'
  | 'shape' | 'line' | 'pen' | 'eraser'
  | 'frame';

export type WBShapeKind =
  | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'speech'
  | 'capsule' | 'database' | 'document';
export type WBLineKind = 'line' | 'arrow-solid' | 'arrow-dashed' | 'arrow-curved' | 'arrow-elbow';

export interface WBToolState {
  kind: WBToolKind;
  stickyColor: WBStickyColor;
  shapeKind: WBShapeKind;
  lineKind: WBLineKind;
  penWidth: 'thin' | 'normal' | 'thick';
  penSize: number;
  penColor: WBColor;
  strokeColor: WBColor;
  fillColor: WBColor | 'none';
  roughness: 0 | 1 | 2;
}

// ──────────────────────────────────────────
// 뷰포트
export interface WBViewport {
  x: number;
  y: number;
  zoom: number;
}

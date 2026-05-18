/** 셀 서식 (정렬/색/폰트/숫자포맷/테두리) 통합 타입. */

import type { BorderStyle } from './borderStyle';
import type { FontFamily } from './fontFamily';
import type { NumberFmt } from './numberFormat';

export type VAlign = 'top' | 'middle' | 'bottom';
export type Wrap = 'overflow' | 'wrap' | 'clip';
export type HAlign = 'left' | 'center' | 'right';

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: HAlign;
  vAlign?: VAlign;
  wrap?: Wrap;
  fontFamily?: FontFamily;
  /** 폰트 크기 (px). 8~48. */
  fontSize?: number;
  numberFmt?: NumberFmt;
  border?: BorderStyle;
}

export type CellFormats = Record<string, CellFormat>;

/** Ctrl+\ (서식 지우기) 등에서 사용 — 모든 서식 키를 undefined 로 패치. */
export const CLEARED_FORMAT: Partial<CellFormat> = {
  bold: undefined, italic: undefined, underline: undefined, strikethrough: undefined,
  textColor: undefined, bgColor: undefined, align: undefined, vAlign: undefined,
  wrap: undefined, fontFamily: undefined, fontSize: undefined,
  numberFmt: undefined, border: undefined,
};
